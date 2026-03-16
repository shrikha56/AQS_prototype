import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { QueueService } from '../services/queue.service';
import { CvService } from '../services/cv.service';

@Component({
  selector: 'app-queue',
  standalone: true,
  template: `
    <div class="queue-display">
      <div class="display-left">
        <div class="now-serving-label">
          NOW SERVING
          <button class="sound-toggle" (click)="toggleSound()" [title]="soundEnabled() ? 'Mute announcements' : 'Enable announcements'">
            <span class="material-symbols-rounded" style="font-size: 20px;">
              {{ soundEnabled() ? 'volume_up' : 'volume_off' }}
            </span>
          </button>
        </div>
        <div class="now-serving-ticket mono" [class.cycling]="isCycling()">
          {{ currentServing() }}
        </div>
        <div class="now-serving-counter">Counter {{ currentCounter() }}</div>
        <div class="now-serving-service">{{ currentServiceName() }}</div>
      </div>
      <div class="display-right">
        <div class="up-next-label">UP NEXT</div>
        <div class="up-next-list">
          @for (item of waitingItems(); track item.ticket; let i = $index) {
            <div class="next-item" [class.first]="i === 0">
              <div class="next-ticket mono">{{ item.ticket }}</div>
              <div class="next-info">
                <div class="next-service">{{ item.service }}</div>
                <div class="next-wait">~{{ getAiWait(i) }} min wait (AI)</div>
              </div>
            </div>
          }
          @if (waitingItems().length === 0) {
            <div class="empty-queue">No customers waiting</div>
          }
        </div>
      </div>
      <div class="display-footer">
        <div class="footer-stats">
          <div class="stat">
            <span class="stat-value">{{ queueService.waitingCount() }}</span>
            <span class="stat-label">Waiting</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ queueService.servingCount() }}</span>
            <span class="stat-label">Being Served</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ servedToday }}</span>
            <span class="stat-label">Served Today</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ queueService.avgWaitMinutes() }}m</span>
            <span class="stat-label">Avg Wait</span>
          </div>
          <div class="stat ai-stat">
            <span class="stat-value">~{{ cvPredictedWait() }}m</span>
            <span class="stat-label">
              <span class="material-symbols-rounded" style="font-size: 10px; vertical-align: middle;">visibility</span>
              AI Est.
            </span>
          </div>
        </div>
        <div class="footer-message">
          <span class="marquee">Welcome to LA County Registrar-Recorder/County Clerk &mdash; Powered by PlaceOS AQS &mdash; Please have your documents ready</span>
        </div>
        <div class="footer-clock mono">{{ currentTime() }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; margin: -24px -28px; }
    .queue-display {
      height: 100%;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--secondary-focus) 100%);
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 72px;
      color: var(--secondary-content);
      overflow: hidden;
    }
    .display-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-right: 1px solid rgba(255,255,255,0.06);
      padding: 40px;
    }
    .now-serving-label {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sound-toggle {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      transition: all 0.2s;
    }
    .sound-toggle:hover {
      background: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.9);
    }
    .now-serving-ticket {
      font-size: 96px;
      font-weight: 700;
      color: var(--secondary-content);
      text-shadow: 0 0 60px hsla(156, 57%, 48%, 0.4);
      transition: all 0.5s;
      animation: ticketPulse 3s ease-in-out infinite;
    }
    @keyframes ticketPulse {
      0%, 100% { text-shadow: 0 0 40px hsla(156, 57%, 48%, 0.3); }
      50% { text-shadow: 0 0 80px hsla(156, 57%, 48%, 0.6); }
    }
    .now-serving-ticket.cycling { animation: cycleIn 0.5s ease; }
    @keyframes cycleIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
    .now-serving-counter {
      font-size: 24px;
      font-weight: 600;
      margin-top: 16px;
      color: rgba(255,255,255,0.7);
    }
    .now-serving-service {
      font-size: 16px;
      margin-top: 8px;
      color: rgba(255,255,255,0.4);
    }
    .display-right {
      padding: 32px;
      overflow-y: auto;
    }
    .up-next-label {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 20px;
    }
    .up-next-list { display: flex; flex-direction: column; gap: 8px; }
    .next-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.06);
      transition: all 0.3s;
    }
    .next-item.first {
      background: hsla(156, 57%, 48%, 0.08);
      border-color: hsla(156, 57%, 48%, 0.3);
      animation: glow 2s ease-in-out infinite;
    }
    .next-ticket {
      font-size: 22px;
      font-weight: 700;
      min-width: 80px;
      color: var(--accent);
    }
    .next-info { flex: 1; }
    .next-service { font-size: 14px; font-weight: 600; }
    .next-wait { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
    .empty-queue {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255,255,255,0.3);
      font-size: 16px;
    }
    .display-footer {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      background: rgba(0,0,0,0.3);
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 0 24px;
      gap: 24px;
    }
    .footer-stats { display: flex; gap: 24px; flex-shrink: 0; }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-value { font-size: 18px; font-weight: 700; color: var(--accent); }
    .stat-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; }
    .ai-stat .stat-value { color: var(--primary); }
    .ai-stat .stat-label { color: rgba(255,255,255,0.5); }
    .footer-message {
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
    }
    .marquee {
      display: inline-block;
      animation: marquee 30s linear infinite;
      font-size: 13px;
      color: rgba(255,255,255,0.5);
    }
    @keyframes marquee {
      from { transform: translateX(100%); }
      to { transform: translateX(-100%); }
    }
    .footer-clock {
      font-size: 20px;
      font-weight: 700;
      color: var(--secondary-content);
      flex-shrink: 0;
    }
  `]
})
export class QueueComponent implements OnInit, OnDestroy {
  readonly queueService = inject(QueueService);
  readonly cvService = inject(CvService);

