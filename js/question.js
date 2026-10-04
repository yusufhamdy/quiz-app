import { escapeHtml } from "./utils.js";
import { playCorrectSound, playWrongSound } from "./sounds.js";

const QUESTION_TIME = 15;
const WARNING_TIME = 5;
const NEXT_QUESTION_DELAY = 1500;
const EXIT_ANIMATION_TIME = 400;
const DIFFICULTY_ICONS = {
  easy: "fa-face-smile",
  medium: "fa-face-meh",
  hard: "fa-fire",
};

export default class Question {
  constructor(quiz, container, onQuizEnd) {
    this.quiz = quiz;
    this.container = container;
    this.onQuizEnd = onQuizEnd;

    this.questionData = quiz.getCurrentQuestion();
    this.index = quiz.currentQuestionIndex;
    this.question = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category = this.decodeHtml(this.questionData.category);
    this.wrongAnswers = this.questionData.incorrect_answers.map((answer) => this.decodeHtml(answer));
    this.allAnswers = this.shuffleAnswers();

    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = QUESTION_TIME;
    this.handleKeydown = (event) => this.selectByKey(event.key);
  }

  decodeHtml(html) {
    return new DOMParser().parseFromString(html, "text/html").documentElement.textContent;
  }

  shuffleAnswers() {
    const answers = [this.correctAnswer, ...this.wrongAnswers];
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    return answers;
  }

  getProgress() {
    return ((this.index + 1) / this.quiz.questions.length) * 100;
  }

  getAnswerButtons() {
    return this.container.querySelectorAll(".answer-btn");
  }

  displayQuestion() {
    const total = this.quiz.questions.length;
    const difficulty = this.questionData.difficulty;

    const answersHtml = this.allAnswers
      .map(
        (answer, i) => `
          <button class="answer-btn" data-answer="${escapeHtml(answer)}">
            <span class="answer-key">${i + 1}</span>
            <span class="answer-text">${escapeHtml(answer)}</span>
          </button>`
      )
      .join("");

    this.container.innerHTML = `
      <div class="game-card question-card">
        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span>
            <span class="xp-value">Question ${this.index + 1}/${total}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width: ${this.getProgress()}%"></div>
          </div>
        </div>
        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${escapeHtml(this.category)}</span>
          </div>
          <div class="stat-badge difficulty ${difficulty}">
            <i class="fa-solid ${DIFFICULTY_ICONS[difficulty] || DIFFICULTY_ICONS.easy}"></i>
            <span>${difficulty}</span>
          </div>
          <div class="stat-badge timer">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeRemaining}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${this.index + 1}/${total}</span>
          </div>
        </div>
        <h2 class="question-text">${escapeHtml(this.question)}</h2>
        <div class="answers-grid">${answersHtml}</div>
        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i> Press 1-${this.allAnswers.length} to select
        </p>
        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${this.quiz.score}</div>
          </div>
        </div>
      </div>`;

    this.addEventListeners();
    this.startTimer();
  }

  addEventListeners() {
    this.getAnswerButtons().forEach((button) => {
      button.addEventListener("click", () => this.checkAnswer(button));
    });
    document.addEventListener("keydown", this.handleKeydown);
  }

  removeEventListeners() {
    document.removeEventListener("keydown", this.handleKeydown);
  }

  selectByKey(key) {
    const button = this.getAnswerButtons()[Number(key) - 1];
    if (button) this.checkAnswer(button);
  }

  startTimer() {
    const timerBadge = this.container.querySelector(".stat-badge.timer");
    const timerValue = this.container.querySelector(".timer-value");

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      timerValue.textContent = this.timeRemaining;

      if (this.timeRemaining <= WARNING_TIME) timerBadge.classList.add("warning");
      if (this.timeRemaining <= 0) this.handleTimeUp();
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  finishQuestion() {
    this.answered = true;
    this.stopTimer();
    this.removeEventListeners();
  }

  disableOtherButtons(selectedButton) {
    this.getAnswerButtons().forEach((button) => {
      const isCorrectButton = button.dataset.answer === this.correctAnswer;
      if (button !== selectedButton && !isCorrectButton) button.classList.add("disabled");
    });
  }

  handleTimeUp() {
    this.finishQuestion();
    this.highlightCorrectAnswer("correct");
    this.disableOtherButtons(null);

    this.container
      .querySelector(".answers-grid")
      .insertAdjacentHTML(
        "afterend",
        `<div class="time-up-message"><i class="fa-solid fa-clock"></i> TIME'S UP!</div>`
      );

    playWrongSound();
    this.animateQuestion();
  }

  checkAnswer(choiceElement) {
    if (this.answered) return;
    this.finishQuestion();

    const isCorrect = choiceElement.dataset.answer === this.correctAnswer;
    if (isCorrect) {
      choiceElement.classList.add("correct");
      this.quiz.incrementScore();
      this.container.querySelector(".score-item-value").textContent = this.quiz.score;
      playCorrectSound();
    } else {
      choiceElement.classList.add("wrong");
      this.highlightCorrectAnswer("correct-reveal");
      playWrongSound();
    }

    this.disableOtherButtons(choiceElement);
    this.animateQuestion();
  }

  highlightCorrectAnswer(className) {
    this.getAnswerButtons().forEach((button) => {
      if (button.dataset.answer === this.correctAnswer) button.classList.add(className);
    });
  }

  animateQuestion() {
    setTimeout(() => {
      this.container.querySelector(".question-card").classList.add("exit");
      setTimeout(() => this.getNextQuestion(), EXIT_ANIMATION_TIME);
    }, NEXT_QUESTION_DELAY);
  }

  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      new Question(this.quiz, this.container, this.onQuizEnd).displayQuestion();
      return;
    }

    this.container.innerHTML = this.quiz.endQuiz();
    this.container.querySelector(".btn-restart").addEventListener("click", this.onQuizEnd);
  }
}
