let audioContext = null;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(context, { frequency, start, duration, type }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = context.currentTime + start;

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playNotes(notes) {
  const context = getAudioContext();
  if (!context) return;
  notes.forEach((note) => playTone(context, note));
}

export function playCorrectSound() {
  playNotes([
    { frequency: 523.25, start: 0, duration: 0.15, type: "sine" },
    { frequency: 659.25, start: 0.12, duration: 0.15, type: "sine" },
    { frequency: 783.99, start: 0.24, duration: 0.3, type: "sine" },
  ]);
}

export function playWrongSound() {
  playNotes([
    { frequency: 220, start: 0, duration: 0.2, type: "sawtooth" },
    { frequency: 155.56, start: 0.18, duration: 0.35, type: "sawtooth" },
  ]);
}
