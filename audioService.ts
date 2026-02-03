
class AudioService {
  private context: AudioContext | null = null;

  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume: number = 0.1) {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq / 2, this.context.currentTime + duration);

    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  playJump() {
    this.playTone(400, 0.1, 'square');
  }

  playCoin() {
    this.playTone(900, 0.15, 'sine', 0.15);
    setTimeout(() => this.playTone(1200, 0.2, 'sine', 0.15), 50);
  }

  playHurt() {
    this.playTone(150, 0.3, 'sawtooth', 0.2);
  }

  playBells() {
    const playBell = (freq: number, delay: number) => {
      setTimeout(() => this.playTone(freq, 0.5, 'sine', 0.1), delay);
    };
    playBell(880, 0);
    playBell(1046, 200);
    playBell(1318, 400);
  }

  playFestive() {
    // Basic festive jingle
    const notes = [523, 587, 659, 523, 659, 783, 659];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'triangle', 0.1), i * 300);
    });
  }
}

export const audioService = new AudioService();
