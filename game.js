const LEADERBOARD_STORAGE_KEY = "number-room-leaderboard-v1";
const SETTINGS_STORAGE_KEY = "number-room-settings-v1";
const LEADERBOARD_LIMIT = 5;
const SCORE_BASE = 1000;
const ROUND_DURATION_SECONDS = 60;

const elements = {
  form: document.querySelector("#guess-form"),
  input: document.querySelector("#guess-input"),
  feedback: document.querySelector("#feedback"),
  attemptCount: document.querySelector("#attempt-count"),
  historyList: document.querySelector("#guess-history"),
  historyTotal: document.querySelector("#history-total"),
  restartButton: document.querySelector("#restart-button"),
  difficultySelect: document.querySelector("#difficulty-select"),
  startGameButton: document.querySelector("#start-game-button"),
  rangeUpper: document.querySelector("#range-upper"),
  rangeDisplay: document.querySelector("#range-display"),
  rangeDescription: document.querySelector("#range-description"),
  footerRange: document.querySelector("#footer-range"),
  roundStatus: document.querySelector("#round-status"),
  leaderboardList: document.querySelector("#leaderboard-list"),
  leaderboardStatus: document.querySelector("#leaderboard-status"),
  themeSelect: document.querySelector("#theme-select"),
  darkModeButton: document.querySelector("#dark-mode-button"),
  soundToggle: document.querySelector("#sound-toggle"),
  timerDisplay: document.querySelector("#timer-display"),
  timerCount: document.querySelector("#timer-count")
};
elements.guessButton = elements.form.querySelector("button[type='submit']");

const game = {
  secretNumber: null,
  attempts: 0,
  maxNumber: Number(elements.difficultySelect.value),
  started: false,
  complete: true,
  leaderboard: [],
  timeRemaining: ROUND_DURATION_SECONDS,
  timerId: null,
  audioContext: null,
  settings: { theme: "grove", darkMode: false, soundEnabled: false }
};

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    return {
      theme: ["grove", "ocean", "sunset"].includes(savedSettings.theme) ? savedSettings.theme : "grove",
      darkMode: savedSettings.darkMode === true,
      soundEnabled: savedSettings.soundEnabled === true
    };
  } catch {
    return { theme: "grove", darkMode: false, soundEnabled: false };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(game.settings));
  } catch {
    // Settings still apply for this visit when browser storage is unavailable.
  }
}

function applySettings() {
  document.body.dataset.palette = game.settings.theme;
  document.body.classList.toggle("dark-mode", game.settings.darkMode);
  elements.themeSelect.value = game.settings.theme;
  elements.darkModeButton.setAttribute("aria-pressed", String(game.settings.darkMode));
  elements.darkModeButton.innerHTML = `<span aria-hidden="true">${game.settings.darkMode ? "☀" : "☾"}</span> ${game.settings.darkMode ? "Light mode" : "Dark mode"}`;
  elements.soundToggle.checked = game.settings.soundEnabled;
}

function playTone(frequency, duration = 0.12, type = "sine") {
  if (!game.settings.soundEnabled) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  game.audioContext ??= new AudioContextClass();
  if (game.audioContext.state === "suspended") game.audioContext.resume();

  const oscillator = game.audioContext.createOscillator();
  const gain = game.audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.08, game.audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, game.audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(game.audioContext.destination);
  oscillator.start();
  oscillator.stop(game.audioContext.currentTime + duration);
}

function updateTimerDisplay() {
  elements.timerCount.firstChild.textContent = String(game.timeRemaining);
  elements.timerDisplay.classList.toggle("is-urgent", game.timeRemaining <= 10);
  elements.timerDisplay.setAttribute("aria-label", `${game.timeRemaining} seconds remaining`);
}

function stopTimer() {
  window.clearInterval(game.timerId);
  game.timerId = null;
}

function endRoundOnTimeout() {
  game.complete = true;
  game.started = false;
  stopTimer();
  setGuessingEnabled(false);
  elements.difficultySelect.disabled = false;
  elements.startGameButton.hidden = false;
  elements.startGameButton.firstChild.textContent = "Try again ";
  elements.roundStatus.textContent = "TIME IS UP";
  setFeedback(`Time's up. The number was ${game.secretNumber}.`, "error");
  playTone(180, 0.35, "triangle");
}

