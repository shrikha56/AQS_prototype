import { Injectable, signal, computed } from '@angular/core';

export interface CameraFeed {
  id: string;
  name: string;
  location_id: string;
  zone: string;
  status: 'active' | 'offline';
  people_count: number;
  max_capacity: number;
}

export interface OccupancySnapshot {
  location_id: string;
  timestamp: Date;
  people_count: number;
  capacity: number;
  occupancy_pct: number;
}

export type BusynessLevel = 'low' | 'moderate' | 'busy' | 'very_busy';

export interface CvPrediction {
  location_id: string;
  location_name: string;
  predicted_wait_minutes: number;
  busyness: BusynessLevel;
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  people_count: number;
  capacity: number;
}

export interface HeatmapZone {
  zone_name: string;
  intensity: number;
}

const LOCATIONS = [
  { id: 'norwalk', name: 'Norwalk HQ', capacity: 120 },
  { id: 'lancaster', name: 'Lancaster Office', capacity: 60 },
  { id: 'vannuys', name: 'Van Nuys Office', capacity: 80 },
  { id: 'inglewood', name: 'Inglewood Office', capacity: 70 },
  { id: 'pomona', name: 'Pomona Office', capacity: 55 },
  { id: 'compton', name: 'Compton Office', capacity: 50 },
  { id: 'beverlyhills', name: 'Beverly Hills Office', capacity: 45 },
];

@Injectable({ providedIn: 'root' })
export class CvService {
  readonly cameras = signal<CameraFeed[]>(this._initCameras());
  readonly occupancy_history = signal<OccupancySnapshot[]>(this._initHistory());
  readonly heatmap_data = signal<Record<string, HeatmapZone[]>>(this._initHeatmaps());

  readonly predictions = computed<CvPrediction[]>(() => {
    const cams = this.cameras();
    return LOCATIONS.map(loc => {
      const loc_cams = cams.filter(c => c.location_id === loc.id && c.status === 'active');
      const people = loc_cams.reduce((sum, c) => sum + c.people_count, 0);
      const occupancy_pct = people / loc.capacity;
      const busyness: BusynessLevel =
        occupancy_pct < 0.35 ? 'low' :
        occupancy_pct < 0.6 ? 'moderate' :
        occupancy_pct < 0.8 ? 'busy' : 'very_busy';

      const avg_service = 8;
      const active_counters = Math.max(2, Math.floor(loc.capacity / 15));
      const wait = Math.round((people / active_counters) * avg_service * (0.8 + Math.random() * 0.4) / 10);

      return {
        location_id: loc.id,
        location_name: loc.name,
        predicted_wait_minutes: Math.max(2, wait),
        busyness,
        confidence: Math.round(78 + Math.random() * 18),
        trend: this._getTrend(loc.id),
        people_count: people,
        capacity: loc.capacity,
      };
    });
  });

  readonly total_people = computed(() =>
    this.cameras().filter(c => c.status === 'active').reduce((s, c) => s + c.people_count, 0)
  );

  readonly avg_occupancy = computed(() => {
    const preds = this.predictions();
    if (!preds.length) return 0;
    return Math.round(preds.reduce((s, p) => s + (p.people_count / p.capacity) * 100, 0) / preds.length);
  });

  readonly busiest_location = computed(() => {
    const preds = this.predictions();
    if (!preds.length) return 'N/A';
    const max = preds.reduce((a, b) => (a.people_count / a.capacity) > (b.people_count / b.capacity) ? a : b);
    return max.location_name;
  });

  private _prev_counts: Record<string, number> = {};
  private _interval: ReturnType<typeof setInterval>;

  constructor() {
    // Snapshot initial counts for trend detection
    this.cameras().forEach(c => {
      this._prev_counts[c.location_id] = (this._prev_counts[c.location_id] ?? 0) + c.people_count;
    });

    this._interval = setInterval(() => this._tick(), 5000);
  }

  getPredictionForLocation(location_id: string): CvPrediction | undefined {
    return this.predictions().find(p => p.location_id === location_id);
  }

  getEstimatedWaitForQueue(queue_position: number, _service_id: string, location_id: string): number {
    const pred = this.getPredictionForLocation(location_id || 'norwalk');
    if (!pred) return queue_position * 5;
    const base = pred.predicted_wait_minutes;
    const position_factor = Math.max(1, queue_position * 2.5);
    return Math.round(Math.max(2, base + position_factor));
  }

  getLocationName(id: string): string {
    return LOCATIONS.find(l => l.id === id)?.name ?? id;
  }

  getLocations() {
    return LOCATIONS;
  }

