import { Injectable, signal, computed } from '@angular/core';

export type MediaType = 'webpage' | 'image' | 'video' | 'html';
export type DisplayStatus = 'online' | 'offline' | 'error';
export type ScheduleStatus = 'active' | 'scheduled' | 'expired';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';
export type Orientation = 'landscape' | 'portrait';
export type AnimationStyle = 'fade' | 'slide' | 'none';

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
  enabled: boolean;
  orientation: Orientation;
  animation: AnimationStyle;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: Date | null;
}

export interface SignageDisplay {
  id: string;
  name: string;
  location: string;
  zone_id: string;
  status: DisplayStatus;
  resolution: string;
  assigned_playlist_ids: string[];
  last_heartbeat: Date;
}

export interface SignageZone {
  id: string;
  name: string;
  location_id: string;
  display_ids: string[];
  playlist_ids: string[];
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

let _next_id = 100;
function generateId(prefix: string): string {
  return `${prefix}-${++_next_id}`;
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
    { id: 'pl-1', name: 'Lobby Queue Display', description: 'Live queue status for lobby screens', media_ids: ['media-1'], loop: true, is_emergency: false, enabled: true, orientation: 'landscape', animation: 'fade', approval_status: 'approved', approved_by: 'Maria Chen', approved_at: new Date(Date.now() - 86400000) },
    { id: 'pl-2', name: 'Kiosk Active', description: 'Self-service kiosk during operating hours', media_ids: ['media-2'], loop: true, is_emergency: false, enabled: true, orientation: 'portrait', animation: 'fade', approval_status: 'approved', approved_by: 'Maria Chen', approved_at: new Date(Date.now() - 86400000) },
    { id: 'pl-3', name: 'Kiosk Idle', description: 'Branded screensaver for after-hours kiosks', media_ids: ['media-3', 'media-5', 'media-8'], loop: true, is_emergency: false, enabled: true, orientation: 'portrait', animation: 'slide', approval_status: 'approved', approved_by: 'Maria Chen', approved_at: new Date(Date.now() - 172800000) },
    { id: 'pl-4', name: 'Counter Break', description: 'Displayed when a counter is paused', media_ids: ['media-6'], loop: true, is_emergency: false, enabled: true, orientation: 'landscape', animation: 'none', approval_status: 'pending', approved_by: null, approved_at: null },
    { id: 'pl-5', name: 'Emergency Broadcast', description: 'Emergency override for all displays', media_ids: ['media-7'], loop: true, is_emergency: true, enabled: true, orientation: 'landscape', animation: 'none', approval_status: 'approved', approved_by: 'System', approved_at: new Date() },
    { id: 'pl-6', name: 'Welcome Loop', description: 'Mixed content for lobby digital signage', media_ids: ['media-1', 'media-3', 'media-5', 'media-8'], loop: true, is_emergency: false, enabled: true, orientation: 'landscape', animation: 'fade', approval_status: 'rejected', approved_by: 'Admin', approved_at: new Date(Date.now() - 43200000) },
  ]);

  readonly displays = signal<SignageDisplay[]>([
    { id: 'dsp-1', name: 'Norwalk Lobby Screen 1', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '3840x2160', assigned_playlist_ids: ['pl-1'], last_heartbeat: new Date() },
    { id: 'dsp-2', name: 'Norwalk Lobby Screen 2', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '3840x2160', assigned_playlist_ids: ['pl-6'], last_heartbeat: new Date() },
    { id: 'dsp-3', name: 'Norwalk Kiosk 1', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '1920x1080', assigned_playlist_ids: ['pl-2'], last_heartbeat: new Date() },
    { id: 'dsp-4', name: 'Norwalk Kiosk 2', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '1920x1080', assigned_playlist_ids: ['pl-2'], last_heartbeat: new Date() },
    { id: 'dsp-5', name: 'Norwalk Counter 3', location: 'Norwalk HQ', zone_id: 'zone-1', status: 'online', resolution: '1920x1080', assigned_playlist_ids: [], last_heartbeat: new Date() },
    { id: 'dsp-6', name: 'Lancaster Lobby', location: 'Lancaster', zone_id: 'zone-2', status: 'online', resolution: '1920x1080', assigned_playlist_ids: ['pl-1'], last_heartbeat: new Date() },
    { id: 'dsp-7', name: 'Lancaster Kiosk', location: 'Lancaster', zone_id: 'zone-2', status: 'offline', resolution: '1920x1080', assigned_playlist_ids: ['pl-2'], last_heartbeat: new Date(Date.now() - 3600000) },
    { id: 'dsp-8', name: 'Van Nuys Lobby', location: 'Van Nuys', zone_id: 'zone-3', status: 'online', resolution: '1920x1080', assigned_playlist_ids: ['pl-1'], last_heartbeat: new Date() },
    { id: 'dsp-9', name: 'Van Nuys Kiosk 1', location: 'Van Nuys', zone_id: 'zone-3', status: 'error', resolution: '1920x1080', assigned_playlist_ids: ['pl-2'], last_heartbeat: new Date(Date.now() - 7200000) },
  ]);

  readonly zones = signal<SignageZone[]>([
    { id: 'zone-1', name: 'Norwalk HQ', location_id: 'norwalk', display_ids: ['dsp-1', 'dsp-2', 'dsp-3', 'dsp-4', 'dsp-5'], playlist_ids: ['pl-1', 'pl-2', 'pl-3', 'pl-6'] },
    { id: 'zone-2', name: 'Lancaster Office', location_id: 'lancaster', display_ids: ['dsp-6', 'dsp-7'], playlist_ids: ['pl-1', 'pl-2'] },
    { id: 'zone-3', name: 'Van Nuys Office', location_id: 'vannuys', display_ids: ['dsp-8', 'dsp-9'], playlist_ids: ['pl-1', 'pl-2'] },
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

  // ── Lookup helpers ──

  getPlaylistName(id: string): string {
    return this.playlists().find(p => p.id === id)?.name ?? 'Unassigned';
  }

  getMediaName(id: string): string {
    return this.media().find(m => m.id === id)?.name ?? 'Unknown';
  }

  getMediaItem(id: string): SignageMedia | undefined {
    return this.media().find(m => m.id === id);
  }

  getZoneName(id: string): string {
    return this.zones().find(z => z.id === id)?.name ?? 'Unknown';
  }

  getZoneDisplayCount(zone_id: string): number {
    return this.zones().find(z => z.id === zone_id)?.display_ids.length ?? 0;
  }

  getPlaylist(id: string): SignagePlaylist | undefined {
    return this.playlists().find(p => p.id === id);
  }

  getZone(id: string): SignageZone | undefined {
    return this.zones().find(z => z.id === id);
  }

  // ── Media CRUD ──

  addMedia(item: Omit<SignageMedia, 'id'>): void {
    const id = generateId('media');
    this.media.update(list => [...list, { ...item, id }]);
  }

  updateMedia(id: string, changes: Partial<SignageMedia>): void {
    this.media.update(list => list.map(m => m.id === id ? { ...m, ...changes } : m));
  }

  deleteMedia(id: string): void {
    this.media.update(list => list.filter(m => m.id !== id));
    // Also remove from playlists
    this.playlists.update(list => list.map(pl => ({
      ...pl,
      media_ids: pl.media_ids.filter(mid => mid !== id),
    })));
  }

  // ── Playlist CRUD ──

  addPlaylist(item: Omit<SignagePlaylist, 'id'>): void {
    const id = generateId('pl');
    this.playlists.update(list => [...list, { ...item, id }]);
  }

  updatePlaylist(id: string, changes: Partial<SignagePlaylist>): void {
    this.playlists.update(list => list.map(p => p.id === id ? { ...p, ...changes } : p));
  }

  deletePlaylist(id: string): void {
    this.playlists.update(list => list.filter(p => p.id !== id));
    // Remove from displays
    this.displays.update(list => list.map(d => ({
      ...d,
      assigned_playlist_ids: d.assigned_playlist_ids.filter(pid => pid !== id),
    })));
    // Remove from zones
    this.zones.update(list => list.map(z => ({
      ...z,
      playlist_ids: z.playlist_ids.filter(pid => pid !== id),
    })));
    // Remove schedules using this playlist
    this.schedules.update(list => list.filter(s => s.playlist_id !== id));
  }

  addMediaToPlaylist(playlist_id: string, media_id: string): void {
    this.playlists.update(list => list.map(p =>
      p.id === playlist_id && !p.media_ids.includes(media_id)
        ? { ...p, media_ids: [...p.media_ids, media_id] }
        : p
    ));
  }

  removeMediaFromPlaylist(playlist_id: string, media_id: string): void {
    this.playlists.update(list => list.map(p =>
      p.id === playlist_id
        ? { ...p, media_ids: p.media_ids.filter(mid => mid !== media_id) }
        : p
    ));
  }

  moveMediaInPlaylist(playlist_id: string, from_index: number, direction: 'up' | 'down'): void {
    this.playlists.update(list => list.map(p => {
      if (p.id !== playlist_id) return p;
      const to_index = direction === 'up' ? from_index - 1 : from_index + 1;
      if (to_index < 0 || to_index >= p.media_ids.length) return p;
      const ids = [...p.media_ids];
      [ids[from_index], ids[to_index]] = [ids[to_index], ids[from_index]];
      return { ...p, media_ids: ids };
    }));
  }

  // ── Playlist approval ──

  approvePlaylist(id: string): void {
    this.updatePlaylist(id, {
      approval_status: 'approved',
      approved_by: 'Maria Chen',
      approved_at: new Date(),
    });
  }

  rejectPlaylist(id: string): void {
    this.updatePlaylist(id, {
      approval_status: 'rejected',
      approved_by: 'Maria Chen',
      approved_at: new Date(),
    });
  }

  // ── Display CRUD ──

  addDisplay(item: Omit<SignageDisplay, 'id'>): string {
    const id = generateId('dsp');
    this.displays.update(list => [...list, { ...item, id }]);
    // Add to zone
    if (item.zone_id) {
      this.zones.update(list => list.map(z =>
        z.id === item.zone_id ? { ...z, display_ids: [...z.display_ids, id] } : z
      ));
    }
    return id;
  }

  deleteDisplay(id: string): void {
    this.displays.update(list => list.filter(d => d.id !== id));
    this.zones.update(list => list.map(z => ({
      ...z,
      display_ids: z.display_ids.filter(did => did !== id),
    })));
  }

  // ── Zone CRUD ──

  addZone(item: Omit<SignageZone, 'id'>): string {
    const id = generateId('zone');
    this.zones.update(list => [...list, { ...item, id }]);
    return id;
  }

  deleteZone(id: string): void {
    this.zones.update(list => list.filter(z => z.id !== id));
    // Unassign displays from this zone
    this.displays.update(list => list.map(d =>
      d.zone_id === id ? { ...d, zone_id: '' } : d
    ));
    // Remove schedules targeting this zone
    this.schedules.update(list => list.filter(s => s.zone_id !== id));
  }

  updateZone(id: string, changes: Partial<SignageZone>): void {
    this.zones.update(list => list.map(z => z.id === id ? { ...z, ...changes } : z));
  }

  assignPlaylist(display_id: string, playlist_id: string): void {
    this.displays.update(list => list.map(d =>
      d.id === display_id ? { ...d, assigned_playlist_ids: [playlist_id] } : d
    ));
  }

  addPlaylistToDisplay(display_id: string, playlist_id: string): void {
    this.displays.update(list => list.map(d =>
      d.id === display_id && !d.assigned_playlist_ids.includes(playlist_id)
        ? { ...d, assigned_playlist_ids: [...d.assigned_playlist_ids, playlist_id] }
        : d
    ));
  }

  removePlaylistFromDisplay(display_id: string, playlist_id: string): void {
    this.displays.update(list => list.map(d =>
      d.id === display_id
        ? { ...d, assigned_playlist_ids: d.assigned_playlist_ids.filter(pid => pid !== playlist_id) }
        : d
    ));
  }

  // ── Zone management ──

  addPlaylistToZone(zone_id: string, playlist_id: string): void {
    this.zones.update(list => list.map(z =>
      z.id === zone_id && !z.playlist_ids.includes(playlist_id)
        ? { ...z, playlist_ids: [...z.playlist_ids, playlist_id] }
        : z
    ));
  }

  removePlaylistFromZone(zone_id: string, playlist_id: string): void {
    this.zones.update(list => list.map(z =>
      z.id === zone_id
        ? { ...z, playlist_ids: z.playlist_ids.filter(pid => pid !== playlist_id) }
        : z
    ));
  }

  addDisplayToZone(zone_id: string, display_id: string): void {
    this.zones.update(list => list.map(z =>
      z.id === zone_id && !z.display_ids.includes(display_id)
        ? { ...z, display_ids: [...z.display_ids, display_id] }
        : z
    ));
    this.displays.update(list => list.map(d =>
      d.id === display_id ? { ...d, zone_id } : d
    ));
  }

  removeDisplayFromZone(zone_id: string, display_id: string): void {
    this.zones.update(list => list.map(z =>
      z.id === zone_id
        ? { ...z, display_ids: z.display_ids.filter(did => did !== display_id) }
        : z
    ));
  }

  // ── Schedule CRUD ──

  addSchedule(item: Omit<SignageSchedule, 'id'>): void {
    const id = generateId('sch');
    this.schedules.update(list => [...list, { ...item, id }]);
  }

  deleteSchedule(id: string): void {
    this.schedules.update(list => list.filter(s => s.id !== id));
  }

  // ── Emergency ──

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