function startTimer() {
  stopTimer();
  game.timeRemaining = ROUND_DURATION_SECONDS;
  updateTimerDisplay();
  game.timerId = window.setInterval(() => {
    game.timeRemaining -= 1;
    updateTimerDisplay();
    if (game.timeRemaining <= 0) endRoundOnTimeout();
  }, 1000);
}

function compareScores(first, second) {
  return second.score - first.score || first.attempts - second.attempts;
}

function loadLeaderboard() {
  try {
    const savedScores = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || "[]");
    if (!Array.isArray(savedScores)) return [];

    // Ignore malformed stored entries so one bad record cannot break the board.
    return savedScores
      .filter((entry) => entry && Number.isFinite(entry.score) && entry.score > 0
        && Number.isInteger(entry.attempts) && entry.attempts > 0
        && typeof entry.difficulty === "string")
      .sort(compareScores)
      .slice(0, LEADERBOARD_LIMIT);
  } catch {
    elements.leaderboardStatus.textContent = "Local storage is unavailable in this browser.";
    return [];
  }
}

function createLeaderboardRow(entry, rank) {
  const row = document.createElement("li");
  row.className = "leaderboard-entry";

  const rankLabel = document.createElement("span");
  rankLabel.className = "leaderboard-rank";
  rankLabel.textContent = String(rank).padStart(2, "0");

  const scoreLabel = document.createElement("span");
  scoreLabel.className = "leaderboard-score";
  scoreLabel.textContent = `${entry.score.toLocaleString()} pts`;

  const details = document.createElement("span");
  details.className = "leaderboard-details";
  details.textContent = `${entry.difficulty} · ${entry.attempts} ${entry.attempts === 1 ? "guess" : "guesses"}`;

  row.append(rankLabel, scoreLabel, details);
  return row;
}

function renderLeaderboard() {
  elements.leaderboardList.replaceChildren();
  if (game.leaderboard.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "leaderboard-empty";
    emptyMessage.textContent = "Win a round to post your first score.";
    elements.leaderboardList.append(emptyMessage);
    return;
  }

  game.leaderboard.forEach((entry, index) => {
    elements.leaderboardList.append(createLeaderboardRow(entry, index + 1));
  });
}

function saveLeaderboard() {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(game.leaderboard));
    return true;
  } catch {
    return false;
  }
}

function recordScore() {
  // Fewer guesses earn more points, making a higher score a better result.
  const score = Math.round(SCORE_BASE / game.attempts);
  const entry = {
    score,
    attempts: game.attempts,
    difficulty: elements.difficultySelect.selectedOptions[0].textContent.split(" ")[0],
    playedAt: Date.now()
  };

  game.leaderboard = [...game.leaderboard, entry]
    .sort(compareScores)
    .slice(0, LEADERBOARD_LIMIT);

  const wasSaved = saveLeaderboard();
  elements.leaderboardStatus.textContent = wasSaved
    ? `Saved ${score.toLocaleString()} points to this browser.`
    : "Could not save this score in local storage.";
  renderLeaderboard();
}

function updateDifficultyDisplay() {
  game.maxNumber = Number(elements.difficultySelect.value);
  elements.rangeUpper.textContent = String(game.maxNumber);
  elements.rangeDisplay.setAttribute("aria-label", `The hidden number is between 1 and ${game.maxNumber}`);
  elements.rangeDescription.textContent = `There’s a number between 1 and ${game.maxNumber}. Make a guess and follow the clues.`;
  elements.footerRange.textContent = `01—${game.maxNumber}`;
  elements.input.max = String(game.maxNumber);
}

function setFeedback(message, state = "") {
  elements.feedback.textContent = message;
  elements.feedback.dataset.state = state;
}

function resetHistory() {
  elements.historyList.replaceChildren();
  const emptyMessage = document.createElement("li");
  emptyMessage.className = "history-empty";
  emptyMessage.textContent = "Your guesses will show up here.";
  elements.historyList.append(emptyMessage);
}

function updateAttemptCounters() {
  elements.attemptCount.textContent = String(game.attempts);
  elements.historyTotal.textContent = String(game.attempts).padStart(2, "0");
}

function setGuessingEnabled(isEnabled) {
  elements.input.disabled = !isEnabled;
  elements.guessButton.disabled = !isEnabled;
}

