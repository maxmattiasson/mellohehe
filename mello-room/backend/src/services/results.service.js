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

function toOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function average(values) {
  if (!values.length) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function buildBidragResult(bidragId, submissions) {
  const participantsWithBidrag = submissions.filter(
    (submission) => submission.votes && submission.votes[bidragId],
  );

  const averages = {};
  CATEGORIES.forEach((category) => {
    const values = participantsWithBidrag
      .map((submission) => submission.votes[bidragId]?.[category])
      .filter((value) => Number.isInteger(value));

    averages[category] = toOneDecimal(average(values));
  });

  const totalAvg = toOneDecimal(
    CATEGORIES.reduce((sum, category) => sum + averages[category], 0),
  );

  return {
    bidragId,
    averages,
    totalAvg,
    votesCount: submissions.length,
  };
}

function calculateTotals(submissions) {
  const bidragIds = collectBidragIds(submissions);
  const bidragResults = bidragIds.map((bidragId) =>
    buildBidragResult(bidragId, submissions),
  );

  bidragResults.sort((a, b) => {
    if (b.totalAvg !== a.totalAvg) return b.totalAvg - a.totalAvg;
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
