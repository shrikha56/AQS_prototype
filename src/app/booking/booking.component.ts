import { Component, inject, signal } from '@angular/core';
import { QueueService } from '../services/queue.service';
import { CvService } from '../services/cv.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  template: `
    <div class="booking">
      <!-- Step Indicator -->
      <div class="steps">
        @for (s of stepLabels; track s; let i = $index) {
          <div class="step" [class.active]="step() === i + 1" [class.done]="step() > i + 1">
            <div class="step-dot">
              @if (step() > i + 1) {
                <span class="material-symbols-rounded" style="font-size: 16px;">check</span>
              }
              @else { {{ i + 1 }} }
            </div>
            <span class="step-label">{{ s }}</span>
          </div>
          @if (i < stepLabels.length - 1) {
            <div class="step-line" [class.active]="step() > i + 1"></div>
          }
        }
      </div>

      <!-- Step 1: Location -->
      @if (step() === 1) {
        <div class="step-content" style="animation: fadeIn 0.3s ease">
          <h2>Select Location</h2>
          <p class="subtitle">Choose your preferred LA County RR/CC office</p>
          <div class="location-grid">
            @for (loc of queueService.locations(); track loc.id) {
              <div class="location-card" [class.selected]="selectedLocation() === loc.id"
                   (click)="selectedLocation.set(loc.id)">
                <span class="material-symbols-rounded loc-icon">location_on</span>
                <div class="loc-info">
                  <h3>{{ loc.name }}</h3>
                  <p>{{ loc.address }}</p>
                </div>
                <div class="loc-wait">
                  <span class="wait-badge" [class.low]="getCvWait(loc.id) < 10" [class.med]="getCvWait(loc.id) >= 10 && getCvWait(loc.id) < 20" [class.high]="getCvWait(loc.id) >= 20">
                    ~{{ getCvWait(loc.id) }} min
                  </span>
                  <span class="cv-label">
                    <span class="material-symbols-rounded" style="font-size: 11px;">visibility</span>
                    AI Predicted
                  </span>
                </div>
              </div>
            }
          </div>
          <div class="walkin-banner">
            <span class="material-symbols-rounded" style="font-size: 28px;">directions_walk</span>
            <div>
              <strong>Walk-in Welcome</strong>
              <p>No appointment? Visit any office during business hours. Wait times may vary.</p>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-primary btn-lg" [disabled]="!selectedLocation()" (click)="step.set(2)">
              Continue
              <span class="material-symbols-rounded" style="font-size: 18px;">arrow_forward</span>
            </button>
          </div>
        </div>
      }

      <!-- Step 2: Service -->
      @if (step() === 2) {
        <div class="step-content" style="animation: fadeIn 0.3s ease">
          <h2>Select Service</h2>
          <p class="subtitle">What do you need help with?</p>
          <div class="service-grid">
            @for (svc of queueService.services(); track svc.id) {
              <div class="service-card" [class.selected]="selectedService() === svc.id"
                   (click)="selectedService.set(svc.id)">
                <span class="material-symbols-rounded svc-icon">{{ svc.icon }}</span>
                <h3>{{ svc.name }}</h3>
                <p>~{{ svc.avgDuration }} min</p>
              </div>
            }
          </div>
          <div class="actions">
            <button class="btn btn-outline" (click)="step.set(1)">
              <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
              Back
            </button>
            <button class="btn btn-primary btn-lg" [disabled]="!selectedService()" (click)="step.set(3)">
              Continue
              <span class="material-symbols-rounded" style="font-size: 18px;">arrow_forward</span>
            </button>
          </div>
        </div>
      }

      <!-- Step 3: Date & Time -->
      @if (step() === 3) {
        <div class="step-content" style="animation: fadeIn 0.3s ease">
          <h2>Select Date &amp; Time</h2>
          <p class="subtitle">Choose your preferred appointment slot</p>
          <div class="datetime-row">
            <div class="calendar-card card">
              <div class="cal-header">
                <button class="btn btn-ghost" aria-label="Previous month" (click)="prevMonth()">
                  <span class="material-symbols-rounded" style="font-size: 18px;">chevron_left</span>
                </button>
                <h3>{{ calendarMonthLabel() }}</h3>
                <button class="btn btn-ghost" aria-label="Next month" (click)="nextMonth()">
                  <span class="material-symbols-rounded" style="font-size: 18px;">chevron_right</span>
                </button>
              </div>
              <div class="cal-grid">
                @for (d of ['Mo','Tu','We','Th','Fr','Sa','Su']; track d) {
                  <div class="cal-day-label">{{ d }}</div>
                }
                @for (day of calendarDays(); track $index) {
                  @if (day === 0) {
                    <div class="cal-day empty"></div>
                  } @else {
                    <div class="cal-day"
                         [class.selected]="selectedDate() === day"
                         [class.disabled]="isDayDisabled(day)"
                         (click)="selectDay(day)">
                      {{ day }}
                    </div>
                  }
                }
              </div>
            </div>
            <div class="time-card card">
              <h3>Available Times</h3>
              @if (selectedDate()) {
                <div class="time-grid">
                  @for (t of timeSlots; track t) {
                    <button class="time-slot"
                            [class.selected]="selectedTime() === t"
                            (click)="selectedTime.set(t)">
                      {{ t }}
                    </button>
                  }
                </div>
              } @else {
                <p class="hint">Select a date first</p>
              }
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-outline" (click)="step.set(2)">
              <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
              Back
            </button>
            <button class="btn btn-primary btn-lg" [disabled]="!selectedDate() || !selectedTime()" (click)="step.set(4)">
              Continue
              <span class="material-symbols-rounded" style="font-size: 18px;">arrow_forward</span>
            </button>
          </div>
        </div>
      }

      <!-- Step 4: Customer Details -->
      @if (step() === 4) {
        <div class="step-content" style="animation: fadeIn 0.3s ease">
          <h2>Your Details</h2>
          <p class="subtitle">Please confirm your information</p>
          <div class="form-card card">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" [value]="customerName()" (input)="customerName.set(asInput($event).value)" placeholder="Enter your full name" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" [value]="customerPhone()" (input)="customerPhone.set(asInput($event).value)" placeholder="(213) 555-0000" />
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" [value]="customerEmail()" (input)="customerEmail.set(asInput($event).value)" placeholder="your@email.com" />
              </div>
            </div>
            <div class="form-group">
              <label>Additional Notes (Optional)</label>
              <textarea rows="3" placeholder="Any special requirements or notes..."></textarea>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-outline" (click)="step.set(3)">
              <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
              Back
            </button>
            <button class="btn btn-primary btn-lg" [disabled]="!customerName()" (click)="confirmBooking()">
              Confirm Booking
              <span class="material-symbols-rounded" style="font-size: 18px;">check</span>
            </button>
          </div>
        </div>
      }

      <!-- Step 5: Confirmation -->
      @if (step() === 5) {
        <div class="step-content confirmation" style="animation: fadeIn 0.3s ease">
          <div class="confirm-icon">
            <span class="material-symbols-rounded" style="font-size: 32px;">check_circle</span>
          </div>
          <h2>Booking Confirmed!</h2>
          <p class="subtitle">Your appointment has been scheduled</p>
          <div class="confirm-card card">
            <div class="ref-number mono">{{ bookingRef() }}</div>
            <div class="confirm-details">
              <div class="detail-row">
                <span class="label">Service</span>
                <span class="value">{{ getServiceName(selectedService()) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Location</span>
                <span class="value">{{ getLocationName(selectedLocation()) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date &amp; Time</span>
                <span class="value">March {{ selectedDate() }}, 2026 at {{ selectedTime() }}</span>
              </div>
              <div class="detail-row">
                <span class="label">JEDI Reference</span>
                <span class="value mono">{{ jediRef() }}</span>
              </div>
              <div class="detail-row ai-row">
                <span class="label">
                  <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">visibility</span>
                  Estimated Wait (AI)
                </span>
                <span class="value">~{{ getCvWait(selectedLocation()) }} min</span>
              </div>
            </div>
            <div class="qr-placeholder">
              <div class="qr-box">
                <span class="material-symbols-rounded" style="font-size: 48px;">qr_code_2</span>
                <p>QR Code</p>
              </div>
              <p class="qr-hint">Show this QR code at the kiosk for quick check-in</p>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-outline" (click)="resetBooking()">Book Another</button>
            <button class="btn btn-primary">
              <span class="material-symbols-rounded" style="font-size: 18px;">download</span>
              Download Confirmation
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .booking { max-width: 900px; margin: 0 auto; }
    .steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 32px;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .step-dot {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--base-200);
      color: var(--neutral);
      font-weight: 700;
      font-size: 13px;
      transition: all 0.3s;
    }
    .step.active .step-dot {
      background: var(--primary);
      color: var(--primary-content);
      box-shadow: 0 0 0 4px var(--primary-wash);
    }
    .step.done .step-dot {
      background: var(--success);
      color: var(--success-content);
    }
    .step-label { font-size: 11px; color: var(--neutral); font-weight: 600; }
    .step.active .step-label { color: var(--primary); }
    .step-line {
      flex: 1;
      max-width: 64px;
      height: 2px;
      background: var(--base-300);
      margin-bottom: 18px;
      border-radius: 1px;
      transition: background 0.3s;
    }
    .step-line.active { background: var(--success); }
    h2 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: var(--neutral); margin-bottom: 24px; }

    .location-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .location-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: var(--base-100);
      border: 2px solid var(--base-200);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
    }
    .location-card:hover { border-color: var(--primary); }
    .location-card.selected { border-color: var(--primary); background: var(--primary-wash); }
    .loc-icon { font-size: 28px; color: var(--primary); }
    .loc-info { flex: 1; }
    .loc-info h3 { font-size: 15px; font-weight: 600; }
    .loc-info p { font-size: 12px; color: var(--neutral); }
    .wait-badge {
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
    }
    .wait-badge.low { background: var(--success-light); color: var(--success); }
    .wait-badge.med { background: var(--warn-light); color: var(--warn); }
    .wait-badge.high { background: var(--error-light); color: var(--error); }
    .cv-label {
      display: flex; align-items: center; gap: 3px;
      font-size: 9px; color: var(--neutral);
      margin-top: 4px; justify-content: flex-end;
    }
    .loc-wait { display: flex; flex-direction: column; align-items: flex-end; }
    .ai-row { background: var(--primary-wash); border-radius: 8px; padding: 10px 12px !important; }
    .ai-row .label { color: var(--primary); }

    .walkin-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--info-light);
      color: var(--info);
      border-radius: var(--radius);
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .walkin-banner div { font-size: 13px; color: var(--base-content); }
    .walkin-banner strong { font-size: 14px; }
    .walkin-banner p { color: var(--neutral); margin-top: 2px; }

    .service-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .service-card {
      padding: 20px 16px;
      background: var(--base-100);
      border: 2px solid var(--base-200);
      border-radius: var(--radius);
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .service-card:hover { border-color: var(--primary); transform: translateY(-2px); }
    .service-card.selected { border-color: var(--primary); background: var(--primary-wash); }
    .svc-icon { font-size: 32px; display: block; margin-bottom: 8px; color: var(--primary); }
    .service-card h3 { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .service-card p { font-size: 11px; color: var(--neutral); }

    .datetime-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .cal-header h3 { font-size: 15px; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
    .cal-day-label { font-size: 11px; font-weight: 600; color: var(--neutral); padding: 4px; }
    .cal-day {
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .cal-day:not(.empty):not(.disabled):hover { background: var(--primary-wash); }
    .cal-day.selected { background: var(--primary); color: var(--primary-content); }
    .cal-day.disabled { color: var(--base-300); cursor: default; }
    .cal-day.empty { cursor: default; }

    .time-card h3 { font-size: 15px; margin-bottom: 16px; }
    .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .time-slot {
      padding: 10px;
      border: 1.5px solid var(--base-200);
      border-radius: var(--radius-sm);
      background: var(--base-100);
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .time-slot:hover { border-color: var(--primary); }
    .time-slot.selected { background: var(--primary); color: var(--primary-content); border-color: var(--primary); }
    .hint { color: var(--neutral); font-size: 13px; text-align: center; margin-top: 40px; }

    .form-card { max-width: 600px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px; }
    .form-group input, .form-group textarea { width: 100%; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    button:disabled { opacity: 0.4; cursor: not-allowed; }

    .confirmation { text-align: center; }
    .confirm-icon {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: var(--success-light);
      color: var(--success);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .confirm-card {
      max-width: 480px;
      margin: 24px auto 0;
      text-align: left;
    }
    .ref-number {
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
      padding: 16px;
      background: var(--primary-wash);
      border-radius: var(--radius-sm);
      margin-bottom: 20px;
    }
    .confirm-details { margin-bottom: 20px; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--base-200);
    }
    .detail-row .label { color: var(--neutral); }
    .detail-row .value { font-weight: 600; }
    .qr-placeholder { text-align: center; padding: 20px; }
    .qr-box {
      width: 120px; height: 120px;
      border: 2px dashed var(--base-300);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto 8px;
      color: var(--neutral);
    }
    .qr-box p { font-size: 11px; }
    .qr-hint { font-size: 12px; color: var(--neutral); }
    .confirmation .actions { justify-content: center; }
  `]
})
export class BookingComponent {
  readonly queueService = inject(QueueService);
  private readonly _cvService = inject(CvService);

  readonly step = signal(1);
  readonly selectedLocation = signal<string | null>(null);
  readonly selectedService = signal<string | null>(null);
  readonly selectedDate = signal<number | null>(null);
  readonly selectedTime = signal<string | null>(null);
  readonly customerName = signal('Alex Johnson');
  readonly customerPhone = signal('(213) 555-0192');
  readonly customerEmail = signal('alex.johnson@email.com');
  readonly bookingRef = signal('');
  readonly jediRef = signal('');
  readonly calendarMonth = signal(2);
  readonly calendarYear = signal(2026);

  readonly stepLabels = ['Location', 'Service', 'Date & Time', 'Details', 'Confirmation'];

  readonly timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  ];

  calendarMonthLabel(): string {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[this.calendarMonth()]} ${this.calendarYear()}`;
  }

  calendarDays(): number[] {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days: number[] = [];
    for (let i = 0; i < offset; i++) days.push(0);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }

  isDayDisabled(day: number): boolean {
    const d = new Date(this.calendarYear(), this.calendarMonth(), day);
    const dow = d.getDay();
    return dow === 0 || dow === 6 || d < new Date(2026, 2, 16);
  }

  selectDay(day: number): void {
    if (!this.isDayDisabled(day)) {
      this.selectedDate.set(day);
    }
  }

  prevMonth(): void {
    if (this.calendarMonth() === 0) {
      this.calendarMonth.set(11);
      this.calendarYear.update(y => y - 1);
    } else {
      this.calendarMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.calendarMonth() === 11) {
      this.calendarMonth.set(0);
      this.calendarYear.update(y => y + 1);
    } else {
      this.calendarMonth.update(m => m + 1);
    }
  }

  asInput(event: Event): HTMLInputElement {
    return event.target as HTMLInputElement;
  }

  getServiceName(id: string | null): string {
    return this.queueService.services().find(s => s.id === id)?.name ?? '';
  }

  getLocationName(id: string | null): string {
    return this.queueService.locations().find(l => l.id === id)?.name ?? '';
  }

  confirmBooking(): void {
    const ref = `AQS-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const jedi = `JEDI-${(this.selectedService() ?? 'GN').substring(0, 2).toUpperCase()}-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    this.bookingRef.set(ref);
    this.jediRef.set(jedi);
    this.step.set(5);
  }

  getCvWait(location_id: string | null): number {
    if (!location_id) return 0;
    const pred = this._cvService.getPredictionForLocation(location_id);
    return pred?.predicted_wait_minutes ?? 10;
  }

  resetBooking(): void {
    this.step.set(1);
    this.selectedLocation.set(null);
    this.selectedService.set(null);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.bookingRef.set('');
    this.jediRef.set('');
  }
}
