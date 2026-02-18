const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function generateUniqueRoomCode(existsFn, maxAttempts = 1000) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const code = generateRoomCode();
    if (!existsFn(code)) return code;
  }
  throw new Error('Could not generate a unique room code');
}

module.exports = {
  generateRoomCode,
  generateUniqueRoomCode,
};
