import { Component, inject, signal } from '@angular/core';
import { QueueService } from '../services/queue.service';

type KioskView = 'idle' | 'menu' | 'qr' | 'manual' | 'walkin' | 'confirm';

@Component({
  selector: 'app-kiosk',
  standalone: true,
  template: `
    <!-- Idle Screen -->
    @if (view() === 'idle') {
      <div class="kiosk-idle" (click)="view.set('menu')">
        <div class="idle-content">
          <div class="idle-logo">
            <span class="material-symbols-rounded" style="font-size: 64px;">assured_workload</span>
          </div>
          <h1 class="idle-title">PlaceOS</h1>
          <p class="idle-subtitle">LA County Registrar-Recorder/County Clerk</p>
          <div class="idle-divider"></div>
          <p class="idle-cta">Tap anywhere to check in</p>
          <div class="idle-pulse"></div>
        </div>
      </div>
    }

    <!-- Menu Screen -->
    @if (view() === 'menu') {
      <div class="kiosk-screen">
        <div class="kiosk-header">
          <h1>Welcome</h1>
          <p>How would you like to check in?</p>
        </div>
        <div class="menu-grid">
          <button class="menu-card" (click)="view.set('qr')" aria-label="Scan QR Code">
            <span class="material-symbols-rounded menu-icon">qr_code_scanner</span>
            <h2>Scan QR Code</h2>
            <p>Use the QR code from your booking confirmation</p>
          </button>
          <button class="menu-card" (click)="view.set('manual')" aria-label="Enter Reference">
            <span class="material-symbols-rounded menu-icon">keyboard</span>
            <h2>Enter Reference</h2>
            <p>Type your booking reference number</p>
          </button>
          <button class="menu-card walkin" (click)="view.set('walkin')" aria-label="Walk-in queue">
            <span class="material-symbols-rounded menu-icon">directions_walk</span>
            <h2>Walk-In</h2>
            <p>No appointment? Join the queue now</p>
          </button>
        </div>
        <button class="back-btn" (click)="view.set('idle')">
          <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
          Back to Start
        </button>
      </div>
    }

    <!-- QR Scan Screen -->
    @if (view() === 'qr') {
      <div class="kiosk-screen">
        <div class="kiosk-header">
          <h1>Scan QR Code</h1>
          <p>Hold your QR code up to the camera</p>
        </div>
        <div class="camera-placeholder">
          <div class="camera-frame">
            <div class="corner tl"></div>
            <div class="corner tr"></div>
            <div class="corner bl"></div>
            <div class="corner br"></div>
            <span class="camera-text">
              <span class="material-symbols-rounded" style="font-size: 32px;">photo_camera</span>
              Camera Feed
            </span>
          </div>
          <div class="scan-line"></div>
        </div>
        <button class="btn btn-accent btn-lg sim-btn" (click)="simulateScan()">
          Simulate Scan
          <span class="material-symbols-rounded" style="font-size: 18px;">check</span>
        </button>
        <button class="back-btn" (click)="view.set('menu')">
          <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
          Back to Menu
        </button>
      </div>
    }

    <!-- Manual Entry Screen -->
    @if (view() === 'manual') {
      <div class="kiosk-screen">
        <div class="kiosk-header">
          <h1>Enter Reference Number</h1>
          <p>Type your booking reference below</p>
        </div>
        <div class="manual-input-area">
          <input type="text"
                 class="ref-input"
                 [value]="refInput()"
                 (input)="refInput.set(asInput($event).value)"
                 placeholder="AQS-2026-XXXX"
                 autofocus />
          <div class="keypad">
            @for (key of keypadKeys; track key) {
              <button class="key-btn" (click)="pressKey(key)">{{ key }}</button>
            }
          </div>
        </div>
        <button class="btn btn-accent btn-lg sim-btn" [disabled]="!refInput()" (click)="submitRef()">
          Check In
          <span class="material-symbols-rounded" style="font-size: 18px;">arrow_forward</span>
        </button>
        <button class="back-btn" (click)="view.set('menu')">
          <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
          Back to Menu
        </button>
      </div>
    }

    <!-- Walk-In Screen -->
    @if (view() === 'walkin') {
      <div class="kiosk-screen">
        <div class="kiosk-header">
          <h1>Select Your Service</h1>
          <p>What do you need help with today?</p>
        </div>
        <div class="walkin-grid">
          @for (svc of queueService.services(); track svc.id) {
            @if (svc.walkInsEnabled) {
              <button class="walkin-card" [class.selected]="selectedWalkinService() === svc.id"
                      (click)="selectedWalkinService.set(svc.id)">
                <span class="material-symbols-rounded walkin-icon">{{ svc.icon }}</span>
                <h3>{{ svc.name }}</h3>
                <p>~{{ svc.avgDuration }} min</p>
              </button>
            }
          }
        </div>
        <button class="btn btn-accent btn-lg sim-btn" [disabled]="!selectedWalkinService()" (click)="walkinCheckIn()">
          Join Queue
          <span class="material-symbols-rounded" style="font-size: 18px;">arrow_forward</span>
        </button>
        <button class="back-btn" (click)="view.set('menu')">
          <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
          Back to Menu
        </button>
      </div>
    }

    <!-- Confirmation Screen -->
    @if (view() === 'confirm') {
      <div class="kiosk-screen confirm-screen">
        <div class="confirm-glow">
          <div class="ticket-number mono">{{ confirmedTicket() }}</div>
        </div>
        <h1>You're Checked In!</h1>
        <div class="confirm-info">
          <div class="info-row">
            <span class="info-label">Queue Position</span>
            <span class="info-value">#{{ queuePosition() }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estimated Wait</span>
            <span class="info-value">~{{ estimatedWait() }} min</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">{{ confirmedService() }}</span>
          </div>
        </div>
        <p class="confirm-hint">Please wait for your number to be called on the display</p>
        <button class="btn btn-outline btn-lg done-btn" (click)="view.set('idle')">Done</button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; margin: -24px -28px; }

    .kiosk-idle {
      height: 100%;
      background: linear-gradient(135deg, var(--secondary-focus) 0%, var(--secondary) 40%, var(--primary) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
    }
    .idle-content { text-align: center; color: var(--primary-content); }
    .idle-logo { margin-bottom: 24px; }
    .idle-title { font-size: 48px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
    .idle-subtitle { font-size: 18px; opacity: 0.7; margin-bottom: 32px; }
    .idle-divider { width: 60px; height: 3px; background: var(--accent); margin: 0 auto 32px; border-radius: 2px; }
    .idle-cta { font-size: 20px; opacity: 0.6; animation: breathe 3s ease-in-out infinite; }
    .idle-pulse {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: var(--accent);
      margin: 24px auto 0;
      animation: pulse 2s ease-in-out infinite;
    }

    .kiosk-screen {
      height: 100%;
      background: linear-gradient(180deg, var(--secondary-focus) 0%, var(--secondary) 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 40px 32px;
      color: var(--secondary-content);
      overflow-y: auto;
    }
    .kiosk-header { text-align: center; margin-bottom: 36px; }
    .kiosk-header h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .kiosk-header p { font-size: 16px; opacity: 0.6; }

    .menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 780px; }
    .menu-card {
      background: rgba(255,255,255,0.06);
      border: 1.5px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 40px 24px;
      text-align: center;
      color: var(--secondary-content);
      cursor: pointer;
      transition: all 0.25s;
    }
    .menu-card:hover { background: rgba(255,255,255,0.1); border-color: var(--accent); transform: translateY(-4px); }
    .menu-icon { font-size: 48px; display: block; margin-bottom: 16px; }
    .menu-card h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .menu-card p { font-size: 13px; opacity: 0.5; }

    .back-btn {
      margin-top: auto;
      padding: 12px 24px;
      background: transparent;
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .back-btn:hover { color: var(--secondary-content); }

    .camera-placeholder {
      width: 360px; height: 360px;
      background: rgba(0,0,0,0.3);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      margin-bottom: 32px;
    }
    .camera-frame {
      width: 240px; height: 240px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .corner {
      position: absolute;
      width: 40px; height: 40px;
      border-color: var(--accent);
      border-style: solid;
      border-width: 0;
    }
    .corner.tl { top: 0; left: 0; border-top-width: 3px; border-left-width: 3px; border-top-left-radius: 8px; }
    .corner.tr { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; border-top-right-radius: 8px; }
    .corner.bl { bottom: 0; left: 0; border-bottom-width: 3px; border-left-width: 3px; border-bottom-left-radius: 8px; }
    .corner.br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-bottom-right-radius: 8px; }
    .camera-text { color: rgba(255,255,255,0.3); font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .scan-line {
      position: absolute;
      top: 30%;
      left: 15%;
      right: 15%;
      height: 2px;
      background: var(--accent);
      animation: scanMove 2s ease-in-out infinite;
      box-shadow: 0 0 12px var(--accent);
    }
    @keyframes scanMove {
      0%, 100% { top: 25%; }
      50% { top: 65%; }
    }

    .sim-btn { min-height: 56px; min-width: 260px; margin-bottom: 16px; }
    .sim-btn:disabled { opacity: 0.35; }

    .manual-input-area { width: 100%; max-width: 420px; margin-bottom: 24px; }
    .ref-input {
      width: 100%;
      padding: 16px 20px;
      font-size: 24px;
      text-align: center;
      background: rgba(255,255,255,0.08);
      border: 2px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      color: var(--secondary-content);
      font-family: 'Roboto Mono', monospace;
      margin-bottom: 20px;
    }
    .ref-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px hsla(156, 57%, 48%, 0.2); }
    .ref-input::placeholder { color: rgba(255,255,255,0.25); }
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .key-btn {
      padding: 14px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: var(--secondary-content);
      font-size: 20px;
      font-weight: 600;
      min-height: 56px;
    }
    .key-btn:hover { background: rgba(255,255,255,0.15); }

    .walkin-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      width: 100%;
      max-width: 720px;
      margin-bottom: 28px;
    }
    .walkin-card {
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 28px 16px;
      text-align: center;
      color: var(--secondary-content);
      cursor: pointer;
      transition: all 0.2s;
    }
    .walkin-card:hover { border-color: var(--accent); }
    .walkin-card.selected { border-color: var(--accent); background: hsla(156, 57%, 48%, 0.15); }
    .walkin-icon { font-size: 36px; display: block; margin-bottom: 10px; }
    .walkin-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .walkin-card p { font-size: 12px; opacity: 0.5; }

    .confirm-screen { justify-content: center; }
    .confirm-glow {
      animation: glow 2s ease-in-out infinite;
      border-radius: 20px;
      padding: 4px;
      margin-bottom: 24px;
    }
    .ticket-number {
      font-size: 80px;
      font-weight: 700;
      color: var(--accent);
      text-shadow: 0 0 40px hsla(156, 57%, 48%, 0.5);
      padding: 24px 48px;
      background: hsla(156, 57%, 48%, 0.08);
      border: 2px solid hsla(156, 57%, 48%, 0.3);
      border-radius: 20px;
    }
    .confirm-screen h1 { font-size: 32px; margin-bottom: 28px; }
    .confirm-info {
      background: rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 24px 32px;
      width: 100%;
      max-width: 400px;
      margin-bottom: 24px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { opacity: 0.5; }
    .info-value { font-weight: 700; color: var(--accent); }
    .confirm-hint { opacity: 0.4; font-size: 14px; margin-bottom: 32px; }
    .done-btn { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); }
    .done-btn:hover { border-color: var(--secondary-content); color: var(--secondary-content); }
  `]
})
export class KioskComponent {
  readonly queueService = inject(QueueService);

