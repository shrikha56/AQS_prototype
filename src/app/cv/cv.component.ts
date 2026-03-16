import { Component, inject, signal, computed, AfterViewInit, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CvService, BusynessLevel } from '../services/cv.service';

@Component({
  selector: 'app-cv',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="cv-page">
      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-icon-wrap"><span class="material-symbols-rounded">videocam</span></div>
          <div class="stat-value">{{ activeCameras() }}</div>
          <div class="stat-label">Active Cameras</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon-wrap people"><span class="material-symbols-rounded">groups</span></div>
          <div class="stat-value">{{ cvService.total_people() }}</div>
          <div class="stat-label">People Detected</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon-wrap occupancy"><span class="material-symbols-rounded">donut_small</span></div>
          <div class="stat-value">{{ cvService.avg_occupancy() }}%</div>
          <div class="stat-label">Avg Occupancy</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon-wrap busy"><span class="material-symbols-rounded">local_fire_department</span></div>
          <div class="stat-value stat-value-sm">{{ cvService.busiest_location() }}</div>
          <div class="stat-label">Busiest Location</div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon-wrap confidence"><span class="material-symbols-rounded">psychology</span></div>
          <div class="stat-value">{{ avgConfidence() }}%</div>
          <div class="stat-label">Model Confidence</div>
        </div>
      </div>

      <div class="two-col">
        <!-- Camera Grid -->
        <div class="card camera-section">
          <div class="card-header">
            <h3>Camera Feeds</h3>
            <span class="badge badge-live">
              <span class="live-dot"></span>
              LIVE
            </span>
          </div>
          <div class="camera-grid">
            @for (cam of cvService.cameras(); track cam.id) {
              <div class="camera-card" [class.offline]="cam.status === 'offline'"
                   [class.high]="cam.people_count / cam.max_capacity > 0.75"
                   [class.med]="cam.people_count / cam.max_capacity > 0.5 && cam.people_count / cam.max_capacity <= 0.75"
                   [class.low]="cam.people_count / cam.max_capacity <= 0.5">
                <div class="cam-feed">
                  @if (cam.status === 'offline') {
                    <span class="material-symbols-rounded cam-icon offline-icon">videocam_off</span>
                    <span class="cam-offline-label">OFFLINE</span>
                  } @else {
                    <span class="material-symbols-rounded cam-icon">videocam</span>
                    <div class="cam-overlay">
                      <span class="cam-count">{{ cam.people_count }}</span>
                      <span class="cam-count-label">people</span>
                    </div>
                    <div class="cam-bar-wrap">
                      <div class="cam-bar" [style.width.%]="(cam.people_count / cam.max_capacity) * 100"></div>
                    </div>
                  }
                </div>
                <div class="cam-info">
                  <span class="cam-name">{{ cam.name }}</span>
                  <span class="cam-zone">{{ cam.zone }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Heatmap Panel -->
        <div class="card heatmap-section">
          <div class="card-header">
            <h3>Occupancy Heatmap</h3>
            <select class="form-select" (change)="heatmap_location.set(asSelect($event).value)">
              @for (loc of cvService.getLocations(); track loc.id) {
                <option [value]="loc.id" [selected]="loc.id === heatmap_location()">{{ loc.name }}</option>
              }
            </select>
          </div>
          <div class="heatmap-grid">
            @for (zone of currentHeatmap(); track zone.zone_name) {
              <div class="heatmap-zone" [style.background]="getHeatColor(zone.intensity)">
                <span class="hz-name">{{ zone.zone_name }}</span>
                <span class="hz-pct">{{ (zone.intensity * 100) | number:'1.0-0' }}%</span>
              </div>
            }
          </div>
          <div class="heatmap-legend">
            <span class="hl-item"><span class="hl-swatch" style="background: #22c55e;"></span> Low</span>
            <span class="hl-item"><span class="hl-swatch" style="background: #eab308;"></span> Moderate</span>
            <span class="hl-item"><span class="hl-swatch" style="background: #f97316;"></span> High</span>
            <span class="hl-item"><span class="hl-swatch" style="background: #ef4444;"></span> Critical</span>
          </div>
        </div>
      </div>

      <!-- Predictions Table -->
      <div class="card">
        <div class="card-header">
          <h3>AI Predictions by Location</h3>
          <span class="badge badge-info">Real-time</span>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Occupancy</th>
                <th>Predicted Wait</th>
                <th>Busyness</th>
                <th>Trend</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              @for (pred of cvService.predictions(); track pred.location_id) {
                <tr>
                  <td class="td-name">{{ pred.location_name }}</td>
                  <td>
                    <div class="occ-bar-wrap">
                      <div class="occ-bar" [class]="'occ-' + pred.busyness"
                           [style.width.%]="(pred.people_count / pred.capacity) * 100"></div>
                    </div>
                    <span class="occ-text">{{ pred.people_count }}/{{ pred.capacity }}</span>
                  </td>
                  <td><strong>~{{ pred.predicted_wait_minutes }} min</strong></td>
                  <td><span class="busyness-badge" [class]="'b-' + pred.busyness">{{ formatBusyness(pred.busyness) }}</span></td>
                  <td>
                    <span class="trend-icon" [class]="'trend-' + pred.trend">
                      <span class="material-symbols-rounded" style="font-size: 18px;">
                        {{ pred.trend === 'increasing' ? 'trending_up' : pred.trend === 'decreasing' ? 'trending_down' : 'trending_flat' }}
                      </span>
                    </span>
                  </td>
                  <td>{{ pred.confidence }}%</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Occupancy Over Time Chart -->
      <div class="card">
        <div class="card-header">
          <h3>Occupancy Over Time</h3>
          <select class="form-select" (change)="chart_location.set(asSelect($event).value)">
            <option value="all">All Locations</option>
            @for (loc of cvService.getLocations(); track loc.id) {
              <option [value]="loc.id">{{ loc.name }}</option>
            }
          </select>
        </div>
        <canvas #occupancyChart width="900" height="260"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .cv-page { display: flex; flex-direction: column; gap: 20px; }

    .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
    .stat-card {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-icon-wrap {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--primary-wash);
      color: var(--primary);
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon-wrap.people { background: #dbeafe; color: #2563eb; }
    .stat-icon-wrap.occupancy { background: #fef3c7; color: #d97706; }
    .stat-icon-wrap.busy { background: #fee2e2; color: #dc2626; }
    .stat-icon-wrap.confidence { background: #ede9fe; color: #7c3aed; }
    .stat-value { font-size: 26px; font-weight: 700; color: var(--base-content); }
    .stat-value-sm { font-size: 16px; }
    .stat-label { font-size: 12px; color: var(--neutral); }

    .two-col { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }

    .card {
      background: var(--base-100);
      border-radius: var(--radius);
      border: 1px solid var(--base-200);
      padding: 20px;
    }
    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .card-header h3 { font-size: 15px; font-weight: 700; color: var(--base-content); }

    .badge-live {
      background: #fee2e2; color: #dc2626;
      padding: 4px 10px; border-radius: 100px;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; gap: 6px;
    }
    .live-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #dc2626;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .badge-info {
      background: var(--primary-wash); color: var(--primary);
      padding: 4px 10px; border-radius: 100px;
      font-size: 11px; font-weight: 600;
    }

    /* Camera grid */
    .camera-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .camera-card {
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid var(--base-200);
      transition: border-color 0.2s;
    }
    .camera-card.high { border-color: #ef4444; }
    .camera-card.med { border-color: #eab308; }
    .camera-card.low { border-color: #22c55e; }
    .camera-card.offline { border-color: var(--base-300); opacity: 0.6; }
    .cam-feed {
      height: 100px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .cam-icon { color: rgba(255,255,255,0.15); font-size: 36px; }
    .offline-icon { color: rgba(255,255,255,0.3); font-size: 28px; }
    .cam-offline-label {
      color: rgba(255,255,255,0.4);
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      margin-top: 4px;
    }
    .cam-overlay {
      position: absolute;
      top: 8px; right: 8px;
      background: rgba(0,0,0,0.7);
      border-radius: 6px;
      padding: 3px 8px;
      display: flex; align-items: baseline; gap: 4px;
    }
    .cam-count { color: #fff; font-size: 16px; font-weight: 700; }
    .cam-count-label { color: rgba(255,255,255,0.5); font-size: 9px; }
    .cam-bar-wrap {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 4px; background: rgba(255,255,255,0.1);
    }
    .cam-bar {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
      transition: width 0.5s;
    }
    .cam-info {
      padding: 8px 10px;
      display: flex; flex-direction: column; gap: 2px;
      background: var(--base-100);
    }
    .cam-name { font-size: 11px; font-weight: 600; color: var(--base-content); }
    .cam-zone { font-size: 10px; color: var(--neutral); }

    /* Heatmap */
    .heatmap-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .heatmap-zone {
      border-radius: 10px;
      padding: 24px 16px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 6px;
      transition: background 0.5s;
      min-height: 90px;
    }
    .hz-name { font-size: 12px; font-weight: 600; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
    .hz-pct { font-size: 22px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
    .heatmap-legend {
      display: flex; gap: 16px; justify-content: center;
    }
    .hl-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--neutral); }
    .hl-swatch { width: 12px; height: 12px; border-radius: 3px; }
    .form-select {
      padding: 5px 10px;
      border: 1px solid var(--base-300);
      border-radius: 6px;
      font-size: 12px;
      background: var(--base-100);
      color: var(--base-content);
    }

    /* Table */
    .table-wrap { overflow-x: auto; }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th {
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      color: var(--neutral);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--base-200);
    }
    .table td {
      padding: 12px;
      border-bottom: 1px solid var(--base-200);
      color: var(--base-content);
    }
    .td-name { font-weight: 600; }
    .occ-bar-wrap {
      width: 80px; height: 6px;
      background: var(--base-200);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 4px;
    }
    .occ-bar {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s;
    }
    .occ-low { background: #22c55e; }
    .occ-moderate { background: #eab308; }
    .occ-busy { background: #f97316; }
    .occ-very_busy { background: #ef4444; }
    .occ-text { font-size: 11px; color: var(--neutral); }

    .busyness-badge {
      padding: 3px 10px; border-radius: 100px;
      font-size: 11px; font-weight: 600;
    }
    .b-low { background: #dcfce7; color: #16a34a; }
    .b-moderate { background: #fef9c3; color: #ca8a04; }
    .b-busy { background: #fed7aa; color: #ea580c; }
    .b-very_busy { background: #fecaca; color: #dc2626; }

    .trend-icon { display: flex; align-items: center; }
    .trend-increasing { color: #ef4444; }
    .trend-decreasing { color: #22c55e; }
    .trend-stable { color: var(--neutral); }

    canvas { width: 100%; }
  `]
})
export class CvComponent implements AfterViewInit, OnDestroy {
  readonly cvService = inject(CvService);

  readonly heatmap_location = signal('norwalk');
  readonly chart_location = signal('all');

  private readonly _occupancyCanvas = viewChild<ElementRef<HTMLCanvasElement>>('occupancyChart');
  private _chart_interval: ReturnType<typeof setInterval> | null = null;

  readonly activeCameras = computed(() =>
    this.cvService.cameras().filter(c => c.status === 'active').length
  );

  readonly avgConfidence = computed(() => {
    const preds = this.cvService.predictions();
    if (!preds.length) return 0;
    return Math.round(preds.reduce((s, p) => s + p.confidence, 0) / preds.length);
  });

  readonly currentHeatmap = computed(() => {
    const data = this.cvService.heatmap_data();
    return data[this.heatmap_location()] ?? [];
  });

  asSelect(event: Event): HTMLSelectElement {
    return event.target as HTMLSelectElement;
  }

  ngAfterViewInit(): void {
    this._drawChart();
    this._chart_interval = setInterval(() => this._drawChart(), 5000);
  }

  ngOnDestroy(): void {
    if (this._chart_interval) clearInterval(this._chart_interval);
  }

  getHeatColor(intensity: number): string {
    if (intensity < 0.35) return '#22c55e';
    if (intensity < 0.6) return '#eab308';
    if (intensity < 0.8) return '#f97316';
    return '#ef4444';
  }

  formatBusyness(level: BusynessLevel): string {
    const map: Record<BusynessLevel, string> = {
      low: 'Low',
      moderate: 'Moderate',
      busy: 'Busy',
      very_busy: 'Very Busy',
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

    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Filter history
    const history = this.cvService.occupancy_history();
    const loc_filter = this.chart_location();
    const locations = loc_filter === 'all'
      ? this.cvService.getLocations()
      : this.cvService.getLocations().filter(l => l.id === loc_filter);

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 25}%`, pad.left - 8, y + 4);
    }

    const colors = ['#4f46e5', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed'];

    for (let li = 0; li < locations.length; li++) {
      const loc = locations[li];
      const points = history
        .filter(s => s.location_id === loc.id)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (points.length < 2) continue;

      const minT = points[0].timestamp.getTime();
      const maxT = points[points.length - 1].timestamp.getTime();
      const range = maxT - minT || 1;

      ctx.strokeStyle = colors[li % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = pad.left + ((points[i].timestamp.getTime() - minT) / range) * chartW;
        const y = pad.top + chartH - (points[i].occupancy_pct / 100) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Label
      const last = points[points.length - 1];
      const lx = pad.left + chartW + 4;
      const ly = pad.top + chartH - (last.occupancy_pct / 100) * chartH;
      ctx.fillStyle = colors[li % colors.length];
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      if (locations.length <= 3) {
        ctx.fillText(loc.name, lx - chartW + 10, ly - 8);
      }
    }

    // X-axis labels
    const all_points = history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (all_points.length > 1) {
      const minT = all_points[0].timestamp.getTime();
      const maxT = all_points[all_points.length - 1].timestamp.getTime();
      const range = maxT - minT || 1;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.floor(all_points.length / 6));
      const seen = new Set<string>();
      for (let i = 0; i < all_points.length; i += step) {
        const label = all_points[i].timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (seen.has(label)) continue;
        seen.add(label);
        const x = pad.left + ((all_points[i].timestamp.getTime() - minT) / range) * chartW;
        ctx.fillText(label, x, h - 8);
      }
    }
  }
}
