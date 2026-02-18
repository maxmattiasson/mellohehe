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
} = require("../db");
const { generateUniqueRoomCode } = require("../services/code.service");
const { calculateTotals, CATEGORIES } = require("../services/results.service");

const router = express.Router();
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

function validateVotes(votes) {
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
    if (bidragNum < 1 || bidragNum > 5) {
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

router.post("/", createRoomLimiter, async (_req, res, next) => {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateUniqueRoomCode();
    const room = new Room({ code });

    try {
      await saveRoom(room);
      return res.status(201).json({ code });
    } catch (error) {
      if (error?.code === 11000) continue;
      return next(error);
    }
  }

  return res
    .status(503)
    .json({ error: "failed to allocate room code, please retry" });
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

  const participantId = String(req.body?.participantId || "").trim();
  const displayName = String(req.body?.displayName || "").trim();
  const { votes } = req.body || {};

  if (!participantId) return badRequest(res, "participantId is required");
  if (!displayName) return badRequest(res, "displayName is required");

  const voteError = validateVotes(votes);
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

router.get("/:code/totals", async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = await getRoom(roomCode);
  if (!room) return res.status(404).json({ error: "room not found" });

  const submissions = await listSubmissions(roomCode);
  return res.json(calculateTotals(submissions));
});

module.exports = router;
