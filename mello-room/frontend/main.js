const App = (() => {
  const CATEGORIES = ["Slay", "Utseende", "Låt", "Sångröst"];
  const BIDRAG_COUNT = 6;
  const DEFAULT_SCORE = 3;
  const VALUE_EMOJIS = {
    1: "😬",
    2: "😐",
    3: "😊",
    4: "😎",
    5: "🔥",
  };
  const STORAGE_KEYS = {
    username: "mello:username",
    scores: "mello:scores",
  };

  const elements = {
    usernameInput: document.querySelector("#username"),
    bidragList: document.querySelector("#bidrag-list"),
    rankingList: document.querySelector("#ranking-list"),
  };

  const state = {
    username: "",
    scores: {},
  };

  function init() {
    hydrateState();
    render();
    attachEvents();
  }

  function hydrateState() {
    state.username = loadUsername();
    state.scores = buildScoreState(loadScores());
  }

  function buildScoreState(storedScores) {
    const nextScores = {};

    for (let bidragIndex = 1; bidragIndex <= BIDRAG_COUNT; bidragIndex += 1) {
      const bidragId = makeBidragId(bidragIndex);
      nextScores[bidragId] = {};

      CATEGORIES.forEach((category) => {
        const rawValue = storedScores?.[bidragId]?.[category];
        const parsedValue = Number(rawValue);
        nextScores[bidragId][category] = Number.isFinite(parsedValue)
          ? parsedValue
          : DEFAULT_SCORE;
      });
    }

    return nextScores;
  }

  function render() {
    renderUsername();
    renderBidragCards();
    renderRanking();
  }

  function renderUsername() {
    elements.usernameInput.value = state.username;
  }

  function renderBidragCards() {
    elements.bidragList.innerHTML = "";

    for (let bidragIndex = 1; bidragIndex <= BIDRAG_COUNT; bidragIndex += 1) {
      const bidragId = makeBidragId(bidragIndex);
      const card = createBidragCard(bidragIndex, bidragId);
      elements.bidragList.append(card);
    }
  }

  function createBidragCard(bidragIndex, bidragId) {
    const card = document.createElement("article");
    card.className = "bidrag-cont";
    card.dataset.bidrag = bidragId;

    const heading = document.createElement("h2");
    heading.textContent = `Bidrag ${bidragIndex}`;
    card.append(heading);

    const sliderContainer = document.createElement("div");
    sliderContainer.className = "slider-cont";

    CATEGORIES.forEach((category, categoryIndex) => {
      sliderContainer.append(
        createSliderRow(bidragId, category, categoryIndex),
      );
    });

    card.append(sliderContainer, createTotalRow(bidragId));
    return card;
  }

  function createSliderRow(bidragId, category, categoryIndex) {
    const sliderId = `${bidragId}-c${categoryIndex}`;
    const value = state.scores[bidragId][category];

    const label = document.createElement("label");
    label.className = "slider-row";
    label.htmlFor = sliderId;

    const text = document.createElement("span");
    text.className = "slider-label";
    text.textContent = category;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "1";
    slider.max = "5";
    slider.value = String(value);
    slider.className = "slider";
    slider.id = sliderId;
    slider.dataset.bidrag = bidragId;
    slider.dataset.category = category;
    updateSliderVisual(slider, value);

    const valueBox = document.createElement("output");
    valueBox.className = "value-box";
    valueBox.textContent = formatSliderValue(value);
    valueBox.setAttribute("for", sliderId);

    label.append(text, slider, valueBox);
    return label;
  }

  function createTotalRow(bidragId) {
    const totalRow = document.createElement("label");
    totalRow.className = "total-row";

    const totalLabel = document.createElement("span");
    totalLabel.textContent = "Total";

    const totalInput = document.createElement("input");
    totalInput.type = "number";
    totalInput.readOnly = true;
    totalInput.className = "total-input";
    totalInput.dataset.bidrag = bidragId;
    totalInput.value = String(getBidragTotal(bidragId));

    totalRow.append(totalLabel, totalInput);
    return totalRow;
  }

  function attachEvents() {
    elements.usernameInput.addEventListener("input", handleUsernameInput);
    elements.bidragList.addEventListener("input", handleSliderInput);
  }

  function handleUsernameInput(event) {
    state.username = event.target.value.trimStart();
    saveUsername(state.username);
  }

  function handleSliderInput(event) {
    if (!event.target.classList.contains("slider")) return;

    const slider = event.target;
    const bidragId = slider.dataset.bidrag;
    const category = slider.dataset.category;
    const value = Number(slider.value);

    state.scores[bidragId][category] = value;
    updateSliderVisual(slider, value);
    slider.nextElementSibling.textContent = formatSliderValue(value);
    animateValueBox(slider.nextElementSibling);
    updateBidragTotalInput(bidragId);
    renderRanking();
    saveScores(state.scores);
  }

  function updateSliderVisual(slider, value) {
    const percent = ((value - 1) / 4) * 100;
    slider.style.setProperty("--slider-progress", `${percent}%`);
    slider.setAttribute("aria-valuetext", formatSliderValue(value));
  }

  function formatSliderValue(value) {
    return `${value} ${VALUE_EMOJIS[value] || ""}`.trim();
  }

  function animateValueBox(valueBox) {
    valueBox.classList.remove("pop");
    void valueBox.offsetWidth;
    valueBox.classList.add("pop");
  }

  function updateBidragTotalInput(bidragId) {
    const input = elements.bidragList.querySelector(
      `.total-input[data-bidrag="${bidragId}"]`,
    );
    if (!input) return;
    input.value = String(getBidragTotal(bidragId));
  }

  function getBidragTotal(bidragId) {
    return CATEGORIES.reduce((sum, category) => {
      return sum + Number(state.scores[bidragId][category]);
    }, 0);
  }

  function renderRanking() {
    elements.rankingList.innerHTML = "";

    const rankedBidrag = getRankedBidrag();
    rankedBidrag.forEach(({ bidragId, total }) => {
      const li = document.createElement("li");
      li.textContent = `${formatBidragName(bidragId)} (${total} poäng)`;
      elements.rankingList.append(li);
    });
  }

  function getRankedBidrag() {
    const entries = [];

    for (let bidragIndex = 1; bidragIndex <= BIDRAG_COUNT; bidragIndex += 1) {
      const bidragId = makeBidragId(bidragIndex);
      entries.push({
        bidragId,
        total: getBidragTotal(bidragId),
        index: bidragIndex,
      });
    }

    return entries.sort((a, b) => b.total - a.total || a.index - b.index);
  }

  function formatBidragName(bidragId) {
    return `Bidrag ${bidragId.replace("bidrag-", "")}`;
  }

  function loadUsername() {
    return localStorage.getItem(STORAGE_KEYS.username) || "";
  }

  function saveUsername(username) {
    localStorage.setItem(STORAGE_KEYS.username, username);
  }

  function loadScores() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.scores);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveScores(scores) {
    localStorage.setItem(STORAGE_KEYS.scores, JSON.stringify(scores));
  }

  function makeBidragId(index) {
    return `bidrag-${index}`;
  }

  return { init };
})();

App.init();
