import { Component, inject, signal, computed } from '@angular/core';
import { QueueService } from '../services/queue.service';

@Component({
  selector: 'app-staff',
  standalone: true,
  template: `
    <div class="staff-dashboard">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="agent-info">
          <div class="agent-avatar">MC</div>
          <div>
            <div class="agent-name">Maria Chen</div>
            <div class="agent-counter">Counter 3</div>
          </div>
        </div>
        <div class="status-right">
          <span class="badge" [class.badge-success]="!isPaused()" [class.badge-warning]="isPaused()">
            {{ isPaused() ? 'Paused' : 'Active' }}
          </span>
          <button class="btn" [class.btn-outline]="!isPaused()" [class.btn-error]="isPaused()"
                  (click)="togglePause()">
            <span class="material-symbols-rounded" style="font-size: 18px;">
              {{ isPaused() ? 'play_arrow' : 'pause' }}
            </span>
            {{ isPaused() ? 'Resume' : 'Pause' }}
          </button>
        </div>
      </div>

      <div class="dashboard-body">
        <!-- Queue List -->
        <div class="queue-panel">
          <div class="panel-header">
            <h3>Queue</h3>
            <span class="count-badge">{{ waitingItems().length }}</span>
          </div>
          <div class="queue-list">
            @for (item of waitingItems(); track item.ticket) {
              <div class="queue-item" [class.next]="$first">
                <div class="qi-ticket mono">{{ item.ticket }}</div>
                <div class="qi-info">
                  <div class="qi-name">{{ item.name }}</div>
                  <div class="qi-service">{{ item.service }}</div>
                </div>
                <div class="qi-wait">{{ getWaitTime(item.checkInTime) }}m</div>
              </div>
            }
            @if (waitingItems().length === 0) {
              <div class="empty-state">
                <p>No customers waiting</p>
              </div>
            }
          </div>
        </div>

        <!-- Main Work Area -->
        <div class="work-area">
          <!-- Current Customer Card -->
          <div class="current-card card">
            @if (currentCustomer()) {
              <div class="current-header">
                <span class="label">Currently Serving</span>
                <span class="current-ticket mono">{{ currentCustomer()!.ticket }}</span>
              </div>
              <div class="current-body">
                <div class="current-name">{{ currentCustomer()!.name }}</div>
                <div class="current-service">{{ currentCustomer()!.service }}</div>
                <div class="current-refs">
                  <span class="badge badge-primary">{{ currentCustomer()!.reference }}</span>
                  <span class="badge badge-info">{{ currentCustomer()!.jediRef }}</span>
                </div>
              </div>
            } @else {
              <div class="no-customer">
                <span class="material-symbols-rounded" style="font-size: 40px; margin-bottom: 12px; display: block; color: var(--neutral);">waving_hand</span>
                <p>No customer currently being served</p>
              </div>
            }
            <button class="btn btn-primary btn-lg call-next-btn" (click)="callNext()"
                    [disabled]="waitingItems().length === 0" aria-label="Call next customer">
              <span class="material-symbols-rounded" style="font-size: 20px;">campaign</span>
              Call Next
            </button>
          </div>

          <!-- Action Buttons -->
          @if (currentCustomer()) {
            <div class="action-row">
              <button class="btn btn-success action-btn" (click)="complete()" aria-label="Complete service">
                <span class="material-symbols-rounded" style="font-size: 18px;">check</span>
                Complete
              </button>
              <button class="btn btn-error action-btn" (click)="noShow()" aria-label="Mark no-show">
                <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
                No-Show
              </button>
              <button class="btn btn-outline action-btn" (click)="showTransfer.set(!showTransfer())" aria-label="Transfer customer">
                <span class="material-symbols-rounded" style="font-size: 18px;">swap_horiz</span>
                Transfer
              </button>
              <button class="btn btn-outline action-btn" (click)="showNotes.set(!showNotes())" aria-label="Add notes">
                <span class="material-symbols-rounded" style="font-size: 18px;">edit_note</span>
                Notes
              </button>
            </div>
          }

          <!-- Transfer Panel -->
          @if (showTransfer() && currentCustomer()) {
            <div class="card transfer-panel" style="animation: fadeIn 0.2s ease">
              <h4>Transfer to Counter</h4>
              <div class="counter-options">
                @for (c of availableCounters(); track c.id) {
                  <button class="btn btn-outline" (click)="transferTo(c.id)">
                    Counter {{ c.id }} - {{ c.agent }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Notes Panel -->
          @if (showNotes()) {
            <div class="card notes-panel" style="animation: fadeIn 0.2s ease">
              <h4>Customer Notes</h4>
              <textarea rows="3" placeholder="Add notes about this interaction..."></textarea>
              <button class="btn btn-primary" style="margin-top: 8px;">Save Note</button>
            </div>
          }

          <!-- Stats Row -->
          <div class="stats-row">
            <div class="stat-card card">
              <div class="stat-value">{{ servedCount }}</div>
              <div class="stat-label">Served Today</div>
            </div>
            <div class="stat-card card">
              <div class="stat-value">{{ waitingItems().length }}</div>
              <div class="stat-label">In Queue</div>
            </div>
            <div class="stat-card card">
              <div class="stat-value">8.5m</div>
              <div class="stat-label">Avg Service</div>
            </div>
            <div class="stat-card card">
              <div class="stat-value">{{ noShowCount() }}</div>
              <div class="stat-label">No-Shows</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .staff-dashboard { display: flex; flex-direction: column; height: calc(100vh - 112px); }
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--base-100);
      border-radius: var(--radius);
      padding: 12px 20px;
      margin-bottom: 20px;
      box-shadow: var(--shadow);
    }
    .agent-info { display: flex; align-items: center; gap: 12px; }
    .agent-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--primary); color: var(--primary-content);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px;
    }
    .agent-name { font-weight: 700; font-size: 15px; }
    .agent-counter { font-size: 12px; color: var(--neutral); }
    .status-right { display: flex; align-items: center; gap: 12px; }

    .dashboard-body { display: flex; gap: 20px; flex: 1; min-height: 0; }

    .queue-panel {
      width: 320px;
      flex-shrink: 0;
      background: var(--base-100);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--base-200);
    }
    .panel-header h3 { font-size: 15px; font-weight: 700; }
    .count-badge {
      background: var(--primary);
      color: var(--primary-content);
      width: 24px; height: 24px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .queue-list { flex: 1; overflow-y: auto; padding: 8px; }
    .queue-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.15s;
    }
    .queue-item:hover { background: var(--primary-wash); }
    .queue-item.next { background: var(--warn-light); border: 1px solid var(--warn); }
    .qi-ticket { font-weight: 700; font-size: 15px; color: var(--primary); min-width: 50px; }
    .qi-info { flex: 1; }
    .qi-name { font-weight: 600; font-size: 13px; }
    .qi-service { font-size: 11px; color: var(--neutral); }
    .qi-wait { font-size: 12px; color: var(--neutral); font-weight: 600; }
    .empty-state { padding: 40px 20px; text-align: center; color: var(--neutral); }

    .work-area { flex: 1; display: flex; flex-direction: column; gap: 16px; min-height: 0; overflow-y: auto; }

    .current-card { padding: 24px; }
    .current-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .current-header .label { font-size: 12px; color: var(--neutral); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .current-ticket { font-size: 28px; font-weight: 700; color: var(--primary); }
    .current-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .current-service { color: var(--neutral); margin-bottom: 12px; }
    .current-refs { display: flex; gap: 8px; margin-bottom: 20px; }
    .no-customer { text-align: center; padding: 24px; color: var(--neutral); }
    .call-next-btn { width: 100%; min-height: 48px; font-size: 16px; }

    .action-row { display: flex; gap: 10px; }
    .action-btn { flex: 1; min-height: 44px; }

    .transfer-panel { padding: 16px; }
    .transfer-panel h4 { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
    .counter-options { display: flex; gap: 8px; flex-wrap: wrap; }

    .notes-panel { padding: 16px; }
    .notes-panel h4 { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
    .notes-panel textarea { width: 100%; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat-card { text-align: center; padding: 16px; }
    .stat-value { font-size: 24px; font-weight: 700; color: var(--primary); }
    .stat-label { font-size: 11px; color: var(--neutral); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
  `]
})
export class StaffComponent {
  readonly queueService = inject(QueueService);

