const form = document.querySelector("#guess-form");
const input = document.querySelector("#guess-input");
const feedback = document.querySelector("#feedback");
const attemptCount = document.querySelector("#attempt-count");
const historyList = document.querySelector("#guess-history");
const historyTotal = document.querySelector("#history-total");
const restartButton = document.querySelector("#restart-button");
const guessButton = form.querySelector("button[type='submit']");

let secretNumber;
let attempts;
let roundComplete;

function startRound() {
  secretNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  roundComplete = false;
  attemptCount.textContent = "0";
  historyTotal.textContent = "00";
  historyList.replaceChildren();
  const emptyMessage = document.createElement("li");
  emptyMessage.className = "history-empty";
  emptyMessage.textContent = "Your guesses will show up here.";
  historyList.append(emptyMessage);
  feedback.textContent = "Enter a number from 1 to 100 to begin.";
  feedback.dataset.state = "";
  input.value = "";
  input.disabled = false;
  guessButton.disabled = false;
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
  if (roundComplete) return;

  const guess = Number(input.value);
  if (!input.value || !Number.isInteger(guess) || guess < 1 || guess > 100) {
    feedback.textContent = "Enter a whole number from 1 to 100.";
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

restartButton.addEventListener("click", startRound);

startRound();