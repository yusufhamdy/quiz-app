import Quiz from "./quiz.js";
import Question from "./question.js";
import { escapeHtml } from "./utils.js";

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 50;
const FORM_ERROR_TIME = 3000;

const quizOptionsForm = document.getElementById("quizOptions");
const playerNameInput = document.getElementById("playerName");
const categoryInput = document.getElementById("categoryMenu");
const difficultyOptions = document.getElementById("difficultyOptions");
const questionsNumber = document.getElementById("questionsNumber");
const startQuizBtn = document.getElementById("startQuiz");
const questionsContainer = document.querySelector(".questions-container");

let currentQuiz = null;

function showLoading() {
  questionsContainer.innerHTML = `
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>`;
}

function hideLoading() {
  const loading = questionsContainer.querySelector(".loading-overlay");
  if (loading) loading.remove();
}

function showError(message) {
  questionsContainer.innerHTML = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message">${escapeHtml(message)}</p>
      <button class="btn-play retry-btn">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>`;

  questionsContainer.querySelector(".retry-btn").addEventListener("click", resetToStart);
}

function validateForm() {
  const value = questionsNumber.value.trim();
  const count = Number(value);

  if (value === "" || !Number.isInteger(count)) {
    return { isValid: false, error: "Please enter the number of questions." };
  }
  if (count < MIN_QUESTIONS || count > MAX_QUESTIONS) {
    return { isValid: false, error: `Please choose between ${MIN_QUESTIONS} and ${MAX_QUESTIONS} questions.` };
  }
  return { isValid: true, error: "" };
}

function showFormError(message) {
  const oldError = quizOptionsForm.querySelector(".form-error");
  if (oldError) oldError.remove();

  const error = document.createElement("div");
  error.className = "form-error";
  error.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(message)}`;
  startQuizBtn.before(error);

  setTimeout(() => {
    error.style.transition = "opacity 0.3s";
    error.style.opacity = "0";
    setTimeout(() => error.remove(), 300);
  }, FORM_ERROR_TIME);
}

function resetToStart() {
  currentQuiz = null;
  questionsContainer.innerHTML = "";

  quizOptionsForm.reset();
  // The custom selects keep their own text, so select the default options again
  document.querySelectorAll(".custom-select").forEach((select) => {
    select.querySelector(".custom-select-option").click();
  });

  quizOptionsForm.classList.remove("hidden");
}

async function startQuiz() {
  const { isValid, error } = validateForm();
  if (!isValid) {
    showFormError(error);
    return;
  }

  const playerName = playerNameInput.value.trim() || "Player";
  currentQuiz = new Quiz(
    categoryInput.value,
    difficultyOptions.value,
    Number(questionsNumber.value),
    playerName
  );

  quizOptionsForm.classList.add("hidden");
  showLoading();

  try {
    const questions = await currentQuiz.getQuestions();
    hideLoading();
    if (questions.length === 0) {
      throw new Error("No questions found for this selection.");
    }
    new Question(currentQuiz, questionsContainer, resetToStart).displayQuestion();
  } catch (error) {
    hideLoading();
    showError(error.message || "Failed to load questions. Please try again.");
  }
}

startQuizBtn.addEventListener("click", startQuiz);