  readonly view = signal<KioskView>('idle');
  readonly refInput = signal('AQS-2026-');
  readonly selectedWalkinService = signal<string | null>(null);
  readonly confirmedTicket = signal('');
  readonly queuePosition = signal(0);
  readonly estimatedWait = signal(0);
  readonly confirmedService = signal('');

  readonly keypadKeys = ['1','2','3','4','5','6','7','8','9','C','0','DEL'];

  asInput(event: Event): HTMLInputElement {
    return event.target as HTMLInputElement;
  }

  pressKey(key: string): void {
    if (key === 'C') {
      this.refInput.set('AQS-2026-');
    } else if (key === 'DEL') {
      const val = this.refInput();
      if (val.length > 9) this.refInput.set(val.slice(0, -1));
    } else {
      this.refInput.update(v => v + key);
    }
  }

  simulateScan(): void {
    this.showConfirmation('Vital Records', 'vital');
  }

  submitRef(): void {
    this.showConfirmation('Property Documents', 'property');
  }

  walkinCheckIn(): void {
    const svcId = this.selectedWalkinService();
    if (!svcId) return;
    const svc = this.queueService.services().find(s => s.id === svcId);
    this.showConfirmation(svc?.name ?? 'General', svcId);
  }

  private showConfirmation(serviceName: string, serviceId: string): void {
    const item = this.queueService.addToQueue('Walk-In Customer', serviceId, '', '');
    this.confirmedTicket.set(item.ticket);
    this.confirmedService.set(serviceName);
    const waiting = this.queueService.queue().filter(q => q.status === 'waiting');
    this.queuePosition.set(waiting.length);
    const svc = this.queueService.services().find(s => s.id === serviceId);
    this.estimatedWait.set(waiting.length * (svc?.avgDuration ?? 15));
    this.view.set('confirm');
  }
}
