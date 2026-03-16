import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, viewChild } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { QueueService } from '../services/queue.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [TitleCasePipe],
  template: `
    <div class="admin">
      <!-- Top Stats -->
      <div class="stats-row">
        @for (stat of topStats; track stat.label) {
          <div class="stat-card card">
            <div class="stat-header">
              <span class="material-symbols-rounded stat-icon">{{ stat.icon }}</span>
              <span class="stat-change" [class.positive]="stat.changePositive" [class.negative]="!stat.changePositive">
                {{ stat.change }}
              </span>
            </div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        }
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <div class="card chart-card">
          <div class="card-header">
            <h3>Peak Hours</h3>
            <span class="badge badge-info">Today</span>
          </div>
          <canvas #peakChart width="500" height="220"></canvas>
        </div>
        <div class="card chart-card">
          <div class="card-header">
            <h3>Queue Depth</h3>
            <span class="badge badge-info">Real-time</span>
          </div>
          <canvas #depthChart width="500" height="220"></canvas>
        </div>
      </div>

      <!-- Counter Status Grid -->
      <div class="card">
        <div class="card-header">
          <h3>Counter Status</h3>
          <button class="btn btn-outline btn-sm" (click)="exportCSV()" aria-label="Export CSV">
            <span class="material-symbols-rounded" style="font-size: 16px;">download</span>
            Export CSV
          </button>
        </div>
        <div class="counter-grid">
          @for (counter of queueService.counters(); track counter.id) {
            <div class="counter-card" [class.active]="counter.status === 'active'" [class.paused]="counter.status === 'paused'" [class.closed]="counter.status === 'closed'">
              <div class="counter-number">Counter {{ counter.id }}</div>
              <div class="counter-agent">{{ counter.agent }}</div>
              <span class="badge" [class.badge-success]="counter.status === 'active'" [class.badge-warning]="counter.status === 'paused'" [class.badge-error]="counter.status === 'closed'">
                {{ counter.status | titlecase }}
              </span>
              @if (counter.currentTicket) {
                <div class="counter-ticket mono">{{ counter.currentTicket }}</div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Service Config Table -->
      <div class="card">
        <div class="card-header">
          <h3>Service Configuration</h3>
        </div>
        <table class="config-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Avg Duration</th>
              <th>Capacity</th>
              <th>Walk-ins</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (svc of queueService.services(); track svc.id) {
              <tr>
                <td>
                  <span class="material-symbols-rounded svc-icon-sm">{{ svc.icon }}</span>
                  {{ svc.name }}
                </td>
                <td>{{ svc.avgDuration }} min</td>
                <td>{{ svc.capacity }}/day</td>
                <td>
                  <span class="badge" [class.badge-success]="svc.walkInsEnabled" [class.badge-error]="!svc.walkInsEnabled">
                    {{ svc.walkInsEnabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <span class="badge badge-success">Active</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- CSAT Chart -->
      <div class="card">
        <div class="card-header">
          <h3>CSAT by Service</h3>
        </div>
        <div class="csat-bars">
          @for (item of csatData; track item.service) {
            <div class="csat-row">
              <span class="csat-label">{{ item.service }}</span>
              <div class="csat-bar-track">
                <div class="csat-bar-fill" [style.width.%]="item.score"></div>
              </div>
              <span class="csat-score">{{ item.score }}%</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin { display: flex; flex-direction: column; gap: 20px; }
    .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
    .stat-card { padding: 16px 20px; }
    .stat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .stat-icon { font-size: 22px; color: var(--primary); }
    .stat-change { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 100px; }
    .stat-change.positive { background: var(--success-light); color: var(--success); }
    .stat-change.negative { background: var(--error-light); color: var(--error); }
    .stat-value { font-size: 28px; font-weight: 800; color: var(--base-content); }
    .stat-label { font-size: 12px; color: var(--neutral); margin-top: 2px; }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .chart-card { padding: 20px; }
    .chart-card canvas { width: 100%; height: 220px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-header h3 { font-size: 15px; font-weight: 700; }

    .counter-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
    .counter-card {
      padding: 16px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--base-200);
      text-align: center;
    }
    .counter-card.active { border-color: var(--success); background: var(--success-light); }
    .counter-card.paused { border-color: var(--warn); background: var(--warn-light); }
    .counter-card.closed { border-color: var(--error); background: var(--error-light); }
    .counter-number { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    .counter-agent { font-size: 12px; color: var(--neutral); margin-bottom: 8px; }
    .counter-ticket { font-size: 13px; font-weight: 700; color: var(--primary); margin-top: 8px; }

    .config-table {
      width: 100%;
      border-collapse: collapse;
    }
    .config-table th {
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--neutral);
      padding: 10px 16px;
      border-bottom: 2px solid var(--base-200);
    }
    .config-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--base-200);
      font-size: 13px;
    }
    .config-table tr:last-child td { border-bottom: none; }
    .svc-icon-sm { font-size: 18px; vertical-align: middle; margin-right: 8px; color: var(--primary); }

    .csat-bars { display: flex; flex-direction: column; gap: 12px; }
    .csat-row { display: flex; align-items: center; gap: 12px; }
    .csat-label { width: 160px; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .csat-bar-track { flex: 1; height: 24px; background: var(--primary-wash); border-radius: 12px; overflow: hidden; }
    .csat-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary) 0%, var(--primary-focus) 100%);
      border-radius: 12px;
      transition: width 0.8s ease;
    }
    .csat-score { font-weight: 700; font-size: 14px; width: 48px; text-align: right; color: var(--primary); }

    .btn-sm { padding: 6px 14px; font-size: 12px; }

    @media (max-width: 1200px) {
      .stats-row { grid-template-columns: repeat(3, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .counter-grid { grid-template-columns: repeat(3, 1fr); }
    }
  `]
})
export class AdminComponent implements AfterViewInit {
  readonly queueService = inject(QueueService);

