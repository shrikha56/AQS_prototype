import { Injectable, signal, computed } from '@angular/core';

export type MediaType = 'webpage' | 'image' | 'video' | 'html';
export type DisplayStatus = 'online' | 'offline' | 'error';
export type ScheduleStatus = 'active' | 'scheduled' | 'expired';

export interface SignageMedia {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number;
  thumbnail: string;
}

export interface SignagePlaylist {
  id: string;
  name: string;
  description: string;
  media_ids: string[];
  loop: boolean;
  is_emergency: boolean;
}

export interface SignageDisplay {
  id: string;
  name: string;
  location: string;
  zone_id: string;
  status: DisplayStatus;
  resolution: string;
  assigned_playlist_id: string | null;
  last_heartbeat: Date;
}

export interface SignageZone {
  id: string;
  name: string;
  location_id: string;
  display_ids: string[];
}

export interface SignageSchedule {
  id: string;
  name: string;
  playlist_id: string;
  zone_id: string;
  cron: string;
  priority: number;
  status: ScheduleStatus;
  start_time: string;
  end_time: string;
}

export interface EmergencyOverride {
  active: boolean;
  message: string;
  playlist_id: string | null;
  activated_at: Date | null;
  activated_by: string | null;
}

@Injectable({ providedIn: 'root' })
export class SignageService {

  readonly media = signal<SignageMedia[]>([
    { id: 'media-1', name: 'AQS Queue Display', type: 'webpage', url: '/queue', duration: 0, thumbnail: 'queue' },
    { id: 'media-2', name: 'AQS Kiosk (Idle)', type: 'webpage', url: '/kiosk', duration: 0, thumbnail: 'kiosk' },
    { id: 'media-3', name: 'Welcome Banner', type: 'image', url: '/assets/welcome.png', duration: 10, thumbnail: 'image' },
    { id: 'media-4', name: 'Office Hours Info', type: 'html', url: '', duration: 15, thumbnail: 'code' },
    { id: 'media-5', name: 'RR/CC Promo Video', type: 'video', url: '/assets/promo.mp4', duration: 30, thumbnail: 'movie' },
    { id: 'media-6', name: 'Counter Closed', type: 'html', url: '', duration: 0, thumbnail: 'block' },
    { id: 'media-7', name: 'Emergency Alert', type: 'html', url: '', duration: 0, thumbnail: 'warning' },
    { id: 'media-8', name: 'Service Info Cards', type: 'html', url: '', duration: 20, thumbnail: 'info' },
  ]);

  readonly playlists = signal<SignagePlaylist[]>([
    { id: 'pl-1', name: 'Lobby Queue Display', description: 'Live queue status for lobby screens', media_ids: ['media-1'], loop: true, is_emergency: false },
    { id: 'pl-2', name: 'Kiosk Active', description: 'Self-service kiosk during operating hours', media_ids: ['media-2'], loop: true, is_emergency: false },
    { id: 'pl-3', name: 'Kiosk Idle', description: 'Branded screensaver for after-hours kiosks', media_ids: ['media-3', 'media-5', 'media-8'], loop: true, is_emergency: false },
    { id: 'pl-4', name: 'Counter Break', description: 'Displayed when a counter is paused', media_ids: ['media-6'], loop: true, is_emergency: false },
    { id: 'pl-5', name: 'Emergency Broadcast', description: 'Emergency override for all displays', media_ids: ['media-7'], loop: true, is_emergency: true },
    { id: 'pl-6', name: 'Welcome Loop', description: 'Mixed content for lobby digital signage', media_ids: ['media-1', 'media-3', 'media-5', 'media-8'], loop: true, is_emergency: false },
  ]);