  readonly showTransfer = signal(false);
  readonly showNotes = signal(false);
  readonly servedCount = 23;

  readonly isPaused = computed(() => {
    const c = this.queueService.counters().find(c => c.id === 3);
    return c?.status === 'paused';
  });

  readonly currentCustomer = computed(() => {
    const counter = this.queueService.counters().find(c => c.id === 3);
    if (!counter?.currentTicket) return null;
    return this.queueService.queue().find(q => q.ticket === counter.currentTicket) ?? null;
  });

  readonly noShowCount = computed(() =>
    this.queueService.queue().filter(q => q.status === 'no-show').length
  );

  waitingItems() {
    return this.queueService.queue().filter(q => q.status === 'waiting');
  }

  availableCounters() {
    return this.queueService.counters().filter(c => c.id !== 3 && c.status === 'active');
  }

  getWaitTime(checkIn: Date): number {
    return Math.round((new Date().getTime() - checkIn.getTime()) / 60000);
  }

  callNext(): void {
    this.queueService.callNext(3);
    this.showTransfer.set(false);
    this.showNotes.set(false);
  }

  complete(): void {
    const ticket = this.currentCustomer()?.ticket;
    if (ticket) this.queueService.markComplete(ticket);
    this.showTransfer.set(false);
    this.showNotes.set(false);
  }

  noShow(): void {
    const ticket = this.currentCustomer()?.ticket;
    if (ticket) this.queueService.markNoShow(ticket);
    this.showTransfer.set(false);
    this.showNotes.set(false);
  }

  transferTo(counterId: number): void {
    const ticket = this.currentCustomer()?.ticket;
    if (ticket) this.queueService.transfer(ticket, counterId);
    this.showTransfer.set(false);
  }

  togglePause(): void {
    this.queueService.togglePause(3);
  }
}
