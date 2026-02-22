const express = require("express");
const rateLimit = require("express-rate-limit");
const Room = require("../models/Room");
const Participant = require("../models/Participant");
const Submission = require("../models/Submission");
const {
  getRoom,
  saveRoom,
  upsertParticipant,
  upsertSubmission,
  getSubmission,
  listSubmissions,
  listParticipants,
} = require("../db");
const { generateUniqueRoomCode } = require("../services/code.service");
const { calculateTotals, CATEGORIES } = require("../services/results.service");

const router = express.Router();
const DEFAULT_BIDRAG_COUNT = 6;
const MIN_BIDRAG_COUNT = 6;
const MAX_BIDRAG_COUNT = 12;
const ENTRY_NAME_MAX_LENGTH = 40;

const createRoomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 room creations / minute / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many rooms created. Try again in a minute." },
});

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function normalizeRoomCode(rawCode) {
  return String(rawCode || "")
    .trim()
    .toUpperCase();
}

function buildDefaultEntries(bidragCount = DEFAULT_BIDRAG_COUNT) {
  return Array.from({ length: bidragCount }, (_unused, index) => {
    return `Bidrag ${index + 1}`;
  });
}

function normalizeBidragCount(rawCount, fallback = DEFAULT_BIDRAG_COUNT) {
  const count = Number(rawCount);
  if (
    Number.isInteger(count) &&
    count >= MIN_BIDRAG_COUNT &&
    count <= MAX_BIDRAG_COUNT
  ) {
    return count;
  }

  return fallback;
}

function resolveRoomBidragCount(room) {
  const inferredFromEntries = Array.isArray(room?.entries)
    ? room.entries.length
    : undefined;

  if (
    Number.isInteger(inferredFromEntries) &&
    inferredFromEntries >= MIN_BIDRAG_COUNT &&
    inferredFromEntries <= MAX_BIDRAG_COUNT
  ) {
    return normalizeBidragCount(room?.bidragCount, inferredFromEntries);
  }

  return normalizeBidragCount(room?.bidragCount, DEFAULT_BIDRAG_COUNT);
}

function normalizeStoredEntries(entries, bidragCount) {
  const defaults = buildDefaultEntries(bidragCount);

  if (!Array.isArray(entries)) {
    return defaults;
  }

  return defaults.map((defaultName, index) => {
    const entry = entries[index];
    if (typeof entry !== "string") return defaults[index];
    const trimmed = entry.trim();
    return trimmed || defaults[index];
  });
}

function validateAndSanitizeEntries(entries, rawBidragCount) {
  if (
    rawBidragCount !== undefined &&
    !(
      Number.isInteger(rawBidragCount) &&
      rawBidragCount >= MIN_BIDRAG_COUNT &&
      rawBidragCount <= MAX_BIDRAG_COUNT
    )
  ) {
    return {
      error: `bidragCount must be an integer ${MIN_BIDRAG_COUNT}-${MAX_BIDRAG_COUNT}`,
    };
  }

  const fallbackFromEntries = Array.isArray(entries)
    ? entries.length
    : undefined;
  const bidragCount = normalizeBidragCount(rawBidragCount, fallbackFromEntries);

  if (bidragCount < MIN_BIDRAG_COUNT || bidragCount > MAX_BIDRAG_COUNT) {
    return {
      error: `bidragCount must be an integer ${MIN_BIDRAG_COUNT}-${MAX_BIDRAG_COUNT}`,
    };
  }

  const defaults = buildDefaultEntries(bidragCount);
  if (entries === undefined) return { bidragCount, entries: defaults };

  if (!Array.isArray(entries)) {
    return { error: "entries must be an array of strings" };
  }
  if (entries.length !== bidragCount) {
    return { error: `entries must have exactly ${bidragCount} items` };
  }

  for (const entry of entries) {
    if (typeof entry !== "string") {
      return { error: "each entry must be a string" };
    }
    if (entry.length > ENTRY_NAME_MAX_LENGTH) {
      return { error: `entry names must be <= ${ENTRY_NAME_MAX_LENGTH} chars` };
    }
  }

  const sanitized = entries.map((entry, index) => {
    const trimmed = entry.trim();
    return trimmed || defaults[index];
  });
  return { bidragCount, entries: sanitized };
}

