const CATEGORIES = ['slay', 'utseende', 'lat', 'sangrost'];

function collectBidragIds(submissions) {
  const ids = new Set();

  submissions.forEach((submission) => {
    Object.keys(submission.votes || {}).forEach((bidragId) => ids.add(bidragId));
  });

  return [...ids].sort((a, b) => {
    const aNum = Number(a.split('-')[1]);
    const bNum = Number(b.split('-')[1]);
    return aNum - bNum;
  });
}

function sum(values) {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0);
}

function buildBidragResult(bidragId, submissions) {
  const participantsWithBidrag = submissions.filter(
    (submission) => submission.votes && submission.votes[bidragId],
  );

  const categoryTotals = {};
  CATEGORIES.forEach((category) => {
    const values = participantsWithBidrag
      .map((submission) => submission.votes[bidragId]?.[category])
      .filter((value) => Number.isInteger(value));

    categoryTotals[category] = sum(values);
  });

  const totalPoints = CATEGORIES.reduce(
    (runningTotal, category) => runningTotal + categoryTotals[category],
    0,
  );

  return {
    bidragId,
    categoryTotals,
    totalPoints,
    votesCount: participantsWithBidrag.length,
  };
}

function calculateTotals(submissions) {
  const bidragIds = collectBidragIds(submissions);
  const bidragResults = bidragIds.map((bidragId) =>
    buildBidragResult(bidragId, submissions),
  );

  bidragResults.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    const aNum = Number(a.bidragId.split('-')[1]);
    const bNum = Number(b.bidragId.split('-')[1]);
    return aNum - bNum;
  });

  return { bidragResults };
}

module.exports = {
  CATEGORIES,
  calculateTotals,
};
