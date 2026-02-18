class Submission {
  constructor({
    roomCode,
    participantId,
    displayName,
    votes,
    updatedAt = new Date(),
  }) {
    this.roomCode = roomCode;
    this.participantId = participantId;
    this.displayName = displayName;
    this.votes = votes;
    this.updatedAt = updatedAt;
  }
}

module.exports = Submission;