function validateVotes(votes, bidragCount) {
  if (!votes || typeof votes !== "object" || Array.isArray(votes)) {
    return "votes must be an object";
  }

  const bidragIds = Object.keys(votes);
  if (!bidragIds.length) return "votes must include at least one bidrag";

  for (const bidragId of bidragIds) {
    if (!/^bidrag-\d+$/.test(bidragId)) {
      return `invalid bidrag key: ${bidragId}`;
    }
    const bidragNum = Number(bidragId.split("-")[1]);
    if (bidragNum < 1 || bidragNum > bidragCount) {
      return `bidrag key out of range: ${bidragId}`;
    }

    const bidragVotes = votes[bidragId];
    if (
      !bidragVotes ||
      typeof bidragVotes !== "object" ||
      Array.isArray(bidragVotes)
    ) {
      return `votes for ${bidragId} must be an object`;
    }

    for (const category of CATEGORIES) {
      const value = bidragVotes[category];
      if (!Number.isInteger(value) || value < 1 || value > 10) {
        return `${bidragId}.${category} must be an integer 1-10`;
      }
    }
  }

  return null;
}

router.post("/", createRoomLimiter, async (req, res, next) => {
  const MAX_ATTEMPTS = 10;
  const { bidragCount, entries, error } = validateAndSanitizeEntries(
    req.body?.entries,
    req.body?.bidragCount,
  );
  if (error) return badRequest(res, error);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateUniqueRoomCode();
    const room = new Room({ code, bidragCount, entries });

    try {
      await saveRoom(room);
      return res.status(201).json({ code, bidragCount, entries });
    } catch (error) {
      if (error?.code === 11000) continue;
      return next(error);
    }
  }

  return res
    .status(503)
    .json({ error: "failed to allocate room code, please retry" });
});

router.get("/:code", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = await getRoom(roomCode);
  if (!room) return res.status(404).json({ error: "room not found" });
  const bidragCount = resolveRoomBidragCount(room);

  return res.json({
    code: room.code,
    bidragCount,
    entries: normalizeStoredEntries(room.entries, bidragCount),
  });
});

router.post("/:code/join", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = await getRoom(roomCode);
  if (!room) return res.status(404).json({ error: "room not found" });

  const participantId = String(req.body?.participantId || "").trim();
  const displayName = String(req.body?.displayName || "").trim();

  if (!participantId) return badRequest(res, "participantId is required");
  if (!displayName) return badRequest(res, "displayName is required");

  const participant = new Participant({ roomCode, participantId, displayName });
  await upsertParticipant(roomCode, participant);

  return res.json({ ok: true });
});

router.put("/:code/votes", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = await getRoom(roomCode);
  if (!room) return res.status(404).json({ error: "room not found" });
  const bidragCount = resolveRoomBidragCount(room);

  const participantId = String(req.body?.participantId || "").trim();
  const displayName = String(req.body?.displayName || "").trim();
  const { votes } = req.body || {};

  if (!participantId) return badRequest(res, "participantId is required");
  if (!displayName) return badRequest(res, "displayName is required");

  const voteError = validateVotes(votes, bidragCount);
  if (voteError) return badRequest(res, voteError);

  await upsertParticipant(
    roomCode,
    new Participant({ roomCode, participantId, displayName }),
  );

  const submission = new Submission({
    roomCode,
    participantId,
    displayName,
    votes,
  });
  await upsertSubmission(roomCode, submission);

  return res.json({ ok: true });
});

router.get("/:code/votes/:participantId", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = await getRoom(roomCode);
  if (!room) return res.status(404).json({ error: "room not found" });

  const participantId = String(req.params.participantId || "").trim();
  if (!participantId) return badRequest(res, "participantId is required");

  const submission = await getSubmission(roomCode, participantId);
  return res.json({ votes: submission?.votes || {} });
});

router.get("/:code/participants", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = await getRoom(roomCode);
  if (!room) return res.status(404).json({ error: "room not found" });

  const participants = await listParticipants(roomCode);
  return res.json({
    participants: participants.map((participant) => ({
      participantId: participant.participantId,
      displayName: participant.displayName,
      joinedAt: participant.joinedAt || null,
    })),
  });
});

router.get("/:code/totals", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = await getRoom(roomCode);
  if (!room) return res.status(404).json({ error: "room not found" });

  const submissions = await listSubmissions(roomCode);
  return res.json(calculateTotals(submissions));
});

module.exports = router;