function startRound() {
  stopTimer();
  updateDifficultyDisplay();
  game.secretNumber = Math.floor(Math.random() * game.maxNumber) + 1;
  game.attempts = 0;
  game.started = true;
  game.complete = false;

  updateAttemptCounters();
  resetHistory();
  setFeedback(`Enter a number from 1 to ${game.maxNumber}.`);
  elements.input.value = "";
  setGuessingEnabled(true);
  elements.difficultySelect.disabled = true;
  elements.startGameButton.hidden = true;
  elements.restartButton.disabled = false;
  elements.roundStatus.textContent = "ROUND IN PROGRESS";
  startTimer();
  elements.input.focus();
}

function addHistoryEntry(guess, result, state) {
  const entry = document.createElement("li");
  entry.className = "history-entry";

  const number = document.createElement("span");
  number.className = "entry-number";
  const index = document.createElement("span");
  index.className = "entry-index";
  index.textContent = String(game.attempts).padStart(2, "0");
  number.append(index, document.createTextNode(String(guess)));

  const resultLabel = document.createElement("span");
  resultLabel.className = "entry-result";
  resultLabel.dataset.state = state;
  resultLabel.textContent = result;

  entry.append(number, resultLabel);
  elements.historyList.prepend(entry);
}

function isValidGuess(value) {
  const guess = Number(value);
  return value !== "" && Number.isInteger(guess) && guess >= 1 && guess <= game.maxNumber;
}

function showInvalidGuess() {
  setFeedback(`Enter a whole number from 1 to ${game.maxNumber}.`, "error");
  elements.input.focus();
}

function finishRound(guess) {
  game.complete = true;
  game.started = false;
  stopTimer();
  setFeedback(`You got it in ${game.attempts} ${game.attempts === 1 ? "guess" : "guesses"}!`, "won");
  addHistoryEntry(guess, "Correct!", "won");
  recordScore();
  setGuessingEnabled(false);
  elements.difficultySelect.disabled = false;
  elements.startGameButton.hidden = false;
  elements.startGameButton.firstChild.textContent = "Start another game ";
  elements.roundStatus.textContent = "ROUND COMPLETE";
  playTone(660, 0.18);
  window.setTimeout(() => playTone(880, 0.24), 130);
  elements.restartButton.focus();
}

function showGuessHint(guess) {
  if (guess < game.secretNumber) {
    setFeedback("Too low. Try a higher number.", "low");
    addHistoryEntry(guess, "Too low", "low");
    playTone(280, 0.1, "triangle");
    return;
  }

  setFeedback("Too high. Try a lower number.", "high");
  addHistoryEntry(guess, "Too high", "high");
  playTone(220, 0.1, "triangle");
}

function handleGuessSubmit(event) {
  event.preventDefault();
  if (!game.started || game.complete) return;

  const guessValue = elements.input.value;
  if (!isValidGuess(guessValue)) {
    showInvalidGuess();
    return;
  }

  const guess = Number(guessValue);
  game.attempts += 1;
  updateAttemptCounters();

  if (guess === game.secretNumber) {
    finishRound(guess);
  } else {
    showGuessHint(guess);
  }

  elements.input.value = "";
  if (!game.complete) elements.input.focus();
}

function handleDifficultyChange() {
  updateDifficultyDisplay();
  if (!game.started || game.complete) {
    const selectedDifficulty = elements.difficultySelect.selectedOptions[0].text;
    setFeedback(`Ready for ${selectedDifficulty}. Start when you are ready.`);
  }
}

function handleThemeChange() {
  game.settings.theme = elements.themeSelect.value;
  applySettings();
  saveSettings();
}

function handleDarkModeToggle() {
  game.settings.darkMode = !game.settings.darkMode;
  applySettings();
  saveSettings();
}

function handleSoundToggle() {
  game.settings.soundEnabled = elements.soundToggle.checked;
  saveSettings();
  if (game.settings.soundEnabled) playTone(520, 0.1);
}

function initializeGame() {
  game.settings = loadSettings();
  game.leaderboard = loadLeaderboard();
  applySettings();
  updateDifficultyDisplay();
  updateTimerDisplay();
  renderLeaderboard();

  elements.form.addEventListener("submit", handleGuessSubmit);
  elements.startGameButton.addEventListener("click", startRound);
  elements.restartButton.addEventListener("click", startRound);
  elements.difficultySelect.addEventListener("change", handleDifficultyChange);
  elements.themeSelect.addEventListener("change", handleThemeChange);
  elements.darkModeButton.addEventListener("click", handleDarkModeToggle);
  elements.soundToggle.addEventListener("change", handleSoundToggle);
}

initializeGame();