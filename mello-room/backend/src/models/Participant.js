class Participant {
  constructor({ roomCode, participantId, displayName, joinedAt = new Date() }) {
    this.roomCode = roomCode;
    this.participantId = participantId;
    this.displayName = displayName;
    this.joinedAt = joinedAt;
  }
}

module.exports = Participant;
