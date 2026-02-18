(() => {
  const { escapeHtml, getPageSession, renderTotals } = window.melloCommon;

  function initResultsPage() {
    const listEl = document.querySelector("#resultsList");
    const metaEl = document.querySelector("#resultsMeta");
    const backLink = document.querySelector("#backToVote");

    const session = getPageSession();
    if (!session) {
      listEl.innerHTML =
        '<article class="card"><p class="status error">Missing room context. Go back to Home.</p></article>';
      return;
    }

    const { roomCode } = session;
    metaEl.textContent = `Live totals for room ${roomCode}. Refresh every 3s.`;
    backLink.href = `/vote?code=${encodeURIComponent(roomCode)}`;

    async function fetchAndRender() {
      try {
        const payload = await window.api.getTotals(roomCode);
        renderTotals(listEl, payload.bidragResults || []);
      } catch (error) {
        listEl.innerHTML = `<article class="card"><p class="status error">${escapeHtml(error.message)}</p></article>`;
      }
    }

    fetchAndRender();
    setInterval(fetchAndRender, 3000);
  }

  initResultsPage();
})();
