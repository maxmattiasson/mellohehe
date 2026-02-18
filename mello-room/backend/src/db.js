const store = {
  rooms: new Map(),
  participantsByRoom: new Map(),
  submissionsByRoom: new Map(),
};

async function connectDb() {
  return Promise.resolve();
}

function getRoom(code) {
  return store.rooms.get(code) || null;
}

function saveRoom(room) {
  store.rooms.set(room.code, room);
  return room;
}

function getParticipantsMap(roomCode) {
  if (!store.participantsByRoom.has(roomCode)) {
    store.participantsByRoom.set(roomCode, new Map());
  }
  return store.participantsByRoom.get(roomCode);
}

function upsertParticipant(roomCode, participant) {
  const participants = getParticipantsMap(roomCode);
  const existing = participants.get(participant.participantId);
  const next = {
    ...existing,
    ...participant,
    roomCode,
    joinedAt: existing?.joinedAt || new Date(),
  };
  participants.set(participant.participantId, next);
  return next;
}

function getSubmissionsMap(roomCode) {
  if (!store.submissionsByRoom.has(roomCode)) {
    store.submissionsByRoom.set(roomCode, new Map());
  }
  return store.submissionsByRoom.get(roomCode);
}

function upsertSubmission(roomCode, submission) {
  const submissions = getSubmissionsMap(roomCode);
  const next = {
    ...submission,
    roomCode,
    updatedAt: new Date(),
  };
  submissions.set(submission.participantId, next);
  return next;
}

function getSubmission(roomCode, participantId) {
  const submissions = getSubmissionsMap(roomCode);
  return submissions.get(participantId) || null;
}

function listSubmissions(roomCode) {
  const submissions = getSubmissionsMap(roomCode);
  return [...submissions.values()];
}

module.exports = {
  connectDb,
  getRoom,
  saveRoom,
  upsertParticipant,
  upsertSubmission,
  getSubmission,
  listSubmissions,
};