  readonly peakChartRef = viewChild<ElementRef<HTMLCanvasElement>>('peakChart');
  readonly depthChartRef = viewChild<ElementRef<HTMLCanvasElement>>('depthChart');

  readonly topStats = [
    { icon: 'schedule', label: 'Waiting', value: '12', change: '+3', changePositive: false },
    { icon: 'person', label: 'Being Served', value: '4', change: '-1', changePositive: true },
    { icon: 'check_circle', label: 'Completed', value: '47', change: '+12', changePositive: true },
    { icon: 'timer', label: 'Avg Wait', value: '14m', change: '-2m', changePositive: true },
    { icon: 'star', label: 'CSAT Score', value: '4.6', change: '+0.2', changePositive: true },
  ];

  readonly csatData = [
    { service: 'Vital Records', score: 92 },
    { service: 'Property Documents', score: 87 },
    { service: 'Marriage License', score: 95 },
    { service: 'Birth Certificate', score: 91 },
    { service: 'Voter Registration', score: 88 },
    { service: 'Business Filing', score: 83 },
    { service: 'Notary Services', score: 90 },
    { service: 'Document Recording', score: 86 },
  ];

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.drawPeakChart();
      this.drawDepthChart();
    }, 100);
  }

  private drawPeakChart(): void {
    const el = this.peakChartRef();
    if (!el) return;
    const canvas = el.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const data = [5, 12, 28, 42, 38, 35, 45, 32, 28, 18, 8];
    const labels = ['7AM','8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM'];
    const maxVal = Math.max(...data);
    const barW = (w - 60) / data.length - 6;
    const chartH = h - 40;

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const neutralColor = getComputedStyle(document.documentElement).getPropertyValue('--neutral').trim();
    const contentColor = getComputedStyle(document.documentElement).getPropertyValue('--base-content').trim();

    data.forEach((val, i) => {
      const barH = (val / maxVal) * (chartH - 20);
      const x = 40 + i * ((w - 60) / data.length) + 3;
      const y = chartH - barH;

      ctx.fillStyle = primaryColor || 'hsl(336, 57%, 48%)';
      ctx.globalAlpha = 0.7 + (val / maxVal) * 0.3;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 4);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = neutralColor || 'hsl(0, 0%, 50%)';
      ctx.font = '10px Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW / 2, h - 5);

      ctx.fillStyle = contentColor || 'hsl(0, 0%, 0%)';
      ctx.font = 'bold 10px Roboto, sans-serif';
      ctx.fillText(String(val), x + barW / 2, y - 6);
    });
  }

  private drawDepthChart(): void {
    const el = this.depthChartRef();
    if (!el) return;
    const canvas = el.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const data = [3, 5, 8, 12, 15, 18, 14, 11, 16, 20, 18, 14, 10, 8, 12, 15, 13, 9, 6, 4];
    const maxVal = Math.max(...data);
    const chartH = h - 30;
    const stepX = (w - 40) / (data.length - 1);

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || 'hsl(156, 57%, 48%)';

    ctx.beginPath();
    ctx.moveTo(20, chartH);
    data.forEach((val, i) => {
      const x = 20 + i * stepX;
      const y = chartH - (val / maxVal) * (chartH - 20);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(20 + (data.length - 1) * stepX, chartH);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, 0, 0, chartH);
    areaGrad.addColorStop(0, 'hsla(156, 57%, 48%, 0.2)');
    areaGrad.addColorStop(1, 'hsla(156, 57%, 48%, 0.02)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    ctx.beginPath();
    data.forEach((val, i) => {
      const x = 20 + i * stepX;
      const y = chartH - (val / maxVal) * (chartH - 20);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    data.forEach((val, i) => {
      const x = 20 + i * stepX;
      const y = chartH - (val / maxVal) * (chartH - 20);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
    });
  }

  exportCSV(): void {
    const headers = 'Ticket,Name,Service,Status,Check-In Time,Counter\n';
    const rows = this.queueService.queue().map(q =>
      `${q.ticket},${q.name},${q.service},${q.status},${q.checkInTime.toISOString()},${q.counter ?? 'N/A'}`
    ).join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aqs-queue-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