  private _tick(): void {
    // Save previous totals for trend
    const prev: Record<string, number> = {};
    this.cameras().forEach(c => {
      prev[c.location_id] = (prev[c.location_id] ?? 0) + c.people_count;
    });
    this._prev_counts = prev;

    // Fluctuate camera people counts using a daily curve
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const daily_factor = this._dailyCurve(hour);

    this.cameras.update(cams => cams.map(cam => {
      if (cam.status === 'offline') return cam;
      const base = cam.max_capacity * daily_factor;
      const noise = (Math.random() - 0.5) * cam.max_capacity * 0.15;
      const people_count = Math.max(0, Math.min(cam.max_capacity, Math.round(base + noise)));
      return { ...cam, people_count };
    }));

    // Update heatmaps
    this.heatmap_data.set(this._generateHeatmaps());

    // Add to history every ~30s (every 6 ticks)
    if (Math.random() < 0.17) {
      const now = new Date();
      const new_snapshots = LOCATIONS.map(loc => {
        const cams = this.cameras().filter(c => c.location_id === loc.id && c.status === 'active');
        const people = cams.reduce((s, c) => s + c.people_count, 0);
        return {
          location_id: loc.id,
          timestamp: now,
          people_count: people,
          capacity: loc.capacity,
          occupancy_pct: Math.round((people / loc.capacity) * 100),
        };
      });
      this.occupancy_history.update(h => [...h.slice(-200), ...new_snapshots]);
    }
  }

  private _getTrend(location_id: string): 'increasing' | 'stable' | 'decreasing' {
    const current = this.cameras()
      .filter(c => c.location_id === location_id && c.status === 'active')
      .reduce((s, c) => s + c.people_count, 0);
    const prev = this._prev_counts[location_id] ?? current;
    const diff = current - prev;
    if (diff > 3) return 'increasing';
    if (diff < -3) return 'decreasing';
    return 'stable';
  }

  private _dailyCurve(hour: number): number {
    // Morning ramp, peak 10-11, lunch dip, afternoon peak 2-3, taper
    const morning = Math.exp(-0.5 * Math.pow((hour - 10.5) / 1.5, 2)) * 0.85;
    const afternoon = Math.exp(-0.5 * Math.pow((hour - 14) / 1.8, 2)) * 0.7;
    const base = 0.1;
    return Math.min(0.95, base + morning + afternoon);
  }

  private _initCameras(): CameraFeed[] {
    const feeds: CameraFeed[] = [];
    const zones = ['Entrance', 'Waiting Area', 'Service Counters', 'Exit'];
    for (const loc of LOCATIONS) {
      const cam_count = loc.capacity > 80 ? 4 : loc.capacity > 60 ? 3 : 2;
      for (let i = 0; i < cam_count; i++) {
        const cap = Math.round(loc.capacity / cam_count);
        feeds.push({
          id: `cam-${loc.id}-${i + 1}`,
          name: `${loc.name} - ${zones[i % zones.length]}`,
          location_id: loc.id,
          zone: zones[i % zones.length],
          status: Math.random() > 0.08 ? 'active' : 'offline',
          people_count: Math.round(cap * (0.3 + Math.random() * 0.5)),
          max_capacity: cap,
        });
      }
    }
    return feeds;
  }

  private _initHistory(): OccupancySnapshot[] {
    const history: OccupancySnapshot[] = [];
    const now = new Date();
    for (let h = 12; h >= 0; h--) {
      const ts = new Date(now.getTime() - h * 30 * 60 * 1000);
      const hour = ts.getHours() + ts.getMinutes() / 60;
      const factor = this._dailyCurve(hour);
      for (const loc of LOCATIONS) {
        const people = Math.round(loc.capacity * factor * (0.7 + Math.random() * 0.3));
        history.push({
          location_id: loc.id,
          timestamp: ts,
          people_count: people,
          capacity: loc.capacity,
          occupancy_pct: Math.round((people / loc.capacity) * 100),
        });
      }
    }
    return history;
  }

  private _initHeatmaps(): Record<string, HeatmapZone[]> {
    return this._generateHeatmaps();
  }

  private _generateHeatmaps(): Record<string, HeatmapZone[]> {
    const result: Record<string, HeatmapZone[]> = {};
    for (const loc of LOCATIONS) {
      const cams = this.cameras().filter(c => c.location_id === loc.id && c.status === 'active');
      const occ = cams.length ? cams.reduce((s, c) => s + c.people_count, 0) / loc.capacity : 0.3;
      result[loc.id] = [
        { zone_name: 'Entrance', intensity: Math.min(1, occ * 0.6 + Math.random() * 0.2) },
        { zone_name: 'Waiting Area', intensity: Math.min(1, occ * 1.1 + Math.random() * 0.1) },
        { zone_name: 'Service Counters', intensity: Math.min(1, occ * 0.8 + Math.random() * 0.15) },
        { zone_name: 'Exit', intensity: Math.min(1, occ * 0.3 + Math.random() * 0.1) },
      ];
    }
    return result;
  }
}
