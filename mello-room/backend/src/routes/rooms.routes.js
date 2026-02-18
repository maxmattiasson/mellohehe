const express = require('express');
const Room = require('../models/Room');
const Participant = require('../models/Participant');
const Submission = require('../models/Submission');
const {
  getRoom,
  saveRoom,
  upsertParticipant,
  upsertSubmission,
  getSubmission,
  listSubmissions,
} = require('../db');
const { generateUniqueRoomCode } = require('../services/code.service');
const { calculateTotals, CATEGORIES } = require('../services/results.service');

const router = express.Router();

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function normalizeRoomCode(rawCode) {
  return String(rawCode || '').trim().toUpperCase();
}

function validateVotes(votes) {
  if (!votes || typeof votes !== 'object' || Array.isArray(votes)) {
    return 'votes must be an object';
  }

  const bidragIds = Object.keys(votes);
  if (!bidragIds.length) return 'votes must include at least one bidrag';

  for (const bidragId of bidragIds) {
    if (!/^bidrag-\d+$/.test(bidragId)) {
      return `invalid bidrag key: ${bidragId}`;
    }
    const bidragNum = Number(bidragId.split('-')[1]);
    if (bidragNum < 1 || bidragNum > 5) {
      return `bidrag key out of range: ${bidragId}`;
    }

    const bidragVotes = votes[bidragId];
    if (!bidragVotes || typeof bidragVotes !== 'object' || Array.isArray(bidragVotes)) {
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

router.post('/', (req, res) => {
  const hostUserId = String(req.body?.hostUserId || '').trim();
  if (!hostUserId) return badRequest(res, 'hostUserId is required');

  const code = generateUniqueRoomCode((candidate) => Boolean(getRoom(candidate)));
  const room = new Room({ code, hostUserId });
  saveRoom(room);

  return res.status(201).json({ code });
});

router.post('/:code/join', (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = getRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'room not found' });

  const participantId = String(req.body?.participantId || '').trim();
  const displayName = String(req.body?.displayName || '').trim();

  if (!participantId) return badRequest(res, 'participantId is required');
  if (!displayName) return badRequest(res, 'displayName is required');

  const participant = new Participant({ roomCode, participantId, displayName });
  upsertParticipant(roomCode, participant);

  return res.json({ ok: true });
});

router.put('/:code/votes', (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = getRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'room not found' });

  const participantId = String(req.body?.participantId || '').trim();
  const displayName = String(req.body?.displayName || '').trim();
  const { votes } = req.body || {};

  if (!participantId) return badRequest(res, 'participantId is required');
  if (!displayName) return badRequest(res, 'displayName is required');

  const voteError = validateVotes(votes);
  if (voteError) return badRequest(res, voteError);

  upsertParticipant(roomCode, new Participant({ roomCode, participantId, displayName }));

  const submission = new Submission({ roomCode, participantId, displayName, votes });
  upsertSubmission(roomCode, submission);

  return res.json({ ok: true });
});

router.get('/:code/votes/:participantId', (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = getRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'room not found' });

  const participantId = String(req.params.participantId || '').trim();
  if (!participantId) return badRequest(res, 'participantId is required');

  const submission = getSubmission(roomCode, participantId);
  return res.json({ votes: submission?.votes || {} });
});

router.get('/:code/totals', (req, res) => {
  const roomCode = normalizeRoomCode(req.params.code);
  const room = getRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'room not found' });

  const submissions = listSubmissions(roomCode);
  return res.json(calculateTotals(submissions));
});

module.exports = router;
