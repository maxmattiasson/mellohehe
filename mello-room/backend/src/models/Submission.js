class Submission {
  constructor({ id, roomId, participantId, scores = {} }) {
    this.id = id;
    this.roomId = roomId;
    this.participantId = participantId;
    this.scores = scores;
  }
}

module.exports = Submission;
