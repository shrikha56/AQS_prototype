import { Component, inject, signal } from '@angular/core';
import { SignageService } from './signage.service';

type SignageTab = 'displays' | 'playlists' | 'schedules' | 'media' | 'emergency';

@Component({
  selector: 'app-signage-admin',
  standalone: true,
  template: `
    <div class="signage-admin">
      <!-- Emergency Banner -->
      @if (signageService.emergency_override().active) {
        <div class="emergency-banner">
          <span class="material-symbols-rounded" style="font-size: 20px;">warning</span>
          <span>EMERGENCY OVERRIDE ACTIVE: {{ signageService.emergency_override().message }}</span>
          <button class="btn btn-sm" (click)="signageService.deactivateEmergency()">
            <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
            Dismiss
          </button>
        </div>
      }

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-header">
            <span class="material-symbols-rounded stat-icon">monitor</span>
          </div>
          <div class="stat-value">{{ signageService.total_displays() }}</div>
          <div class="stat-label">Total Displays</div>
        </div>
        <div class="stat-card card">
          <div class="stat-header">
            <span class="material-symbols-rounded stat-icon online">check_circle</span>
          </div>
          <div class="stat-value">{{ signageService.online_count() }}</div>
          <div class="stat-label">Online</div>
        </div>
        <div class="stat-card card">
          <div class="stat-header">
            <span class="material-symbols-rounded stat-icon offline">error</span>
          </div>
          <div class="stat-value">{{ signageService.offline_count() }}</div>
          <div class="stat-label">Offline / Error</div>
        </div>
        <div class="stat-card card">
          <div class="stat-header">
            <span class="material-symbols-rounded stat-icon">playlist_play</span>
          </div>
          <div class="stat-value">{{ signageService.playlists().length }}</div>
          <div class="stat-label">Playlists</div>
        </div>
        <div class="stat-card card">
          <div class="stat-header">
            <span class="material-symbols-rounded stat-icon">schedule</span>
          </div>
          <div class="stat-value">{{ signageService.schedules().length }}</div>
          <div class="stat-label">Schedules</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        @for (tab of tabs; track tab.id) {
          <button class="tab-btn" [class.active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
            <span class="material-symbols-rounded" style="font-size: 18px;">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Displays Tab -->
      @if (activeTab() === 'displays') {
        <div class="card">
          <div class="card-header">
            <h3>Display Inventory</h3>
            <div class="header-actions">
              <select class="filter-select" (change)="zoneFilter.set(asSelect($event).value)">
                <option value="">All Zones</option>
                @for (zone of signageService.zones(); track zone.id) {
                  <option [value]="zone.id">{{ zone.name }}</option>
                }
              </select>
            </div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Display</th>
                <th>Location</th>
                <th>Status</th>
                <th>Resolution</th>
                <th>Playlist</th>
                <th>Last Heartbeat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (display of filteredDisplays(); track display.id) {
                <tr>
                  <td class="display-name">
                    <span class="material-symbols-rounded" style="font-size: 18px; color: var(--primary); vertical-align: middle; margin-right: 6px;">
                      {{ display.assigned_playlist_id === 'pl-2' ? 'touch_app' : 'tv' }}
                    </span>
                    {{ display.name }}
                  </td>
                  <td>{{ display.location }}</td>
                  <td>
                    <span class="badge"
                      [class.badge-success]="display.status === 'online'"
                      [class.badge-error]="display.status === 'offline' || display.status === 'error'">
                      {{ display.status }}
                    </span>
                  </td>
                  <td class="mono">{{ display.resolution }}</td>
                  <td>
                    @if (display.assigned_playlist_id) {
                      <span class="badge badge-primary">{{ signageService.getPlaylistName(display.assigned_playlist_id) }}</span>
                    } @else {
                      <span class="badge badge-warning">Unassigned</span>
                    }
                  </td>
                  <td>{{ getTimeSince(display.last_heartbeat) }}</td>
                  <td>
                    <div class="row-actions">
                      <button class="icon-btn" title="Assign playlist" aria-label="Assign playlist"
                              (click)="showPlaylistAssign.set(showPlaylistAssign() === display.id ? null : display.id)">
                        <span class="material-symbols-rounded">playlist_add</span>
                      </button>
                      <button class="icon-btn" title="Preview" aria-label="Preview display">
                        <span class="material-symbols-rounded">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
                @if (showPlaylistAssign() === display.id) {
                  <tr class="assign-row">
                    <td colspan="7">
                      <div class="assign-panel">
                        <span class="assign-label">Assign playlist:</span>
                        @for (pl of signageService.playlists(); track pl.id) {
                          @if (!pl.is_emergency) {
                            <button class="btn btn-sm"
                              [class.btn-primary]="display.assigned_playlist_id === pl.id"
                              [class.btn-outline]="display.assigned_playlist_id !== pl.id"
                              (click)="assignPlaylist(display.id, pl.id)">
                              {{ pl.name }}
                            </button>
                          }
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Playlists Tab -->
      @if (activeTab() === 'playlists') {
        <div class="playlists-grid">
          @for (pl of signageService.playlists(); track pl.id) {
            <div class="card playlist-card" [class.emergency]="pl.is_emergency">
              <div class="pl-header">
                <span class="material-symbols-rounded" style="font-size: 24px;">
                  {{ pl.is_emergency ? 'warning' : 'playlist_play' }}
                </span>
                <div>
                  <h4>{{ pl.name }}</h4>
                  <p class="pl-desc">{{ pl.description }}</p>
                </div>
              </div>
              <div class="pl-media-list">
                @for (mid of pl.media_ids; track mid) {
                  <div class="pl-media-item">
                    <span class="material-symbols-rounded" style="font-size: 16px;">{{ getMediaIcon(mid) }}</span>
                    {{ signageService.getMediaName(mid) }}
                  </div>
                }
              </div>
              <div class="pl-footer">
                <span class="badge" [class.badge-info]="!pl.is_emergency" [class.badge-error]="pl.is_emergency">
                  {{ pl.media_ids.length }} item{{ pl.media_ids.length !== 1 ? 's' : '' }}
                </span>
                @if (pl.loop) {
                  <span class="badge badge-info">Loop</span>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Schedules Tab -->
      @if (activeTab() === 'schedules') {
        <div class="card">
          <div class="card-header">
            <h3>Content Schedules</h3>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Schedule</th>
                <th>Playlist</th>
                <th>Zone</th>
                <th>Time Window</th>
                <th>Cron</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (sch of signageService.schedules(); track sch.id) {
                <tr>
                  <td class="display-name">
                    <span class="material-symbols-rounded" style="font-size: 18px; color: var(--primary); vertical-align: middle; margin-right: 6px;">event</span>
                    {{ sch.name }}
                  </td>
                  <td>
                    <span class="badge badge-primary">{{ signageService.getPlaylistName(sch.playlist_id) }}</span>
                  </td>
                  <td>{{ signageService.getZoneName(sch.zone_id) }}</td>
                  <td class="mono">{{ sch.start_time }} - {{ sch.end_time }}</td>
                  <td class="mono cron-cell">{{ sch.cron }}</td>
                  <td>
                    <span class="priority-badge" [class.high]="sch.priority >= 10">P{{ sch.priority }}</span>
                  </td>
                  <td>
                    <span class="badge badge-success">{{ sch.status }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Schedule Timeline Visual -->
        <div class="card">
          <div class="card-header">
            <h3>Daily Timeline</h3>
            <span class="badge badge-info">Norwalk HQ</span>
          </div>
          <div class="timeline">
            <div class="timeline-hours">
              @for (h of timelineHours; track h) {
                <span class="tl-hour">{{ h }}</span>
              }
            </div>
            <div class="timeline-track lobby">
              <div class="tl-label">Lobby</div>
              <div class="tl-bar queue" style="left: 33.3%; width: 37.5%;">Queue Display</div>
              <div class="tl-bar idle" style="left: 70.8%; width: 29.2%;">Idle</div>
              <div class="tl-bar idle" style="left: 0%; width: 33.3%;">Idle</div>
            </div>
            <div class="timeline-track kiosks">
              <div class="tl-label">Kiosks</div>
              <div class="tl-bar kiosk-active" style="left: 33.3%; width: 37.5%;">Kiosk Active</div>
              <div class="tl-bar idle" style="left: 70.8%; width: 29.2%;">Screensaver</div>
              <div class="tl-bar idle" style="left: 0%; width: 33.3%;">Screensaver</div>
            </div>
          </div>
        </div>
      }

      <!-- Media Tab -->
      @if (activeTab() === 'media') {
        <div class="card">
          <div class="card-header">
            <h3>Media Library</h3>
          </div>
          <div class="media-grid">
            @for (item of signageService.media(); track item.id) {
              <div class="media-card">
                <div class="media-thumb">
                  <span class="material-symbols-rounded">{{ item.thumbnail }}</span>
                </div>
                <div class="media-info">
                  <div class="media-name">{{ item.name }}</div>
                  <div class="media-meta">
                    <span class="badge badge-info">{{ item.type }}</span>
                    @if (item.duration > 0) {
                      <span class="media-dur">{{ item.duration }}s</span>
                    } @else {
                      <span class="media-dur">Live</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Emergency Tab -->
      @if (activeTab() === 'emergency') {
        <div class="emergency-panel">
          <div class="card emergency-card">
            <div class="card-header">
              <h3>
                <span class="material-symbols-rounded" style="font-size: 20px; color: var(--error); vertical-align: middle; margin-right: 8px;">warning</span>
                Emergency Broadcast Override
              </h3>
            </div>
            <p class="emergency-desc">
              Activating an emergency override will immediately push the emergency playlist to ALL displays across ALL zones.
              This overrides all active schedules and requires manual dismissal.
            </p>
            @if (!signageService.emergency_override().active) {
              <div class="emergency-form">
                <label class="form-label">Emergency Message</label>
                <textarea rows="3"
                  placeholder="Enter emergency message (e.g., Building evacuation in progress...)"
                  [value]="emergencyMessage()"
                  (input)="emergencyMessage.set(asInput($event).value)">
                </textarea>
                <div class="emergency-presets">
                  <span class="presets-label">Quick presets:</span>
                  <button class="btn btn-outline btn-sm" (click)="emergencyMessage.set('Building evacuation in progress. Please proceed to nearest exit.')">
                    Evacuation
                  </button>
                  <button class="btn btn-outline btn-sm" (click)="emergencyMessage.set('Office is now closed due to severe weather. Please check website for updates.')">
                    Weather Closure
                  </button>
                  <button class="btn btn-outline btn-sm" (click)="emergencyMessage.set('System maintenance in progress. Services temporarily unavailable.')">
                    Maintenance
                  </button>
                </div>
                <button class="btn btn-error btn-lg activate-btn"
                  [disabled]="!emergencyMessage()"
                  (click)="activateEmergency()">
                  <span class="material-symbols-rounded" style="font-size: 20px;">emergency_share</span>
                  Activate Emergency Override
                </button>
              </div>
            } @else {
              <div class="emergency-active-info">
                <div class="active-message">{{ signageService.emergency_override().message }}</div>
                <div class="active-meta">
                  <span>Activated by: {{ signageService.emergency_override().activated_by }}</span>
                  <span>At: {{ signageService.emergency_override().activated_at?.toLocaleTimeString() }}</span>
                </div>
                <button class="btn btn-outline btn-lg" (click)="signageService.deactivateEmergency()">
                  <span class="material-symbols-rounded" style="font-size: 20px;">close</span>
                  Deactivate Override
                </button>
              </div>
            }
          </div>

          <!-- Affected Displays -->
          <div class="card">
            <div class="card-header">
              <h3>Affected Displays</h3>
              <span class="badge badge-info">{{ signageService.total_displays() }} displays</span>
            </div>
            <div class="affected-grid">
              @for (display of signageService.displays(); track display.id) {
                <div class="affected-item" [class.online]="display.status === 'online'">
                  <span class="material-symbols-rounded" style="font-size: 20px;">
                    {{ display.status === 'online' ? 'tv' : 'tv_off' }}
                  </span>
                  <div>
                    <div class="affected-name">{{ display.name }}</div>
                    <div class="affected-loc">{{ display.location }}</div>
                  </div>
                  <span class="badge"
                    [class.badge-success]="display.status === 'online'"
                    [class.badge-error]="display.status !== 'online'">
                    {{ display.status }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .signage-admin { display: flex; flex-direction: column; gap: 20px; }

    .emergency-banner {
      background: var(--error);
      color: white;
      padding: 12px 20px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      font-size: 14px;
      animation: emergencyPulse 2s ease-in-out infinite;
    }
    .emergency-banner .btn { margin-left: auto; background: rgba(255,255,255,0.2); color: white; border: none; }
    @keyframes emergencyPulse {
      0%, 100% { box-shadow: 0 0 0 0 hsla(0, 70%, 50%, 0.4); }
      50% { box-shadow: 0 0 20px 4px hsla(0, 70%, 50%, 0.2); }
    }

    .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
    .stat-card { padding: 16px 20px; }
    .stat-header { margin-bottom: 8px; }
    .stat-icon { font-size: 22px; color: var(--primary); }
    .stat-icon.online { color: var(--success); }
    .stat-icon.offline { color: var(--error); }
    .stat-value { font-size: 28px; font-weight: 800; color: var(--base-content); }
    .stat-label { font-size: 12px; color: var(--neutral); margin-top: 2px; }

    .tabs-bar {
      display: flex;
      gap: 4px;
      background: var(--base-100);
      border-radius: var(--radius);
      padding: 4px;
      box-shadow: var(--shadow);
    }
    .tab-btn {
      padding: 10px 20px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      color: var(--neutral);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      background: transparent;
      border: none;
      cursor: pointer;
    }
    .tab-btn:hover { background: var(--base-200); color: var(--base-content); }
    .tab-btn.active { background: var(--primary); color: var(--primary-content); }

    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-header h3 { font-size: 15px; font-weight: 700; }
    .header-actions { display: flex; gap: 8px; }

    .filter-select {
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--base-200);
      font-size: 13px;
      background: var(--base-100);
      color: var(--base-content);
    }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--neutral);
      padding: 10px 16px;
      border-bottom: 2px solid var(--base-200);
    }
    .data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--base-200);
      font-size: 13px;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .display-name { font-weight: 600; }
    .cron-cell { font-size: 12px; color: var(--neutral); }

    .row-actions { display: flex; gap: 4px; }
    .icon-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: var(--neutral);
      border: 1px solid var(--base-200);
      cursor: pointer;
      transition: all 0.15s;
    }
    .icon-btn:hover { background: var(--primary-wash); color: var(--primary); border-color: var(--primary); }
    .icon-btn .material-symbols-rounded { font-size: 16px; }

    .assign-row td { background: var(--primary-wash); padding: 0; }
    .assign-panel {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      flex-wrap: wrap;
    }
    .assign-label { font-size: 12px; font-weight: 600; color: var(--neutral); }

    .priority-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 100px;
      background: var(--base-200);
      color: var(--neutral);
    }
    .priority-badge.high { background: var(--primary-wash); color: var(--primary); }

    .playlists-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .playlist-card { padding: 20px; }
    .playlist-card.emergency { border: 1.5px solid var(--error); }
    .pl-header { display: flex; gap: 12px; margin-bottom: 16px; }
    .pl-header h4 { font-size: 15px; font-weight: 700; }
    .pl-desc { font-size: 12px; color: var(--neutral); margin-top: 2px; }
    .pl-media-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .pl-media-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--base-200);
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
    }
    .pl-footer { display: flex; gap: 8px; }

    .timeline { margin-top: 8px; }
    .timeline-hours {
      display: flex;
      padding-left: 72px;
      margin-bottom: 4px;
    }
    .tl-hour {
      flex: 1;
      font-size: 10px;
      color: var(--neutral);
      text-align: center;
    }
    .timeline-track {
      display: flex;
      align-items: center;
      height: 40px;
      position: relative;
      margin-bottom: 4px;
    }
    .tl-label {
      width: 72px;
      font-size: 12px;
      font-weight: 600;
      color: var(--base-content);
      flex-shrink: 0;
    }
    .tl-bar {
      position: absolute;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: white;
    }
    .tl-bar.queue { background: var(--primary); }
    .tl-bar.kiosk-active { background: var(--accent); color: var(--accent-content); }
    .tl-bar.idle { background: var(--base-300); color: var(--neutral); }

    .media-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .media-card {
      border: 1px solid var(--base-200);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .media-thumb {
      height: 80px;
      background: var(--base-200);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--neutral);
    }
    .media-thumb .material-symbols-rounded { font-size: 32px; }
    .media-info { padding: 12px; }
    .media-name { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .media-meta { display: flex; align-items: center; gap: 8px; }
    .media-dur { font-size: 11px; color: var(--neutral); }

    .emergency-panel { display: flex; flex-direction: column; gap: 20px; }
    .emergency-card { padding: 24px; }
    .emergency-desc { font-size: 14px; color: var(--neutral); margin-bottom: 24px; line-height: 1.6; }
    .emergency-form { display: flex; flex-direction: column; gap: 16px; }
    .form-label { font-size: 13px; font-weight: 600; }
    textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid var(--base-200);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-family: inherit;
      background: var(--base-100);
      color: var(--base-content);
      resize: vertical;
    }
    textarea:focus { border-color: var(--error); outline: none; box-shadow: 0 0 0 3px var(--error-light); }
    .emergency-presets { display: flex; align-items: center; gap: 8px; }
    .presets-label { font-size: 12px; color: var(--neutral); font-weight: 500; }
    .activate-btn { margin-top: 8px; }
    .btn-sm { padding: 6px 14px; font-size: 12px; }

    .emergency-active-info {
      text-align: center;
      padding: 24px;
    }
    .active-message {
      font-size: 18px;
      font-weight: 700;
      color: var(--error);
      padding: 20px;
      background: var(--error-light);
      border-radius: var(--radius);
      margin-bottom: 16px;
    }
    .active-meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      font-size: 13px;
      color: var(--neutral);
      margin-bottom: 20px;
    }

    .affected-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .affected-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--base-200);
      border-radius: var(--radius-sm);
      color: var(--neutral);
    }
    .affected-item.online { border-color: var(--success); background: var(--success-light); color: var(--base-content); }
    .affected-name { font-size: 13px; font-weight: 600; }
    .affected-loc { font-size: 11px; color: var(--neutral); }

    @media (max-width: 1200px) {
      .stats-row { grid-template-columns: repeat(3, 1fr); }
      .playlists-grid { grid-template-columns: repeat(2, 1fr); }
      .media-grid { grid-template-columns: repeat(2, 1fr); }
      .affected-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class SignageAdminComponent {
  readonly signageService = inject(SignageService);

  readonly activeTab = signal<SignageTab>('displays');
  readonly zoneFilter = signal('');
  readonly showPlaylistAssign = signal<string | null>(null);
  readonly emergencyMessage = signal('');

  readonly tabs: { id: SignageTab; label: string; icon: string }[] = [
    { id: 'displays', label: 'Displays', icon: 'tv' },
    { id: 'playlists', label: 'Playlists', icon: 'playlist_play' },
    { id: 'schedules', label: 'Schedules', icon: 'schedule' },
    { id: 'media', label: 'Media', icon: 'perm_media' },
    { id: 'emergency', label: 'Emergency', icon: 'warning' },
  ];

  readonly timelineHours = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];

  asSelect(event: Event): HTMLSelectElement {
    return event.target as HTMLSelectElement;
  }

  asInput(event: Event): HTMLInputElement {
    return event.target as HTMLInputElement;
  }

  filteredDisplays() {
    const zone = this.zoneFilter();
    if (!zone) return this.signageService.displays();
    return this.signageService.displays().filter(d => d.zone_id === zone);
  }

  getTimeSince(date: Date): string {
    const diff = Math.round((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.round(diff / 60)}h ago`;
  }

  getMediaIcon(media_id: string): string {
    return this.signageService.media().find(m => m.id === media_id)?.thumbnail ?? 'article';
  }

  assignPlaylist(display_id: string, playlist_id: string): void {
    this.signageService.assignPlaylist(display_id, playlist_id);
    this.showPlaylistAssign.set(null);
  }

  activateEmergency(): void {
    this.signageService.activateEmergency(this.emergencyMessage());
    this.emergencyMessage.set('');
  }
}
