(() => {
  const DEFAULT_BIDRAG_COUNT = 6;
  const MAX_BIDRAG_COUNT = 12;
  const CATEGORIES = [
    { key: "slay", label: "Slay" },
    { key: "utseende", label: "Utseende" },
    { key: "lat", label: "Låt" },
    { key: "sangrost", label: "Sångröst" },
  ];
  const SCORE_MIN = 1;
  const SCORE_MAX = 5;

  const STORAGE_KEYS = {
    guestId: "mello:guestId",
    identity: "mello:identity",
    session: "mello:session",
  };

  function normalizeBidragCount(rawCount, fallback = DEFAULT_BIDRAG_COUNT) {
    const count = Number(rawCount);
    if (Number.isInteger(count) && count >= 1 && count <= MAX_BIDRAG_COUNT) {
      return count;
    }

    return fallback;
  }

  function buildDefaultEntries(bidragCount = DEFAULT_BIDRAG_COUNT) {
    return Array.from({ length: bidragCount }, (_unused, index) => {
      return `Bidrag ${index + 1}`;
    });
  }

  function normalizeEntries(entries, bidragCount = DEFAULT_BIDRAG_COUNT) {
    const count = normalizeBidragCount(bidragCount, DEFAULT_BIDRAG_COUNT);
    const defaults = buildDefaultEntries(count);
    if (!Array.isArray(entries)) {
      return defaults;
    }

    return defaults.map((_defaultEntry, index) => {
      const entry = entries[index];
      if (typeof entry !== "string") return defaults[index];
      const trimmed = entry.trim();
      return trimmed || defaults[index];
    });
  }

  function loadIdentity() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.identity);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveIdentity(identity) {
    localStorage.setItem(STORAGE_KEYS.identity, JSON.stringify(identity));
  }

  function saveSession(session) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.session);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function getPageSession() {
    const params = new URLSearchParams(location.search);
    const roomCodeFromQuery = params.get("code")?.trim().toUpperCase();
    const stored = loadSession();

    if (roomCodeFromQuery && stored) {
      return { ...stored, roomCode: roomCodeFromQuery };
    }

    if (roomCodeFromQuery && !stored) {
      const identity = loadIdentity();
      if (!identity.displayName) return null;
      return {
        roomCode: roomCodeFromQuery,
        participantId: toParticipantId(identity.authUserId),
        displayName: identity.displayName,
      };
    }

    return stored;
  }

  function toParticipantId(authUserId) {
    const auth = String(authUserId || "").trim();
    if (auth) return `user:${auth}`;

    const guestId = getOrCreateGuestId();
    return `guest:${guestId}`;
  }

  function getOrCreateGuestId() {
    const existing = localStorage.getItem(STORAGE_KEYS.guestId);
    if (existing) return existing;

    const next =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(STORAGE_KEYS.guestId, next);
    return next;
  }

  function setStatus(el, message, isError = false) {
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", isError);
  }

  function buildDefaultVotes(bidragCount = DEFAULT_BIDRAG_COUNT) {
    const count = normalizeBidragCount(bidragCount, DEFAULT_BIDRAG_COUNT);
    const votes = {};

    for (let i = 1; i <= count; i += 1) {
      const bidragId = `bidrag-${i}`;
      votes[bidragId] = {};
      CATEGORIES.forEach(({ key }) => {
        votes[bidragId][key] = 5;
      });
    }

    return votes;
  }

  function mergeVotes(votes, bidragCount = DEFAULT_BIDRAG_COUNT) {
    const merged = buildDefaultVotes(bidragCount);

    Object.keys(votes || {}).forEach((bidragId) => {
      if (!merged[bidragId]) return;

      CATEGORIES.forEach(({ key }) => {
        const value = Number(votes[bidragId]?.[key]);
        if (
          Number.isInteger(value) &&
          value >= SCORE_MIN &&
          value <= SCORE_MAX
        ) {
          merged[bidragId][key] = value;
        }
      });
    });

    return merged;
  }

  function sumBidrag(bidragVotes) {
    return CATEGORIES.reduce(
      (sum, { key }) => sum + Number(bidragVotes[key]),
      0,
    );
  }

  function getBestCategory(averages) {
    let best = {
      key: CATEGORIES[0].key,
      label: CATEGORIES[0].label,
      value: -1,
    };

    CATEGORIES.forEach((category) => {
      const value = Number(averages?.[category.key] || 0);
      if (value > best.value) {
        best = { ...category, value };
      }
    });

    return best;
  }

  function renderVoteGrid(
    container,
    votes,
    entries = buildDefaultEntries(),
    bidragCount = entries.length,
  ) {
    container.innerHTML = "";
    const count = normalizeBidragCount(
      bidragCount,
      entries.length || DEFAULT_BIDRAG_COUNT,
    );
    const labels = normalizeEntries(entries, count);

    for (let i = 1; i <= count; i += 1) {
      const bidragId = `bidrag-${i}`;
      const card = document.createElement("article");
      card.className = "card vote-card";
      card.dataset.bidrag = bidragId;

      const title = document.createElement("h2");
      title.textContent = labels[i - 1];
      card.append(title);

      const rows = document.createElement("div");
      rows.className = "rows";

      CATEGORIES.forEach(({ key, label }, index) => {
        const sliderId = `${bidragId}-${index}`;
        const value = Number(votes[bidragId]?.[key] ?? SCORE_MAX);

        const row = document.createElement("label");
        row.className = "slider-row";
        row.htmlFor = sliderId;

        const labelEl = document.createElement("span");
        labelEl.className = "slider-label";
        labelEl.textContent = label;

        const slider = document.createElement("input");
        slider.className = "vote-slider";
        slider.id = sliderId;
        slider.type = "range";
        slider.min = String(SCORE_MIN);
        slider.max = String(SCORE_MAX);
        slider.value = String(value);
        slider.dataset.bidrag = bidragId;
        slider.dataset.category = key;
        setSliderProgress(slider, value);

        const valueEl = document.createElement("output");
        valueEl.className = "value-chip";
        valueEl.textContent = String(value);

        row.append(labelEl, slider, valueEl);
        rows.append(row);
      });

      card.append(rows);

      const total = document.createElement("p");
      total.className = "total";
      total.dataset.totalFor = bidragId;
      total.textContent = `Total: ${sumBidrag(votes[bidragId])}`;
      card.append(total);

      container.append(card);
    }
  }

  function renderTotals(
    container,
    bidragResults,
    entries = buildDefaultEntries(),
    bidragCount = entries.length,
  ) {
    container.innerHTML = "";
    const count = normalizeBidragCount(
      bidragCount,
      entries.length || DEFAULT_BIDRAG_COUNT,
    );
    const labels = normalizeEntries(entries, count);

    if (!bidragResults.length) {
      container.innerHTML =
        '<article class="card"><p class="muted">No submissions yet.</p></article>';
      return;
    }

    bidragResults.forEach((result, idx) => {
      const bestCategory = getBestCategory(result.averages);
      const categoryHtml = CATEGORIES.map(({ key, label }) => {
        return `<li><strong>${label}:</strong> ${toDisplayNumber(result.averages[key])}</li>`;
      }).join("");
      const bidragNumber = Number(String(result.bidragId).split("-")[1]);
      const bidragLabel = labels[bidragNumber - 1] || `Bidrag ${bidragNumber}`;

      const medalClass = idx < 3 ? ` rank-${idx + 1}` : "";

      container.insertAdjacentHTML(
        "beforeend",
        `<article class="card result-card${medalClass}">
          <h2>${escapeHtml(bidragLabel)}</h2>
          <p><strong>Total Avg:</strong> ${toDisplayNumber(result.totalAvg)}</p>
          <p><strong>Votes Count:</strong> ${result.votesCount}</p>
          <p class="muted">Top category: ${escapeHtml(bestCategory.label)} (${toDisplayNumber(bestCategory.value)})</p>
          <ul class="category-list">${categoryHtml}</ul>
        </article>`,
      );
    });
  }

  function updateSliderRow(slider, value) {
    const row = slider.closest(".slider-row");
    const chip = row?.querySelector(".value-chip");
    if (chip) {
      chip.textContent = String(value);
      chip.classList.remove("pulse");
      void chip.offsetWidth;
      chip.classList.add("pulse");
    }

    setSliderProgress(slider, value);
  }

  function setSliderProgress(slider, value) {
    const percent = ((value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
    slider.style.setProperty("--progress", `${percent}%`);
  }

  function updateBidragTotal(container, bidragId, bidragVotes) {
    const total = container.querySelector(`[data-total-for="${bidragId}"]`);
    if (!total) return;
    total.textContent = `Total: ${sumBidrag(bidragVotes)}`;
  }

  function toDisplayNumber(value) {
    return Number(value || 0).toFixed(1);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  window.melloCommon = {
    buildDefaultEntries,
    buildDefaultVotes,
    escapeHtml,
    getPageSession,
    loadIdentity,
    mergeVotes,
    normalizeEntries,
    normalizeBidragCount,
    renderTotals,
    renderVoteGrid,
    saveIdentity,
    saveSession,
    setStatus,
    toParticipantId,
    updateBidragTotal,
    updateSliderRow,
  };
})();