  readonly currentTime = signal('');
  readonly isCycling = signal(false);
  readonly soundEnabled = signal(true);
  readonly servedToday = 47;

  private _clockInterval: ReturnType<typeof setInterval> | null = null;
  private _cycleInterval: ReturnType<typeof setInterval> | null = null;
  private _keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private _lastAnnouncedTicket = '';
  private _synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private _audioUnlocked = false;

  constructor() {
    // Set initial ticket so we don't announce on page load
    const initialServing = this.queueService.queue().find(q => q.status === 'serving');
    if (initialServing) this._lastAnnouncedTicket = initialServing.ticket;

    // Watch for changes in the currently serving ticket and announce
    effect(() => {
      const serving = this.queueService.queue().find(q => q.status === 'serving');
      if (!serving) return;
      const ticket = serving.ticket;
      const counter = serving.counter ?? 0;
      if (ticket && ticket !== this._lastAnnouncedTicket && ticket !== '---') {
        this._lastAnnouncedTicket = ticket;
        console.log('[AQS] New serving ticket:', ticket, 'counter:', counter, 'sound:', this.soundEnabled());
        if (this.soundEnabled()) {
          this._announce(ticket, counter);
        }
      }
    });
  }

  ngOnInit(): void {

    this.updateClock();
    this._clockInterval = setInterval(() => this.updateClock(), 1000);
    this._cycleInterval = setInterval(() => {
      this.isCycling.set(true);
      setTimeout(() => this.isCycling.set(false), 600);
    }, 8000);

    // Chrome workaround: keep speechSynthesis alive by poking it every 10s
    // Without this, Chrome suspends the synth after ~15s of inactivity
    this._keepaliveInterval = setInterval(() => {
      if (this._synth && this.soundEnabled()) {
        this._synth.pause();
        this._synth.resume();
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this._clockInterval) clearInterval(this._clockInterval);
    if (this._cycleInterval) clearInterval(this._cycleInterval);
    if (this._keepaliveInterval) clearInterval(this._keepaliveInterval);
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  currentServing(): string {
    const serving = this.queueService.queue().find(q => q.status === 'serving');
    return serving?.ticket ?? '---';
  }

  currentCounter(): number {
    const serving = this.queueService.queue().find(q => q.status === 'serving');
    return serving?.counter ?? 0;
  }

  currentServiceName(): string {
    const serving = this.queueService.queue().find(q => q.status === 'serving');
    return serving?.service ?? '';
  }

  waitingItems(): { ticket: string; service: string; checkInTime: Date }[] {
    return this.queueService.queue()
      .filter(q => q.status === 'waiting')
      .slice(0, 8);
  }

  getWaitTime(checkIn: Date): number {
    return Math.round((new Date().getTime() - checkIn.getTime()) / 60000);
  }

  getAiWait(position: number): number {
    return this.cvService.getEstimatedWaitForQueue(position + 1, '', 'norwalk');
  }

  cvPredictedWait = computed(() => {
    const pred = this.cvService.getPredictionForLocation('norwalk');
    return pred?.predicted_wait_minutes ?? 0;
  });

  toggleSound(): void {
    this.soundEnabled.update(v => !v);
    // Unlock audio on first user interaction
    if (!this._audioUnlocked) {
      this._unlockAudio();
    }
  }

  private _unlockAudio(): void {
    this._audioUnlocked = true;
    // Browsers require a user gesture to unlock AudioContext + SpeechSynthesis
    try {
      const ctx = new AudioContext();
      ctx.resume().then(() => ctx.close());
    } catch { /* ignore */ }
    if (this._synth) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      this._synth.speak(u);
    }
  }

  private _announce(ticket: string, counter: number): void {
    if (!this._synth) {
      console.warn('[AQS] SpeechSynthesis not available');
      return;
    }

    // Chrome bug workaround: cancel + pause/resume to unstick the queue
    this._synth.cancel();
    this._synth.pause();
    this._synth.resume();

    const spellTicket = ticket.split('').join(' ');
    const text = `Now serving, ${spellTicket}, at counter ${counter}.`;
    console.log('[AQS] Speaking:', text);

    // Small delay to let cancel fully clear
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onerror = (e) => console.error('[AQS] Speech error:', e);
      utterance.onstart = () => console.log('[AQS] Speech started');
      utterance.onend = () => console.log('[AQS] Speech ended');

      // Prefer a natural voice if available
      const voices = this._synth!.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
        || voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;

      this._synth!.speak(utterance);
    }, 100);
  }
}
