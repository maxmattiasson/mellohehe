function rankEntries(entries) {
  return [...entries].sort((a, b) => b.total - a.total);
}

module.exports = { rankEntries };