  readonly displays = signal<SignageDisplay[]>([
    { id: 'dsp-1', name: 'Norwalk Lobby Screen 1', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '3840x2160', assigned_playlist_id: 'pl-1', last_heartbeat: new Date() },
    { id: 'dsp-2', name: 'Norwalk Lobby Screen 2', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '3840x2160', assigned_playlist_id: 'pl-6', last_heartbeat: new Date() },
    { id: 'dsp-3', name: 'Norwalk Kiosk 1', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '1920x1080', assigned_playlist_id: 'pl-2', last_heartbeat: new Date() },
    { id: 'dsp-4', name: 'Norwalk Kiosk 2', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '1920x1080', assigned_playlist_id: 'pl-2', last_heartbeat: new Date() },
    { id: 'dsp-5', name: 'Norwalk Counter 3', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '1920x1080', assigned_playlist_id: null, last_heartbeat: new Date() },
    { id: 'dsp-6', name: 'Lancaster Lobby', location: 'Lancaster', zone_id: 'zone-2', status: 'online', resolution: '1920x1080', assigned_playlist_id: 'pl-1', last_heartbeat: new Date() },
    { id: 'dsp-7', name: 'Lancaster Kiosk', location: 'Lancaster', zone_id: 'zone-2', status: 'offline', resolution: '1920x1080', assigned_playlist_id: 'pl-2', last_heartbeat: new Date(Date.now() - 3600000) },
    { id: 'dsp-8', name: 'Van Nuys Lobby', location: 'Van Nuys', zone_id: 'zone-3', status: 'online', resolution: '1920x1080', assigned_playlist_id: 'pl-1', last_heartbeat: new Date() },
    { id: 'dsp-9', name: 'Van Nuys Kiosk 1', location: 'Van Nuys', zone_id: 'zone-3', status: 'error', resolution: '1920x1080', assigned_playlist_id: 'pl-2', last_heartbeat: new Date(Date.now() - 7200000) },
  ]);

  readonly zones = signal<SignageZone[]>([
    { id: 'zone-1', name: 'Norwalk HQ', location_id: 'norwalk', display_ids: ['dsp-1', 'dsp-2', 'dsp-3', 'dsp-4', 'dsp-5'] },
    { id: 'zone-2', name: 'Lancaster Office', location_id: 'lancaster', display_ids: ['dsp-6', 'dsp-7'] },
    { id: 'zone-3', name: 'Van Nuys Office', location_id: 'vannuys', display_ids: ['dsp-8', 'dsp-9'] },
  ]);

  readonly schedules = signal<SignageSchedule[]>([
    { id: 'sch-1', name: 'Weekday Queue Display', playlist_id: 'pl-1', zone_id: 'zone-1', cron: '0 8 * * 1-5', priority: 10, status: 'active', start_time: '08:00', end_time: '17:00' },
    { id: 'sch-2', name: 'Kiosk Business Hours', playlist_id: 'pl-2', zone_id: 'zone-1', cron: '0 8 * * 1-5', priority: 10, status: 'active', start_time: '08:00', end_time: '17:00' },
    { id: 'sch-3', name: 'Kiosk After Hours', playlist_id: 'pl-3', zone_id: 'zone-1', cron: '0 17 * * 1-5', priority: 5, status: 'active', start_time: '17:00', end_time: '08:00' },
    { id: 'sch-4', name: 'Weekend Idle', playlist_id: 'pl-3', zone_id: 'zone-1', cron: '0 0 * * 0,6', priority: 5, status: 'active', start_time: '00:00', end_time: '23:59' },
    { id: 'sch-5', name: 'Lancaster Weekday', playlist_id: 'pl-1', zone_id: 'zone-2', cron: '0 9 * * 1-5', priority: 10, status: 'active', start_time: '09:00', end_time: '16:00' },
  ]);

  readonly emergency_override = signal<EmergencyOverride>({
    active: false,
    message: '',
    playlist_id: null,
    activated_at: null,
    activated_by: null,
  });

  readonly online_count = computed(() => this.displays().filter(d => d.status === 'online').length);
  readonly offline_count = computed(() => this.displays().filter(d => d.status !== 'online').length);
  readonly total_displays = computed(() => this.displays().length);

  getPlaylistName(id: string): string {
    return this.playlists().find(p => p.id === id)?.name ?? 'Unassigned';
  }

  getMediaName(id: string): string {
    return this.media().find(m => m.id === id)?.name ?? 'Unknown';
  }

  getZoneName(id: string): string {
    return this.zones().find(z => z.id === id)?.name ?? 'Unknown';
  }

  assignPlaylist(display_id: string, playlist_id: string): void {
    this.displays.update(d => d.map(display =>
      display.id === display_id ? { ...display, assigned_playlist_id: playlist_id } : display
    ));
  }

  activateEmergency(message: string): void {
    this.emergency_override.set({
      active: true,
      message,
      playlist_id: 'pl-5',
      activated_at: new Date(),
      activated_by: 'Maria Chen',
    });
  }

  deactivateEmergency(): void {
    this.emergency_override.set({
      active: false,
      message: '',
      playlist_id: null,
      activated_at: null,
      activated_by: null,
    });
  }
}
