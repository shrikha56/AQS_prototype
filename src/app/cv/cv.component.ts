import { Component, inject, signal, computed, AfterViewInit, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CvService, BusynessLevel, CvPrediction } from '../services/cv.service';

@Component({
  selector: 'app-cv',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="analytics">

      <!-- Page header strip -->
      <div class="page-header">
        <div class="ph-left">
          <span class="ph-badge">
            <span class="ph-dot"></span>
            Live
          </span>
          <span class="ph-meta">{{ activeCameras() }} sensors across {{ cvService.getLocations().length }} locations</span>
        </div>
        <div class="ph-right">
          <span class="ph-ts">Last updated {{ lastUpdated() }}</span>
        </div>
      </div>

      <!-- KPI strip -->
      <div class="kpi-strip">
        <div class="kpi">
          <div class="kpi-val">{{ cvService.total_people() }}</div>
          <div class="kpi-label">Total Visitors</div>
          <div class="kpi-sub">Across all locations</div>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi">
          <div class="kpi-val">{{ cvService.avg_occupancy() }}<span class="kpi-unit">%</span></div>
          <div class="kpi-label">Avg Occupancy</div>
          <div class="kpi-sub" [class.warn]="cvService.avg_occupancy() > 65">
            {{ cvService.avg_occupancy() > 65 ? 'Above target' : 'Within target' }}
          </div>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi">
          <div class="kpi-val">{{ avgWait() }}<span class="kpi-unit">min</span></div>
          <div class="kpi-label">Avg Predicted Wait</div>
          <div class="kpi-sub">AI-estimated</div>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi">
          <div class="kpi-val kpi-loc">{{ cvService.busiest_location() }}</div>
          <div class="kpi-label">Busiest Location</div>
          <div class="kpi-sub warn">May need staffing</div>
        </div>
      </div>

      <!-- Main grid -->
      <div class="main-grid">

        <!-- Location cards -->
        <div class="section locations-section">
          <div class="section-header">
            <h3>Location Overview</h3>
            <div class="sh-controls">
              <button class="pill-btn" [class.active]="sort_mode() === 'occupancy'" (click)="sort_mode.set('occupancy')">By Occupancy</button>
              <button class="pill-btn" [class.active]="sort_mode() === 'wait'" (click)="sort_mode.set('wait')">By Wait Time</button>
            </div>
          </div>
          <div class="loc-cards">
            @for (pred of sortedPredictions(); track pred.location_id) {
              <div class="loc-card" [class.selected]="selected_location() === pred.location_id"
                   (click)="selected_location.set(pred.location_id)">
                <div class="lc-top">
                  <div class="lc-name">{{ pred.location_name }}</div>
                  <span class="lc-trend" [class]="'trend-' + pred.trend">
                    <span class="material-symbols-rounded" style="font-size: 16px;">
                      {{ pred.trend === 'increasing' ? 'north_east' : pred.trend === 'decreasing' ? 'south_east' : 'east' }}
                    </span>
                  </span>
                </div>
                <div class="lc-occ-row">
                  <div class="lc-occ-track">
                    <div class="lc-occ-fill" [class]="'fill-' + pred.busyness"
                         [style.width.%]="(pred.people_count / pred.capacity) * 100"></div>
                  </div>
                  <span class="lc-occ-pct">{{ ((pred.people_count / pred.capacity) * 100) | number:'1.0-0' }}%</span>
                </div>
                <div class="lc-bottom">
                  <div class="lc-stat">
                    <span class="lc-stat-val">{{ pred.people_count }}</span>
                    <span class="lc-stat-label">visitors</span>
                  </div>
                  <div class="lc-stat">
                    <span class="lc-stat-val">~{{ pred.predicted_wait_minutes }}m</span>
                    <span class="lc-stat-label">wait</span>
                  </div>
                  <span class="lc-badge" [class]="'b-' + pred.busyness">{{ formatBusyness(pred.busyness) }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right column: detail for selected location -->
        <div class="section detail-section">
          <div class="section-header">
            <h3>{{ selectedPrediction()?.location_name ?? 'Select a location' }}</h3>
            @if (selectedPrediction()) {
              <span class="lc-badge" [class]="'b-' + selectedPrediction()!.busyness">
                {{ formatBusyness(selectedPrediction()!.busyness) }}
              </span>
            }
          </div>

          @if (selectedPrediction(); as pred) {
            <!-- Zone heatmap -->
            <div class="detail-block">
              <div class="db-label">Zone Occupancy</div>
              <div class="zone-strip">
                @for (zone of currentHeatmap(); track zone.zone_name) {
                  <div class="zone-cell">
                    <div class="zc-bar-wrap">
                      <div class="zc-bar" [style.height.%]="zone.intensity * 100"
                           [style.background]="getHeatColor(zone.intensity)"></div>
                    </div>
                    <span class="zc-pct">{{ (zone.intensity * 100) | number:'1.0-0' }}%</span>
                    <span class="zc-name">{{ zone.zone_name }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Sensor feeds -->
            <div class="detail-block">
              <div class="db-label">
                Sensors
                <span class="db-label-sub">({{ locationCameras().length }} active)</span>
              </div>
              <div class="sensor-grid">
                @for (cam of locationCameras(); track cam.id) {
                  <div class="sensor-card" [class.offline]="cam.status === 'offline'">
                    <div class="sc-feed">
                      @if (cam.status === 'offline') {
                        <span class="material-symbols-rounded sc-icon-off">videocam_off</span>
                      } @else {
                        <div class="sc-scanlines"></div>
                        <span class="material-symbols-rounded sc-icon">person_search</span>
                        <div class="sc-count-badge">
                          <span class="sc-count">{{ cam.people_count }}</span>
                        </div>
                        <div class="sc-capacity-bar">
                          <div class="sc-cap-fill" [style.width.%]="(cam.people_count / cam.max_capacity) * 100"></div>
                        </div>
                      }
                    </div>
                    <div class="sc-meta">
                      <span class="sc-zone">{{ cam.zone }}</span>
                      @if (cam.status === 'active') {
                        <span class="sc-ratio">{{ cam.people_count }}/{{ cam.max_capacity }}</span>
                      } @else {
                        <span class="sc-ratio offline-text">Offline</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Prediction confidence -->
            <div class="detail-block">
              <div class="db-label">Prediction Model</div>
              <div class="model-row">
                <div class="model-stat">
                  <span class="ms-label">Confidence</span>
                  <div class="confidence-ring">
                    <svg viewBox="0 0 40 40" class="conf-svg">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--base-200)" stroke-width="3"/>
                      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--primary)" stroke-width="3"
                              [attr.stroke-dasharray]="pred.confidence * 1.005 + ' 100'"
                              stroke-linecap="round"
                              transform="rotate(-90 20 20)"/>
                    </svg>
                    <span class="conf-val">{{ pred.confidence }}%</span>
                  </div>
                </div>
                <div class="model-stat">
                  <span class="ms-label">Trend</span>
                  <div class="trend-display" [class]="'trend-' + pred.trend">
                    <span class="material-symbols-rounded" style="font-size: 22px;">
                      {{ pred.trend === 'increasing' ? 'trending_up' : pred.trend === 'decreasing' ? 'trending_down' : 'trending_flat' }}
                    </span>
                    <span class="td-text">{{ pred.trend === 'increasing' ? 'Rising' : pred.trend === 'decreasing' ? 'Declining' : 'Stable' }}</span>
                  </div>
                </div>
                <div class="model-stat">
                  <span class="ms-label">Est. Wait</span>
                  <div class="wait-display">
                    <span class="wd-val">{{ pred.predicted_wait_minutes }}</span>
                    <span class="wd-unit">min</span>
                  </div>
                </div>
              </div>
            </div>
          } @else {
            <div class="empty-detail">
              <span class="material-symbols-rounded" style="font-size: 40px; color: var(--base-300);">analytics</span>
              <p>Select a location to view detailed analytics</p>
            </div>
          }
        </div>
      </div>

      <!-- Occupancy chart -->
      <div class="section chart-section">
        <div class="section-header">
          <h3>Occupancy Trend</h3>
          <div class="sh-controls">
            <select class="ctrl-select" (change)="chart_location.set(asSelect($event).value)">
              <option value="all">All Locations</option>
              @for (loc of cvService.getLocations(); track loc.id) {
                <option [value]="loc.id">{{ loc.name }}</option>
              }
            </select>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas #occupancyChart width="1100" height="240"></canvas>
        </div>
        <div class="chart-legend">
          @for (loc of chartLegend(); track loc.id; let i = $index) {
            <span class="cl-item">
              <span class="cl-dot" [style.background]="chartColors[i % chartColors.length]"></span>
              {{ loc.name }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics { display: flex; flex-direction: column; gap: 16px; }

    /* Page header */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .ph-left { display: flex; align-items: center; gap: 10px; }
    .ph-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--primary-wash); color: var(--primary);
      padding: 4px 12px; border-radius: 100px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .ph-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--primary);
      animation: blink 1.8s infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .ph-meta { font-size: 12px; color: var(--neutral); }
    .ph-ts { font-size: 11px; color: var(--base-300); }

    /* KPI strip */
    .kpi-strip {
      display: flex; align-items: stretch;
      background: var(--base-100);
      border: 1px solid var(--base-200);
      border-radius: var(--radius);
      padding: 20px 0;
    }
    .kpi {
      flex: 1;
      display: flex; flex-direction: column; align-items: center;
      gap: 2px; padding: 0 24px;
    }
    .kpi-divider { width: 1px; background: var(--base-200); }
    .kpi-val {
      font-size: 28px; font-weight: 800; color: var(--base-content);
      letter-spacing: -1px; line-height: 1;
    }
    .kpi-val.kpi-loc { font-size: 16px; font-weight: 700; letter-spacing: 0; }
    .kpi-unit { font-size: 14px; font-weight: 600; color: var(--neutral); margin-left: 2px; }
    .kpi-label { font-size: 11px; font-weight: 600; color: var(--neutral); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .kpi-sub { font-size: 10px; color: var(--base-300); }
    .kpi-sub.warn { color: var(--error); }

    /* Section cards */
    .section {
      background: var(--base-100);
      border: 1px solid var(--base-200);
      border-radius: var(--radius);
      padding: 20px;
    }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .section-header h3 { font-size: 14px; font-weight: 700; color: var(--base-content); }
    .sh-controls { display: flex; gap: 4px; }
    .pill-btn {
      padding: 5px 14px; border-radius: 100px; border: 1px solid var(--base-200);
      background: transparent; color: var(--neutral);
      font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .pill-btn:hover { border-color: var(--base-300); color: var(--base-content); }
    .pill-btn.active { background: var(--secondary); color: var(--secondary-content); border-color: var(--secondary); }
    .ctrl-select {
      padding: 5px 12px; border: 1px solid var(--base-200); border-radius: var(--radius-sm);
      background: var(--base-100); color: var(--base-content); font-size: 12px;
    }

    /* Main grid */
    .main-grid {
      display: grid; grid-template-columns: 1fr 380px; gap: 16px;
    }

    /* Location cards */
    .loc-cards { display: flex; flex-direction: column; gap: 8px; }
    .loc-card {
      padding: 14px 16px;
      border: 1px solid var(--base-200);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
    }
    .loc-card:hover { border-color: var(--base-300); box-shadow: var(--shadow); }
    .loc-card.selected { border-color: var(--primary); background: var(--primary-wash); }
    .lc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .lc-name { font-size: 13px; font-weight: 700; color: var(--base-content); }
    .lc-trend { display: flex; }
    .trend-increasing { color: #ef4444; }
    .trend-decreasing { color: #16a34a; }
    .trend-stable { color: var(--neutral); }
    .lc-occ-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .lc-occ-track {
      flex: 1; height: 6px; background: var(--base-200); border-radius: 3px; overflow: hidden;
    }
    .lc-occ-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .fill-low { background: #16a34a; }
    .fill-moderate { background: #ca8a04; }
    .fill-busy { background: #ea580c; }
    .fill-very_busy { background: #dc2626; }
    .lc-occ-pct { font-size: 11px; font-weight: 700; color: var(--base-content); min-width: 32px; text-align: right; }
    .lc-bottom { display: flex; align-items: center; gap: 16px; }
    .lc-stat { display: flex; align-items: baseline; gap: 4px; }
    .lc-stat-val { font-size: 14px; font-weight: 700; color: var(--base-content); }
    .lc-stat-label { font-size: 10px; color: var(--neutral); }
    .lc-badge {
      margin-left: auto;
      padding: 2px 10px; border-radius: 100px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .b-low { background: #dcfce7; color: #16a34a; }
    .b-moderate { background: #fef9c3; color: #a16207; }
    .b-busy { background: #fed7aa; color: #c2410c; }
    .b-very_busy { background: #fecaca; color: #dc2626; }

    /* Detail panel */
    .detail-section { display: flex; flex-direction: column; }
    .detail-block { margin-bottom: 20px; }
    .db-label {
      font-size: 11px; font-weight: 700; color: var(--neutral);
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .db-label-sub { font-weight: 500; text-transform: none; color: var(--base-300); letter-spacing: 0; }
    .empty-detail {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px;
      color: var(--neutral); font-size: 13px;
      min-height: 300px;
    }

    /* Zone strip (vertical bars) */
    .zone-strip { display: flex; gap: 12px; justify-content: space-between; }
    .zone-cell {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .zc-bar-wrap {
      width: 100%; height: 80px;
      background: var(--base-200); border-radius: 6px;
      display: flex; align-items: flex-end;
      overflow: hidden;
    }
    .zc-bar {
      width: 100%; border-radius: 6px 6px 0 0;
      transition: height 0.6s ease, background 0.6s ease;
      min-height: 4px;
    }
    .zc-pct { font-size: 12px; font-weight: 700; color: var(--base-content); }
    .zc-name { font-size: 9px; color: var(--neutral); text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }

    /* Sensor grid */
    .sensor-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .sensor-card { border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--base-200); }
    .sensor-card.offline { opacity: 0.5; }
    .sc-feed {
      height: 64px; background: #0c1222;
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
    }
    .sc-scanlines {
      position: absolute; inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent, transparent 2px,
        rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px
      );
      pointer-events: none;
    }
    .sc-icon { color: rgba(255,255,255,0.08); font-size: 28px; }
    .sc-icon-off { color: rgba(255,255,255,0.2); font-size: 22px; }
    .sc-count-badge {
      position: absolute; top: 6px; right: 6px;
      background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
      border-radius: 4px; padding: 2px 6px;
    }
    .sc-count { color: #fff; font-size: 13px; font-weight: 700; }
    .sc-capacity-bar {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 3px; background: rgba(255,255,255,0.06);
    }
    .sc-cap-fill {
      height: 100%;
      background: linear-gradient(90deg, #16a34a, #ca8a04, #ef4444);
      transition: width 0.5s;
    }
    .sc-meta {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 8px; background: var(--base-100);
    }
    .sc-zone { font-size: 10px; font-weight: 600; color: var(--base-content); }
    .sc-ratio { font-size: 10px; color: var(--neutral); }
    .offline-text { color: var(--error); }

    /* Model confidence */
    .model-row { display: flex; gap: 20px; }
    .model-stat {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .ms-label { font-size: 10px; font-weight: 600; color: var(--neutral); text-transform: uppercase; letter-spacing: 0.3px; }
    .confidence-ring { position: relative; width: 56px; height: 56px; }
    .conf-svg { width: 100%; height: 100%; }
    .conf-val {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800; color: var(--base-content);
    }
    .trend-display {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: var(--radius-sm);
      background: var(--base-200);
    }
    .trend-display.trend-increasing { background: #fef2f2; color: #dc2626; }
    .trend-display.trend-decreasing { background: #f0fdf4; color: #16a34a; }
    .trend-display.trend-stable { background: var(--base-200); color: var(--neutral); }
    .td-text { font-size: 12px; font-weight: 600; }
    .wait-display { display: flex; align-items: baseline; gap: 2px; }
    .wd-val { font-size: 28px; font-weight: 800; color: var(--base-content); line-height: 1; }
    .wd-unit { font-size: 12px; color: var(--neutral); font-weight: 600; }

    /* Chart */
    .chart-section { }
    .chart-wrap { margin-bottom: 12px; }
    .chart-wrap canvas { width: 100%; height: 200px; }
    .chart-legend { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
    .cl-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--neutral); }
    .cl-dot { width: 8px; height: 8px; border-radius: 2px; }
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
  private _time_interval: ReturnType<typeof setInterval> | null = null;
  readonly lastUpdated = signal(this._formatTime());

  readonly activeCameras = computed(() =>
    this.cvService.cameras().filter(c => c.status === 'active').length
  );

  readonly avgWait = computed(() => {
    const preds = this.cvService.predictions();
    if (!preds.length) return 0;
    return Math.round(preds.reduce((s, p) => s + p.predicted_wait_minutes, 0) / preds.length);
  });

  readonly sortedPredictions = computed(() => {
    const preds = [...this.cvService.predictions()];
    if (this.sort_mode() === 'occupancy') {
      return preds.sort((a, b) => (b.people_count / b.capacity) - (a.people_count / a.capacity));
    }
    return preds.sort((a, b) => b.predicted_wait_minutes - a.predicted_wait_minutes);
  });

  readonly selectedPrediction = computed(() => {
    const id = this.selected_location();
    return this.cvService.predictions().find(p => p.location_id === id) ?? null;
  });

  readonly currentHeatmap = computed(() => {
    const data = this.cvService.heatmap_data();
    return data[this.selected_location()] ?? [];
  });

  readonly locationCameras = computed(() =>
    this.cvService.cameras().filter(c => c.location_id === this.selected_location())
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
    this._chart_interval = setInterval(() => {
      this._drawChart();
      this.lastUpdated.set(this._formatTime());
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this._chart_interval) clearInterval(this._chart_interval);
    if (this._time_interval) clearInterval(this._time_interval);
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

  private _formatTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = Math.round(pad.top + (chartH / 4) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 25}%`, pad.left - 8, y + 3);
    }

    // Plot lines
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

      // Area fill
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
      ctx.fillStyle = color + '0a';
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
      ctx.lineWidth = 2;
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
      ctx.font = '10px -apple-system, sans-serif';
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
