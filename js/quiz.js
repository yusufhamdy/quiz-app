import { escapeHtml } from "./utils.js";

const API_URL = "https://opentdb.com/api.php";
const HIGH_SCORES_KEY = "quizHighScores";
const MAX_HIGH_SCORES = 10;
const RANK_CLASSES = ["gold", "silver", "bronze"];

export default class Quiz {
  constructor(category, difficulty, numberOfQuestions, playerName) {
    this.category = category;
    this.difficulty = difficulty;
    this.numberOfQuestions = numberOfQuestions;
    this.playerName = playerName;
    this.score = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
  }

  buildApiUrl() {
    const params = new URLSearchParams({ amount: this.numberOfQuestions });
    if (this.category) params.set("category", this.category);
    if (this.difficulty) params.set("difficulty", this.difficulty);
    return `${API_URL}?${params}`;
  }

  async getQuestions() {
    const response = await fetch(this.buildApiUrl());
    if (!response.ok) {
      throw new Error(`Failed to load questions (status ${response.status}). Please try again in a few seconds.`);
    }

    const data = await response.json();
    if (data.response_code === 1) {
      throw new Error("Not enough questions for this selection. Try fewer questions or another category.");
    }
    if (data.response_code === 5) {
      throw new Error("Too many requests. Please wait a few seconds and try again.");
    }
    if (data.response_code !== 0) {
      throw new Error("Failed to load questions. Please try again.");
    }

    this.questions = data.results;
    return this.questions;
  }

  incrementScore() {
    this.score++;
  }

  getCurrentQuestion() {
    return this.questions[this.currentQuestionIndex];
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    return !this.isComplete();
  }

  isComplete() {
    return this.currentQuestionIndex >= this.questions.length;
  }

  getScorePercentage() {
    return Math.round((this.score / this.numberOfQuestions) * 100);
  }

  getHighScores() {
    try {
      return JSON.parse(localStorage.getItem(HIGH_SCORES_KEY)) || [];
    } catch {
      return [];
    }
  }

  saveHighScore() {
    const scores = this.getHighScores();
    scores.push({
      name: this.playerName,
      score: this.score,
      total: this.numberOfQuestions,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      date: new Date().toISOString(),
    });

    scores.sort((a, b) => b.percentage - a.percentage);
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores.slice(0, MAX_HIGH_SCORES)));
  }

  isHighScore() {
    const scores = this.getHighScores();
    if (scores.length < MAX_HIGH_SCORES) return true;

    const lowest = Math.min(...scores.map((item) => item.percentage));
    return this.getScorePercentage() > lowest;
  }

  endQuiz() {
    const isNewRecord = this.isHighScore();
    if (isNewRecord) this.saveHighScore();

    const leaderboardItems = this.getHighScores()
      .map(
        (item, index) => `
          <li class="leaderboard-item ${RANK_CLASSES[index] || ""}">
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${escapeHtml(item.name)}</span>
            <span class="leaderboard-score">${item.percentage}%</span>
          </li>`
      )
      .join("");

    return `
      <div class="game-card results-card">
        <h2 class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.numberOfQuestions}</p>
        <p class="results-percentage">${this.getScorePercentage()}% Accuracy</p>
        ${
          isNewRecord
            ? '<div class="new-record-badge"><i class="fa-solid fa-star"></i> New High Score!</div>'
            : ""
        }
        <div class="leaderboard">
          <h4 class="leaderboard-title"><i class="fa-solid fa-trophy"></i> Leaderboard</h4>
          <ul class="leaderboard-list">${leaderboardItems}</ul>
        </div>
        <div class="action-buttons">
          <button class="btn-restart">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>`;
  }
}
