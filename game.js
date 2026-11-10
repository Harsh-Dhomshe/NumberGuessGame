const form = document.querySelector("#guess-form");
const input = document.querySelector("#guess-input");
const feedback = document.querySelector("#feedback");
const attemptCount = document.querySelector("#attempt-count");
const historyList = document.querySelector("#guess-history");
const historyTotal = document.querySelector("#history-total");
const restartButton = document.querySelector("#restart-button");
const difficultySelect = document.querySelector("#difficulty-select");
const startGameButton = document.querySelector("#start-game-button");
const rangeUpper = document.querySelector("#range-upper");
const rangeDisplay = document.querySelector("#range-display");
const rangeDescription = document.querySelector("#range-description");
const footerRange = document.querySelector("#footer-range");
const roundStatus = document.querySelector("#round-status");
const guessButton = form.querySelector("button[type='submit']");

let secretNumber;
let attempts;
let maxNumber = Number(difficultySelect.value);
let gameStarted = false;
let roundComplete = true;

function updateDifficultyDisplay() {
  maxNumber = Number(difficultySelect.value);
  rangeUpper.textContent = String(maxNumber);
  rangeDisplay.setAttribute("aria-label", `The hidden number is between 1 and ${maxNumber}`);
  rangeDescription.textContent = `There’s a number between 1 and ${maxNumber}. Make a guess and follow the clues.`;
  footerRange.textContent = `01—${maxNumber}`;
  input.max = String(maxNumber);
}

function startRound() {
  updateDifficultyDisplay();
  secretNumber = Math.floor(Math.random() * maxNumber) + 1;
  attempts = 0;
  gameStarted = true;
  roundComplete = false;
  attemptCount.textContent = "0";
  historyTotal.textContent = "00";
  historyList.replaceChildren();
  const emptyMessage = document.createElement("li");
  emptyMessage.className = "history-empty";
  emptyMessage.textContent = "Your guesses will show up here.";
  historyList.append(emptyMessage);
  feedback.textContent = `Enter a number from 1 to ${maxNumber}.`;
  feedback.dataset.state = "";
  input.value = "";
  input.max = String(maxNumber);
  input.disabled = false;
  guessButton.disabled = false;
  difficultySelect.disabled = true;
  startGameButton.hidden = true;
  restartButton.disabled = false;
  roundStatus.textContent = "ROUND IN PROGRESS";
  input.focus();
}

function addHistoryEntry(guess, result, state) {
  const entry = document.createElement("li");
  entry.className = "history-entry";

  const number = document.createElement("span");
  number.className = "entry-number";
  const index = document.createElement("span");
  index.className = "entry-index";
  index.textContent = String(attempts).padStart(2, "0");
  number.append(index, document.createTextNode(String(guess)));

  const resultLabel = document.createElement("span");
  resultLabel.className = "entry-result";
  resultLabel.dataset.state = state;
  resultLabel.textContent = result;

  entry.append(number, resultLabel);
  historyList.prepend(entry);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!gameStarted || roundComplete) return;

  const guess = Number(input.value);
  if (!input.value || !Number.isInteger(guess) || guess < 1 || guess > maxNumber) {
    feedback.textContent = `Enter a whole number from 1 to ${maxNumber}.`;
    feedback.dataset.state = "error";
    input.focus();
    return;
  }

  attempts += 1;
  attemptCount.textContent = String(attempts);
  historyTotal.textContent = String(attempts).padStart(2, "0");

  if (guess === secretNumber) {
    feedback.textContent = `You got it in ${attempts} ${attempts === 1 ? "guess" : "guesses"}!`;
    feedback.dataset.state = "won";
    addHistoryEntry(guess, "Correct!", "won");
    roundComplete = true;
    input.disabled = true;
    guessButton.disabled = true;
    difficultySelect.disabled = false;
    startGameButton.hidden = false;
    startGameButton.firstChild.textContent = "Start another game ";
    roundStatus.textContent = "ROUND COMPLETE";
    restartButton.focus();
  } else if (guess < secretNumber) {
    feedback.textContent = "Too low. Try a higher number.";
    feedback.dataset.state = "low";
    addHistoryEntry(guess, "Too low", "low");
  } else {
    feedback.textContent = "Too high. Try a lower number.";
    feedback.dataset.state = "high";
    addHistoryEntry(guess, "Too high", "high");
  }

  input.value = "";
  if (!roundComplete) input.focus();
});

startGameButton.addEventListener("click", startRound);
restartButton.addEventListener("click", startRound);

updateDifficultyDisplay();
difficultySelect.addEventListener("change", () => {
  updateDifficultyDisplay();
  if (!gameStarted || roundComplete) {
    feedback.textContent = `Ready for ${difficultySelect.selectedOptions[0].text}. Start when you are ready.`;
  }
});