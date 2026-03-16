import { Component, inject, signal, computed, AfterViewInit, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CvService, BusynessLevel, CvPrediction } from '../services/cv.service';

@Component({
  selector: 'app-cv',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="admin">

      <!-- Top Stats (same pattern as dashboard) -->
      <div class="stats-row">
        @for (stat of liveStats(); track stat.label) {
          <div class="stat-card card">
            <div class="stat-header">
              <span class="material-symbols-rounded stat-icon">{{ stat.icon }}</span>
              <span class="stat-change" [class.positive]="stat.positive" [class.negative]="!stat.positive">
                {{ stat.change }}
              </span>
            </div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        }
      </div>

      <!-- Charts Row (same 2-col as dashboard) -->
      <div class="charts-row">
        <div class="card chart-card">
          <div class="card-header">
            <h3>Occupancy Trend</h3>
            <div class="header-controls">
              <select class="ctrl-select" (change)="chart_location.set(asSelect($event).value)">
                <option value="all">All Locations</option>
                @for (loc of cvService.getLocations(); track loc.id) {
                  <option [value]="loc.id">{{ loc.name }}</option>
                }
              </select>
              <span class="badge badge-info">
                <span class="live-dot"></span>
                Live
              </span>
            </div>
          </div>
          <canvas #occupancyChart width="600" height="220"></canvas>
          <div class="chart-legend">
            @for (loc of chartLegend(); track loc.id; let i = $index) {
              <span class="cl-item">
                <span class="cl-dot" [style.background]="chartColors[i % chartColors.length]"></span>
                {{ loc.name }}
              </span>
            }
          </div>
        </div>
        <div class="card chart-card">
          <div class="card-header">
            <h3>Zone Breakdown</h3>
            <select class="ctrl-select" (change)="selected_location.set(asSelect($event).value)">
              @for (loc of cvService.getLocations(); track loc.id) {
                <option [value]="loc.id" [selected]="loc.id === selected_location()">{{ loc.name }}</option>
              }
            </select>
          </div>
          <div class="zone-chart">
            @for (zone of currentHeatmap(); track zone.zone_name) {
              <div class="zone-bar-row">
                <span class="zb-label">{{ zone.zone_name }}</span>
                <div class="zb-track">
                  <div class="zb-fill" [style.width.%]="zone.intensity * 100"
                       [style.background]="getHeatColor(zone.intensity)"></div>
                </div>
                <span class="zb-pct">{{ (zone.intensity * 100) | number:'1.0-0' }}%</span>
              </div>
            }
          </div>
          <div class="sensor-summary">
            <span class="ss-label">Sensors {{ activeLocationCameras() }}/{{ locationCameras().length }}</span>
            <div class="ss-dots">
              @for (cam of locationCameras(); track cam.id) {
                <div class="ss-dot" [class.active]="cam.status === 'active'" [class.offline]="cam.status === 'offline'"
                     [title]="cam.zone + ': ' + (cam.status === 'active' ? cam.people_count + '/' + cam.max_capacity : 'Offline')">
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Location Status Grid (mirrors counter-grid pattern) -->
      <div class="card">
        <div class="card-header">
          <h3>Location Status</h3>
          <div class="header-controls">
            <button class="pill-btn" [class.active]="sort_mode() === 'occupancy'" (click)="sort_mode.set('occupancy')">By Occupancy</button>
            <button class="pill-btn" [class.active]="sort_mode() === 'wait'" (click)="sort_mode.set('wait')">By Wait</button>
          </div>
        </div>
        <div class="loc-grid">
          @for (pred of sortedPredictions(); track pred.location_id) {
            <div class="loc-card" [class.low]="pred.busyness === 'low'" [class.moderate]="pred.busyness === 'moderate'"
                 [class.busy]="pred.busyness === 'busy'" [class.very-busy]="pred.busyness === 'very_busy'">
              <div class="loc-name">{{ pred.location_name }}</div>
              <div class="loc-occ-bar">
                <div class="loc-occ-fill" [class]="'fill-' + pred.busyness"
                     [style.width.%]="(pred.people_count / pred.capacity) * 100"></div>
              </div>
              <div class="loc-metrics">
                <span class="loc-pct">{{ ((pred.people_count / pred.capacity) * 100) | number:'1.0-0' }}%</span>
                <span class="loc-people">{{ pred.people_count }}/{{ pred.capacity }}</span>
              </div>
              <div class="loc-wait-row">
                <span class="material-symbols-rounded" style="font-size: 14px; color: var(--neutral);">schedule</span>
                <span class="loc-wait-val">~{{ pred.predicted_wait_minutes }}m</span>
              </div>
              <span class="badge" [class.badge-success]="pred.busyness === 'low'"
                    [class.badge-warning]="pred.busyness === 'moderate' || pred.busyness === 'busy'"
                    [class.badge-error]="pred.busyness === 'very_busy'">
                {{ formatBusyness(pred.busyness) }}
              </span>
              <div class="loc-trend">
                <span class="material-symbols-rounded trend-arrow" [class]="'trend-' + pred.trend" style="font-size: 16px;">
                  {{ pred.trend === 'increasing' ? 'trending_up' : pred.trend === 'decreasing' ? 'trending_down' : 'trending_flat' }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Predictions Table (mirrors config-table pattern) -->
      <div class="card">
        <div class="card-header">
          <h3>AI Predictions</h3>
          <span class="badge badge-info">Real-time</span>
        </div>
        <table class="config-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Occupancy</th>
              <th>Visitors</th>
              <th>Predicted Wait</th>
              <th>Trend</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (pred of cvService.predictions(); track pred.location_id) {
              <tr>
                <td>
                  <span class="material-symbols-rounded svc-icon-sm">location_on</span>
                  {{ pred.location_name }}
                </td>
                <td>
                  <div class="td-occ">
                    <div class="td-occ-track">
                      <div class="td-occ-fill" [class]="'fill-' + pred.busyness"
                           [style.width.%]="(pred.people_count / pred.capacity) * 100"></div>
                    </div>
                    {{ ((pred.people_count / pred.capacity) * 100) | number:'1.0-0' }}%
                  </div>
                </td>
                <td>{{ pred.people_count }}/{{ pred.capacity }}</td>
                <td><strong>~{{ pred.predicted_wait_minutes }} min</strong></td>
                <td>
                  <span class="trend-arrow" [class]="'trend-' + pred.trend">
                    <span class="material-symbols-rounded" style="font-size: 18px;">
                      {{ pred.trend === 'increasing' ? 'trending_up' : pred.trend === 'decreasing' ? 'trending_down' : 'trending_flat' }}
                    </span>
                  </span>
                </td>
                <td>{{ pred.confidence }}%</td>
                <td>
                  <span class="badge" [class.badge-success]="pred.busyness === 'low'"
                        [class.badge-warning]="pred.busyness === 'moderate' || pred.busyness === 'busy'"
                        [class.badge-error]="pred.busyness === 'very_busy'">
                    {{ formatBusyness(pred.busyness) }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    /* Uses same root class and spacing as dashboard */
    .admin { display: flex; flex-direction: column; gap: 20px; }

    /* Stats row — identical to dashboard */
    .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
    .stat-card { padding: 16px 20px; }
    .stat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .stat-icon { font-size: 22px; color: var(--primary); }
    .stat-change { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 100px; }
    .stat-change.positive { background: var(--success-light); color: var(--success); }
    .stat-change.negative { background: var(--error-light); color: var(--error); }
    .stat-value { font-size: 28px; font-weight: 800; color: var(--base-content); }
    .stat-label { font-size: 12px; color: var(--neutral); margin-top: 2px; }

    /* Charts row — identical to dashboard */
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .chart-card { padding: 20px; }
    .chart-card canvas { width: 100%; height: 220px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-header h3 { font-size: 15px; font-weight: 700; }
    .header-controls { display: flex; align-items: center; gap: 8px; }

    .ctrl-select {
      padding: 5px 12px; border: 1px solid var(--base-200); border-radius: var(--radius-sm);
      background: var(--base-100); color: var(--base-content); font-size: 12px;
    }
    .pill-btn {
      padding: 5px 14px; border-radius: 100px; border: 1px solid var(--base-200);
      background: transparent; color: var(--neutral);
      font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .pill-btn:hover { border-color: var(--base-300); color: var(--base-content); }
    .pill-btn.active { background: var(--secondary); color: var(--secondary-content); border-color: var(--secondary); }

    .badge-info {
      display: inline-flex; align-items: center; gap: 6px;
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: currentColor;
      animation: blink 1.8s infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

    .chart-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
    .cl-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--neutral); }
    .cl-dot { width: 8px; height: 8px; border-radius: 2px; }

    /* Zone chart (horizontal bars — mirrors CSAT bars pattern) */
    .zone-chart { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
    .zone-bar-row { display: flex; align-items: center; gap: 12px; }
    .zb-label { width: 120px; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .zb-track { flex: 1; height: 24px; background: var(--base-200); border-radius: 12px; overflow: hidden; }
    .zb-fill {
      height: 100%; border-radius: 12px;
      transition: width 0.6s ease, background 0.6s ease;
    }
    .zb-pct { font-weight: 700; font-size: 14px; width: 48px; text-align: right; color: var(--base-content); }

    /* Sensor dots */
    .sensor-summary {
      display: flex; align-items: center; gap: 12px;
      padding-top: 16px; border-top: 1px solid var(--base-200);
    }
    .ss-label { font-size: 11px; font-weight: 600; color: var(--neutral); text-transform: uppercase; letter-spacing: 0.5px; }
    .ss-dots { display: flex; gap: 6px; flex-wrap: wrap; }
    .ss-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--base-300); transition: background 0.3s;
    }
    .ss-dot.active { background: var(--success); }
    .ss-dot.offline { background: var(--error); }

    /* Location grid — mirrors counter-grid */
    .loc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .loc-card {
      padding: 16px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--base-200);
      text-align: center;
      position: relative;
    }
    .loc-card.low { border-color: var(--success); background: var(--success-light); }
    .loc-card.moderate { border-color: var(--warn); background: var(--warn-light); }
    .loc-card.busy { border-color: #ea580c; background: #fff7ed; }
    .loc-card.very-busy { border-color: var(--error); background: var(--error-light); }
    .loc-name { font-weight: 700; font-size: 14px; margin-bottom: 8px; }
    .loc-occ-bar {
      height: 6px; background: rgba(0,0,0,0.08); border-radius: 3px; overflow: hidden;
      margin-bottom: 6px;
    }
    .loc-occ-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .fill-low { background: #16a34a; }
    .fill-moderate { background: #ca8a04; }
    .fill-busy { background: #ea580c; }
    .fill-very_busy { background: #dc2626; }
    .loc-metrics { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .loc-pct { font-size: 13px; font-weight: 700; color: var(--base-content); }
    .loc-people { font-size: 12px; color: var(--neutral); }
    .loc-wait-row {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      margin-bottom: 8px;
    }
    .loc-wait-val { font-size: 13px; font-weight: 700; color: var(--primary); }
    .loc-trend { position: absolute; top: 10px; right: 10px; }
    .trend-arrow { display: flex; }
    .trend-increasing { color: #ef4444; }
    .trend-decreasing { color: #16a34a; }
    .trend-stable { color: var(--neutral); }

    /* Config table — identical to dashboard */
    .config-table { width: 100%; border-collapse: collapse; }
    .config-table th {
      text-align: left; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 1px;
      color: var(--neutral); padding: 10px 16px;
      border-bottom: 2px solid var(--base-200);
    }
    .config-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--base-200);
      font-size: 13px;
    }
    .config-table tr:last-child td { border-bottom: none; }
    .svc-icon-sm { font-size: 18px; vertical-align: middle; margin-right: 8px; color: var(--primary); }
    .td-occ { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--neutral); }
    .td-occ-track { width: 64px; height: 6px; background: var(--base-200); border-radius: 3px; overflow: hidden; }
    .td-occ-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }

    @media (max-width: 1200px) {
      .stats-row { grid-template-columns: repeat(3, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .loc-grid { grid-template-columns: repeat(3, 1fr); }
    }
  `]
})
export class CvComponent implements AfterViewInit, OnDestroy {
  readonly cvService = inject(CvService);

  readonly selected_location = signal<string>('norwalk');
  readonly chart_location = signal('all');
  readonly sort_mode = signal<'occupancy' | 'wait'>('occupancy');

  readonly chartColors = ['#be185d', '#4338ca', '#0891b2', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed'];

  private readonly _occupancyCanvas = viewChild<ElementRef<HTMLCanvasElement>>('occupancyChart');
  private _chart_interval: ReturnType<typeof setInterval> | null = null;

  readonly liveStats = computed(() => {
    const preds = this.cvService.predictions();
    const avgOcc = this.cvService.avg_occupancy();
    const avgWait = preds.length ? Math.round(preds.reduce((s, p) => s + p.predicted_wait_minutes, 0) / preds.length) : 0;
    const activeCams = this.cvService.cameras().filter(c => c.status === 'active').length;
    const totalCams = this.cvService.cameras().length;
    const avgConf = preds.length ? Math.round(preds.reduce((s, p) => s + p.confidence, 0) / preds.length) : 0;
    return [
      { icon: 'groups', label: 'Total Visitors', value: String(this.cvService.total_people()), change: 'Live', positive: true },
      { icon: 'donut_small', label: 'Avg Occupancy', value: avgOcc + '%', change: avgOcc > 65 ? 'High' : 'Normal', positive: avgOcc <= 65 },
      { icon: 'schedule', label: 'Avg Wait (AI)', value: avgWait + 'm', change: avgWait < 15 ? 'Good' : 'Elevated', positive: avgWait < 15 },
      { icon: 'videocam', label: 'Active Sensors', value: activeCams + '/' + totalCams, change: activeCams === totalCams ? 'All Online' : (totalCams - activeCams) + ' Offline', positive: activeCams === totalCams },
      { icon: 'psychology', label: 'Model Confidence', value: avgConf + '%', change: avgConf > 85 ? 'High' : 'Moderate', positive: avgConf > 85 },
    ];
  });

  readonly sortedPredictions = computed(() => {
    const preds = [...this.cvService.predictions()];
    if (this.sort_mode() === 'occupancy') {
      return preds.sort((a, b) => (b.people_count / b.capacity) - (a.people_count / a.capacity));
    }
    return preds.sort((a, b) => b.predicted_wait_minutes - a.predicted_wait_minutes);
  });

  readonly currentHeatmap = computed(() => {
    const data = this.cvService.heatmap_data();
    return data[this.selected_location()] ?? [];
  });

  readonly locationCameras = computed(() =>
    this.cvService.cameras().filter(c => c.location_id === this.selected_location())
  );

  readonly activeLocationCameras = computed(() =>
    this.locationCameras().filter(c => c.status === 'active').length
  );

  readonly chartLegend = computed(() => {
    const loc = this.chart_location();
    if (loc === 'all') return this.cvService.getLocations();
    return this.cvService.getLocations().filter(l => l.id === loc);
  });

  asSelect(event: Event): HTMLSelectElement {
    return event.target as HTMLSelectElement;
  }

  ngAfterViewInit(): void {
    setTimeout(() => this._drawChart(), 50);
    this._chart_interval = setInterval(() => this._drawChart(), 5000);
  }

  ngOnDestroy(): void {
    if (this._chart_interval) clearInterval(this._chart_interval);
  }

  getHeatColor(intensity: number): string {
    if (intensity < 0.35) return '#16a34a';
    if (intensity < 0.6) return '#ca8a04';
    if (intensity < 0.8) return '#ea580c';
    return '#dc2626';
  }

  formatBusyness(level: BusynessLevel): string {
    const map: Record<BusynessLevel, string> = {
      low: 'Low', moderate: 'Moderate', busy: 'Busy', very_busy: 'Very Busy',
    };
    return map[level];
  }

  private _drawChart(): void {
    const ref = this._occupancyCanvas();
    if (!ref) return;
    const canvas = ref.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 16, right: 16, bottom: 28, left: 44 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const history = this.cvService.occupancy_history();
    const loc_filter = this.chart_location();
    const locations = loc_filter === 'all'
      ? this.cvService.getLocations()
      : this.cvService.getLocations().filter(l => l.id === loc_filter);

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = Math.round(pad.top + (chartH / 4) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 25}%`, pad.left - 8, y + 3);
    }

    for (let li = 0; li < locations.length; li++) {
      const loc = locations[li];
      const points = history
        .filter(s => s.location_id === loc.id)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (points.length < 2) continue;

      const minT = points[0].timestamp.getTime();
      const maxT = points[points.length - 1].timestamp.getTime();
      const range = maxT - minT || 1;
      const color = this.chartColors[li % this.chartColors.length];

      // Area
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = pad.left + ((points[i].timestamp.getTime() - minT) / range) * chartW;
        const y = pad.top + chartH - (points[i].occupancy_pct / 100) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(pad.left + chartW, pad.top + chartH);
      ctx.lineTo(pad.left, pad.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, color + '18');
      grad.addColorStop(1, color + '02');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = pad.left + ((points[i].timestamp.getTime() - minT) / range) * chartW;
        const y = pad.top + chartH - (points[i].occupancy_pct / 100) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // End dot
      const last = points[points.length - 1];
      const lx = pad.left + chartW;
      const ly = pad.top + chartH - (last.occupancy_pct / 100) * chartH;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // X-axis
    const all_points = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (all_points.length > 1) {
      const minT = all_points[0].timestamp.getTime();
      const maxT = all_points[all_points.length - 1].timestamp.getTime();
      const range = maxT - minT || 1;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Roboto, sans-serif';
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.floor(all_points.length / 8));
      const seen = new Set<string>();
      for (let i = 0; i < all_points.length; i += step) {
        const label = all_points[i].timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (seen.has(label)) continue;
        seen.add(label);
        const x = pad.left + ((all_points[i].timestamp.getTime() - minT) / range) * chartW;
        ctx.fillText(label, x, h - 6);
      }
    }
  }
}
