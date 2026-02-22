(() => {
  const {
    buildDefaultEntries,
    escapeHtml,
    getPageSession,
    normalizeBidragCount,
    normalizeEntries,
    renderTotals,
  } = window.melloCommon;

  function initResultsPage() {
    const listEl = document.querySelector("#resultsList");
    const metaEl = document.querySelector("#resultsMeta");
    const backLink = document.querySelector("#backToVote");
    const lobbyLink = document.querySelector("#goToLobby");

    const session = getPageSession();
    if (!session) {
      listEl.innerHTML =
        '<article class="card"><p class="status error">Missing room context. Go back to Home.</p></article>';
      return;
    }

    const { roomCode } = session;
    const state = { bidragCount: 6, entries: buildDefaultEntries() };
    metaEl.textContent = `Totala poäng i rum ${roomCode}.`;
    backLink.href = `/vote?code=${encodeURIComponent(roomCode)}`;
    lobbyLink.href = `/lobby?code=${encodeURIComponent(roomCode)}`;

    window.api
      .getRoom(roomCode)
      .then(({ bidragCount, entries }) => {
        state.bidragCount = normalizeBidragCount(bidragCount, 6);
        state.entries = normalizeEntries(entries, state.bidragCount);
      })
      .catch(() => {
        // Keep default labels if room metadata is unavailable.
      });

    async function fetchAndRender() {
      try {
        const payload = await window.api.getTotals(roomCode);
        renderTotals(
          listEl,
          payload.bidragResults || [],
          state.entries,
          state.bidragCount,
        );
      } catch (error) {
        listEl.innerHTML = `<article class="card"><p class="status error">${escapeHtml(error.message)}</p></article>`;
      }
    }

    fetchAndRender();
    setInterval(fetchAndRender, 3000);
  }

  initResultsPage();
})();
