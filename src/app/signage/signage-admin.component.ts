import { Component, inject, signal, computed } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  SignageService,
  SignageDisplay,
  SignageMedia,
  SignagePlaylist,
  SignageSchedule,
  MediaType,
  Orientation,
  AnimationStyle,
  ApprovalStatus,
} from './signage.service';

type SignageTab = 'displays' | 'playlists' | 'schedules' | 'media' | 'zones' | 'emergency';

type ModalType =
  | 'none'
  | 'add-media'
  | 'edit-media'
  | 'preview-media'
  | 'add-playlist'
  | 'edit-playlist'
  | 'add-media-to-playlist'
  | 'select-playlist-for-media'
  | 'add-schedule'
  | 'add-display'
  | 'add-zone'
  | 'confirm-delete';

interface ConfirmDeletePayload {
  entity: 'media' | 'playlist' | 'schedule' | 'display' | 'zone';
  id: string;
  name: string;
}

@Component({
  selector: 'app-signage-admin',
  standalone: true,
  imports: [UpperCasePipe],
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

      <!-- ═══════════════════ DISPLAYS TAB ═══════════════════ -->
      @if (activeTab() === 'displays') {
        <div class="card">
          <div class="card-header">
            <h3>Display Inventory</h3>
            <div class="header-actions">
              <div class="search-box">
                <span class="material-symbols-rounded search-icon">search</span>
                <input type="text" placeholder="Search displays..." [value]="display_search()" (input)="display_search.set(asInput($event).value)">
              </div>
              <select class="filter-select" (change)="zoneFilter.set(asSelect($event).value)">
                <option value="">All Zones</option>
                @for (zone of signageService.zones(); track zone.id) {
                  <option [value]="zone.id">{{ zone.name }}</option>
                }
              </select>
              <button class="btn btn-primary btn-sm" (click)="openAddDisplay()">
                <span class="material-symbols-rounded" style="font-size: 16px;">add</span>
                Add Display
              </button>
            </div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Display</th>
                <th>Location</th>
                <th>Status</th>
                <th>Resolution</th>
                <th>Playlists</th>
                <th>Last Heartbeat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (display of filteredDisplays(); track display.id) {
                <tr>
                  <td class="display-name">
                    <span class="material-symbols-rounded" style="font-size: 18px; color: var(--primary); vertical-align: middle; margin-right: 6px;">
                      {{ display.assigned_playlist_ids.includes('pl-2') ? 'touch_app' : 'tv' }}
                    </span>
                    {{ display.name }}
                  </td>
                  <td>{{ display.location }}</td>
                  <td>
                    <span class="badge"
                      [class.badge-success]="display.status === 'online'"
                      [class.badge-error]="display.status === 'offline' || display.status === 'error'">
                      <span class="status-dot" [class.dot-online]="display.status === 'online'" [class.dot-offline]="display.status !== 'online'"></span>
                      {{ display.status }}
                    </span>
                  </td>
                  <td class="mono">{{ display.resolution }}</td>
                  <td>
                    @if (display.assigned_playlist_ids.length > 0) {
                      <div class="playlist-badges">
                        @for (pid of display.assigned_playlist_ids; track pid) {
                          <span class="badge badge-primary">{{ signageService.getPlaylistName(pid) }}</span>
                        }
                      </div>
                    } @else {
                      <span class="badge badge-warning">Unassigned</span>
                    }
                  </td>
                  <td>{{ getTimeSince(display.last_heartbeat) }}</td>
                  <td>
                    <div class="row-actions">
                      <button class="icon-btn" title="Manage playlists" aria-label="Manage playlists"
                              (click)="showPlaylistAssign.set(showPlaylistAssign() === display.id ? null : display.id)">
                        <span class="material-symbols-rounded">playlist_add</span>
                      </button>
                      <button class="icon-btn" title="Preview" aria-label="Preview display"
                              (click)="previewDisplay.set(previewDisplay() === display.id ? null : display.id)">
                        <span class="material-symbols-rounded">visibility</span>
                      </button>
                      <button class="icon-btn" title="Delete display" aria-label="Delete display"
                              (click)="confirmDelete('display', display.id, display.name)">
                        <span class="material-symbols-rounded">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                @if (previewDisplay() === display.id) {
                  <tr class="preview-row">
                    <td colspan="7" style="padding: 0;">
                      <div class="preview-panel">
                        <div class="preview-header">
                          <div class="preview-title">
                            <span class="material-symbols-rounded" style="font-size: 18px;">tv</span>
                            Preview: {{ display.name }}
                            <span class="badge badge-info">{{ display.resolution }}</span>
                          </div>
                          <button class="icon-btn" (click)="previewDisplay.set(null)" aria-label="Close preview">
                            <span class="material-symbols-rounded">close</span>
                          </button>
                        </div>
                        <div class="preview-frame-wrapper">
                          <iframe
                            [src]="getPreviewUrl(display)"
                            class="preview-iframe"
                            [class.portrait]="isKioskDisplay(display)"
                            frameborder="0"
                            title="Display preview">
                          </iframe>
                          <div class="preview-overlay">
                            <span class="badge badge-success">LIVE</span>
                          </div>
                        </div>
                        <div class="preview-footer">
                          <span class="preview-meta">
                            Playlists: {{ display.assigned_playlist_ids.length > 0 ? getPlaylistNames(display.assigned_playlist_ids) : 'None' }}
                          </span>
                          <span class="preview-meta">
                            Route: {{ getPreviewRoute(display) }}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
                @if (showPlaylistAssign() === display.id) {
                  <tr class="assign-row">
                    <td colspan="7">
                      <div class="assign-panel">
                        <span class="assign-label">Manage playlists:</span>
                        @for (pl of signageService.playlists(); track pl.id) {
                          @if (!pl.is_emergency) {
                            <button class="btn btn-sm"
                              [class.btn-primary]="display.assigned_playlist_ids.includes(pl.id)"
                              [class.btn-outline]="!display.assigned_playlist_ids.includes(pl.id)"
                              (click)="togglePlaylistOnDisplay(display.id, pl.id)">
                              {{ pl.name }}
                              @if (display.assigned_playlist_ids.includes(pl.id)) {
                                <span class="material-symbols-rounded" style="font-size: 14px; margin-left: 4px;">check</span>
                              }
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

      <!-- ═══════════════════ PLAYLISTS TAB ═══════════════════ -->
      @if (activeTab() === 'playlists') {
        <div class="card">
          <div class="card-header">
            <h3>Playlist Library</h3>
            <div class="header-actions">
              <div class="search-box">
                <span class="material-symbols-rounded search-icon">search</span>
                <input type="text" placeholder="Search playlists..." [value]="playlist_search()" (input)="playlist_search.set(asInput($event).value)">
              </div>
              <button class="btn btn-primary btn-sm" (click)="openModal('add-playlist')">
                <span class="material-symbols-rounded" style="font-size: 16px;">add</span>
                New Playlist
              </button>
            </div>
          </div>
        </div>
        <div class="playlists-grid">
          @for (pl of filteredPlaylists(); track pl.id) {
            <div class="card playlist-card" [class.emergency]="pl.is_emergency" [class.disabled-card]="!pl.enabled">
              <div class="pl-header">
                <span class="material-symbols-rounded" style="font-size: 24px;">
                  {{ pl.is_emergency ? 'warning' : 'playlist_play' }}
                </span>
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h4>{{ pl.name }}</h4>
                    @if (!pl.enabled) {
                      <span class="badge badge-warning">Disabled</span>
                    }
                  </div>
                  <p class="pl-desc">{{ pl.description }}</p>
                </div>
                <div class="pl-actions">
                  <button class="icon-btn" title="Edit" (click)="startEditPlaylist(pl)">
                    <span class="material-symbols-rounded">edit</span>
                  </button>
                  @if (!pl.is_emergency) {
                    <button class="icon-btn" title="Delete" (click)="confirmDelete('playlist', pl.id, pl.name)">
                      <span class="material-symbols-rounded">delete</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Approval row -->
              <div class="approval-row">
                <span class="badge"
                  [class.badge-success]="pl.approval_status === 'approved'"
                  [class.badge-warning]="pl.approval_status === 'pending'"
                  [class.badge-error]="pl.approval_status === 'rejected'">
                  {{ pl.approval_status | uppercase }}
                </span>
                @if (pl.approved_by) {
                  <span class="approval-meta">by {{ pl.approved_by }}</span>
                }
                @if (pl.approval_status !== 'approved') {
                  <button class="btn btn-sm btn-success" (click)="signageService.approvePlaylist(pl.id)" title="Approve">
                    <span class="material-symbols-rounded" style="font-size: 14px;">check</span>
                    Approve
                  </button>
                }
                @if (pl.approval_status !== 'rejected') {
                  <button class="btn btn-sm btn-error" (click)="signageService.rejectPlaylist(pl.id)" title="Reject">
                    <span class="material-symbols-rounded" style="font-size: 14px;">close</span>
                    Reject
                  </button>
                }
              </div>

              <!-- Playlist meta -->
              <div class="pl-meta-row">
                <span class="badge badge-info">{{ pl.orientation }}</span>
                <span class="badge badge-info">{{ pl.animation }}</span>
              </div>

              <!-- Media items -->
              <div class="pl-media-list">
                @for (mid of pl.media_ids; track mid; let i = $index) {
                  <div class="pl-media-item">
                    <span class="material-symbols-rounded" style="font-size: 16px;">{{ getMediaIcon(mid) }}</span>
                    <span style="flex: 1;">{{ signageService.getMediaName(mid) }}</span>
                    <div class="item-controls">
                      <button class="icon-btn-mini" [disabled]="i === 0" (click)="signageService.moveMediaInPlaylist(pl.id, i, 'up')" title="Move up">
                        <span class="material-symbols-rounded">arrow_upward</span>
                      </button>
                      <button class="icon-btn-mini" [disabled]="i === pl.media_ids.length - 1" (click)="signageService.moveMediaInPlaylist(pl.id, i, 'down')" title="Move down">
                        <span class="material-symbols-rounded">arrow_downward</span>
                      </button>
                      <button class="icon-btn-mini" (click)="signageService.removeMediaFromPlaylist(pl.id, mid)" title="Remove">
                        <span class="material-symbols-rounded">close</span>
                      </button>
                    </div>
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
                <button class="btn btn-outline btn-sm" style="margin-left: auto;" (click)="openAddMediaToPlaylist(pl.id)">
                  <span class="material-symbols-rounded" style="font-size: 14px;">add</span>
                  Add Media
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ═══════════════════ SCHEDULES TAB ═══════════════════ -->
      @if (activeTab() === 'schedules') {
        <div class="card">
          <div class="card-header">
            <h3>Content Schedules</h3>
            <div class="header-actions">
              <button class="btn btn-primary btn-sm" (click)="openModal('add-schedule')">
                <span class="material-symbols-rounded" style="font-size: 16px;">add</span>
                New Schedule
              </button>
            </div>
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
                <th>Actions</th>
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
                  <td>
                    <button class="icon-btn" title="Delete schedule" (click)="confirmDelete('schedule', sch.id, sch.name)">
                      <span class="material-symbols-rounded">delete</span>
                    </button>
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
            <div class="header-actions">
              <button class="icon-btn" (click)="navigateDay(-1)" title="Previous day" aria-label="Previous day">
                <span class="material-symbols-rounded">chevron_left</span>
              </button>
              <button class="btn btn-outline btn-sm" (click)="goToToday()">Today</button>
              <span class="timeline-date-label">{{ formatTimelineDate(timeline_date()) }}</span>
              <button class="icon-btn" (click)="navigateDay(1)" title="Next day" aria-label="Next day">
                <span class="material-symbols-rounded">chevron_right</span>
              </button>
              <div class="schedule-view-toggle">
                <button class="btn btn-sm" [class.btn-primary]="schedule_view_mode() === 'display'" [class.btn-outline]="schedule_view_mode() !== 'display'" (click)="schedule_view_mode.set('display')">By Display</button>
                <button class="btn btn-sm" [class.btn-primary]="schedule_view_mode() === 'zone'" [class.btn-outline]="schedule_view_mode() !== 'zone'" (click)="schedule_view_mode.set('zone')">By Zone</button>
              </div>
            </div>
          </div>
          <div class="timeline-wrapper">
            <!-- Hour header -->
            <div class="tl-grid-header">
              <div class="tl-row-label"></div>
              <div class="tl-grid-cols">
                @for (h of TIMELINE_HOURS; track h) {
                  <span class="tl-hour">{{ h }}</span>
                }
              </div>
            </div>
            <!-- Rows -->
            @if (schedule_view_mode() === 'display') {
              @for (display of signageService.displays(); track display.id) {
                <div class="tl-row">
                  <div class="tl-row-label" [title]="display.name">
                    <span class="tl-row-name">{{ display.name }}</span>
                    <span class="tl-row-zone">{{ display.location }}</span>
                  </div>
                  <div class="tl-row-track">
                    <div class="tl-grid-lines">
                      @for (h of TIMELINE_HOURS; track h) {
                        <div class="tl-grid-line"></div>
                      }
                    </div>
                    @for (sch of getSchedulesForDisplay(display); track sch.id) {
                      <div class="tl-block"
                        [class]="'tl-block pl-color-' + getPlaylistColorIndex(sch.playlist_id)"
                        [style.left.%]="getTimelineLeft(sch.start_time)"
                        [style.width.%]="getTimelineWidth(sch.start_time, sch.end_time)"
                        [title]="signageService.getPlaylistName(sch.playlist_id) + '  ' + sch.start_time + ' - ' + sch.end_time">
                        <span class="tl-block-label">{{ signageService.getPlaylistName(sch.playlist_id) }}</span>
                        <span class="tl-block-time">{{ sch.start_time }}-{{ sch.end_time }}</span>
                      </div>
                    }
                    @if (isToday(timeline_date())) {
                      <div class="tl-now" [style.left.%]="currentTimePercent()"></div>
                    }
                  </div>
                </div>
              }
            } @else {
              @for (zone of signageService.zones(); track zone.id) {
                <div class="tl-row">
                  <div class="tl-row-label" [title]="zone.name">
                    <span class="tl-row-name">{{ zone.name }}</span>
                    <span class="tl-row-zone">{{ signageService.getZoneDisplayCount(zone.id) }} displays</span>
                  </div>
                  <div class="tl-row-track">
                    <div class="tl-grid-lines">
                      @for (h of TIMELINE_HOURS; track h) {
                        <div class="tl-grid-line"></div>
                      }
                    </div>
                    @for (sch of getSchedulesForZone(zone.id); track sch.id) {
                      <div class="tl-block"
                        [class]="'tl-block pl-color-' + getPlaylistColorIndex(sch.playlist_id)"
                        [style.left.%]="getTimelineLeft(sch.start_time)"
                        [style.width.%]="getTimelineWidth(sch.start_time, sch.end_time)"
                        [title]="signageService.getPlaylistName(sch.playlist_id) + '  ' + sch.start_time + ' - ' + sch.end_time">
                        <span class="tl-block-label">{{ signageService.getPlaylistName(sch.playlist_id) }}</span>
                        <span class="tl-block-time">{{ sch.start_time }}-{{ sch.end_time }}</span>
                      </div>
                    }
                    @if (isToday(timeline_date())) {
                      <div class="tl-now" [style.left.%]="currentTimePercent()"></div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- ═══════════════════ MEDIA TAB ═══════════════════ -->
      @if (activeTab() === 'media') {
        <div class="card">
          <div class="card-header">
            <h3>Media Library</h3>
            <div class="header-actions">
              <div class="search-box">
                <span class="material-symbols-rounded search-icon">search</span>
                <input type="text" placeholder="Search media..." [value]="media_search()" (input)="media_search.set(asInput($event).value)">
              </div>
              <button class="btn btn-primary btn-sm" (click)="openModal('add-media')">
                <span class="material-symbols-rounded" style="font-size: 16px;">add</span>
                Add Media
              </button>
            </div>
          </div>

          <!-- Dropzone -->
          <div class="dropzone"
            [class.dropzone-active]="drag_over()"
            (dragover)="onDragOver($event)"
            (dragleave)="drag_over.set(false)"
            (drop)="onDrop($event)">
            <span class="material-symbols-rounded" style="font-size: 40px; color: var(--neutral);">cloud_upload</span>
            <p class="dropzone-text">Drag and drop media files here</p>
            <p class="dropzone-sub">or click "Add Media" to add by URL</p>
          </div>

          <div class="media-grid">
            @for (item of filteredMedia(); track item.id) {
              <div class="media-card">
                <div class="media-thumb" (click)="openPreviewMedia(item)">
                  <span class="material-symbols-rounded">{{ getMediaTypeIcon(item.type) }}</span>
                  <div class="media-thumb-overlay">
                    <span class="material-symbols-rounded">visibility</span>
                  </div>
                </div>
                <div class="media-info">
                  <div class="media-name">{{ item.name }}</div>
                  <div class="media-meta">
                    <span class="badge" [class.badge-info]="item.type === 'webpage' || item.type === 'html'" [class.badge-success]="item.type === 'image'" [class.badge-primary]="item.type === 'video'">{{ item.type }}</span>
                    @if (item.duration > 0) {
                      <span class="media-dur">{{ item.duration }}s</span>
                    } @else {
                      <span class="media-dur">Live</span>
                    }
                  </div>
                  <div class="media-card-actions">
                    <button class="icon-btn" title="Add to playlist" (click)="startAddMediaToPlaylist(item.id)" aria-label="Add to playlist">
                      <span class="material-symbols-rounded">playlist_add</span>
                    </button>
                    <button class="icon-btn" title="Edit" (click)="startEditMedia(item)" aria-label="Edit media">
                      <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="icon-btn" title="Delete" (click)="confirmDelete('media', item.id, item.name)" aria-label="Delete media">
                      <span class="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ═══════════════════ ZONES TAB ═══════════════════ -->
      @if (activeTab() === 'zones') {
        <div class="zones-layout">
          <div class="card zones-list-card">
            <div class="card-header" style="flex-direction: column; align-items: stretch; gap: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <h3>Zones</h3>
                <button class="btn btn-primary btn-sm" (click)="openAddZone()">
                  <span class="material-symbols-rounded" style="font-size: 16px;">add</span>
                  Add
                </button>
              </div>
              <div class="search-box">
                <span class="material-symbols-rounded search-icon">search</span>
                <input type="text" placeholder="Search zones..." [value]="zone_search()" (input)="zone_search.set(asInput($event).value)">
              </div>
            </div>
            @for (zone of filteredZones(); track zone.id) {
              <div class="zone-item" [class.active]="selected_zone_id() === zone.id" (click)="selected_zone_id.set(zone.id)">
                <span class="material-symbols-rounded" style="font-size: 20px; color: var(--primary);">location_on</span>
                <div style="flex: 1;">
                  <div class="zone-item-name">{{ zone.name }}</div>
                  <div class="zone-item-meta">{{ zone.display_ids.length }} displays, {{ zone.playlist_ids.length }} playlists</div>
                </div>
                <button class="icon-btn" style="flex-shrink: 0;" title="Delete zone" aria-label="Delete zone"
                  (click)="$event.stopPropagation(); confirmDelete('zone', zone.id, zone.name)">
                  <span class="material-symbols-rounded">delete</span>
                </button>
                <span class="material-symbols-rounded" style="font-size: 18px; color: var(--neutral);">chevron_right</span>
              </div>
            }
          </div>

          @if (selectedZone()) {
            <div class="zone-detail">
              <!-- Zone playlists -->
              <div class="card">
                <div class="card-header">
                  <h3>Playlists in {{ selectedZone()!.name }}</h3>
                </div>
                <div class="zone-entity-list">
                  @for (pid of selectedZone()!.playlist_ids; track pid) {
                    <div class="zone-entity-item">
                      <span class="material-symbols-rounded" style="font-size: 18px;">playlist_play</span>
                      <span style="flex: 1;">{{ signageService.getPlaylistName(pid) }}</span>
                      <button class="icon-btn" title="Remove from zone" (click)="signageService.removePlaylistFromZone(selectedZone()!.id, pid)">
                        <span class="material-symbols-rounded">remove_circle</span>
                      </button>
                    </div>
                  }
                </div>
                <div class="zone-add-row">
                  <select class="filter-select" #zone_pl_select>
                    <option value="">Add playlist...</option>
                    @for (pl of availablePlaylistsForZone(); track pl.id) {
                      <option [value]="pl.id">{{ pl.name }}</option>
                    }
                  </select>
                  <button class="btn btn-sm btn-primary" (click)="addPlaylistToSelectedZone(zone_pl_select.value); zone_pl_select.value = ''">Add</button>
                </div>
              </div>

              <!-- Zone displays -->
              <div class="card">
                <div class="card-header">
                  <h3>Displays in {{ selectedZone()!.name }}</h3>
                </div>
                <div class="zone-entity-list">
                  @for (did of selectedZone()!.display_ids; track did) {
                    <div class="zone-entity-item">
                      <span class="material-symbols-rounded" style="font-size: 18px;">tv</span>
                      <span style="flex: 1;">{{ getDisplayName(did) }}</span>
                      <button class="icon-btn" title="Remove from zone" (click)="signageService.removeDisplayFromZone(selectedZone()!.id, did)">
                        <span class="material-symbols-rounded">remove_circle</span>
                      </button>
                    </div>
                  }
                </div>
                <div class="zone-add-row">
                  <select class="filter-select" #zone_dsp_select>
                    <option value="">Add display...</option>
                    @for (d of availableDisplaysForZone(); track d.id) {
                      <option [value]="d.id">{{ d.name }}</option>
                    }
                  </select>
                  <button class="btn btn-sm btn-primary" (click)="addDisplayToSelectedZone(zone_dsp_select.value); zone_dsp_select.value = ''">Add</button>
                </div>
              </div>
            </div>
          } @else {
            <div class="card zone-placeholder">
              <span class="material-symbols-rounded" style="font-size: 48px; color: var(--neutral);">location_on</span>
              <p>Select a zone to view details</p>
            </div>
          }
        </div>
      }

      <!-- ═══════════════════ EMERGENCY TAB ═══════════════════ -->
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

      <!-- ═══════════════════ MODAL OVERLAY ═══════════════════ -->
      @if (active_modal() !== 'none') {
        <div class="modal-backdrop" (click)="closeModal()"></div>
        <div class="modal-container">

          <!-- Add Media Modal -->
          @if (active_modal() === 'add-media') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>Add Media</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" placeholder="Media name" [value]="form_media_name()" (input)="form_media_name.set(asInput($event).value)">

                <label class="form-label">Type</label>
                <select class="form-input" [value]="form_media_type()" (change)="setMediaType($event)">
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="webpage">Webpage</option>
                  <option value="html">HTML</option>
                </select>

                <label class="form-label">URL</label>
                <input type="text" class="form-input" placeholder="https://... or /path" [value]="form_media_url()" (input)="form_media_url.set(asInput($event).value)">

                <label class="form-label">Duration ({{ form_media_duration() }}s) &mdash; 0 = Live</label>
                <input type="range" min="0" max="120" [value]="form_media_duration()" (input)="form_media_duration.set(+asInput($event).value)" class="form-range">
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!form_media_name()" (click)="submitAddMedia()">Add Media</button>
              </div>
            </div>
          }

          <!-- Edit Media Modal -->
          @if (active_modal() === 'edit-media') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>Edit Media</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" [value]="form_media_name()" (input)="form_media_name.set(asInput($event).value)">

                <label class="form-label">Type</label>
                <select class="form-input" [value]="form_media_type()" (change)="setMediaType($event)">
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="webpage">Webpage</option>
                  <option value="html">HTML</option>
                </select>

                <label class="form-label">URL</label>
                <input type="text" class="form-input" [value]="form_media_url()" (input)="form_media_url.set(asInput($event).value)">

                <label class="form-label">Duration ({{ form_media_duration() }}s)</label>
                <input type="range" min="0" max="120" [value]="form_media_duration()" (input)="form_media_duration.set(+asInput($event).value)" class="form-range">
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!form_media_name()" (click)="submitEditMedia()">Save</button>
              </div>
            </div>
          }

          <!-- Preview Media Modal -->
          @if (active_modal() === 'preview-media') {
            <div class="modal-panel modal-lg">
              <div class="modal-header">
                <h3>Preview: {{ preview_media()?.name }}</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body preview-media-body">
                @if (preview_media()) {
                  @switch (preview_media()!.type) {
                    @case ('image') {
                      <img [src]="preview_media()!.url" alt="Preview" class="preview-media-img" (error)="onPreviewImgError($event)">
                    }
                    @case ('video') {
                      <video controls class="preview-media-video" [src]="preview_media()!.url">
                        Your browser does not support video.
                      </video>
                    }
                    @case ('webpage') {
                      <iframe [src]="sanitizeUrl(preview_media()!.url)" class="preview-media-iframe" frameborder="0" title="Preview"></iframe>
                    }
                    @case ('html') {
                      <div class="preview-media-html-placeholder">
                        <span class="material-symbols-rounded" style="font-size: 48px;">code</span>
                        <p>HTML content preview</p>
                      </div>
                    }
                  }
                }
              </div>
            </div>
          }

          <!-- Add Playlist Modal -->
          @if (active_modal() === 'add-playlist') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>New Playlist</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" placeholder="Playlist name" [value]="form_pl_name()" (input)="form_pl_name.set(asInput($event).value)">

                <label class="form-label">Description</label>
                <input type="text" class="form-input" placeholder="Description" [value]="form_pl_desc()" (input)="form_pl_desc.set(asInput($event).value)">

                <div class="form-row">
                  <label class="form-checkbox">
                    <input type="checkbox" [checked]="form_pl_loop()" (change)="form_pl_loop.set(!form_pl_loop())">
                    <span>Loop</span>
                  </label>
                </div>

                <label class="form-label">Orientation</label>
                <select class="form-input" [value]="form_pl_orientation()" (change)="setOrientation($event)">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>

                <label class="form-label">Animation</label>
                <select class="form-input" [value]="form_pl_animation()" (change)="setAnimation($event)">
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!form_pl_name()" (click)="submitAddPlaylist()">Create Playlist</button>
              </div>
            </div>
          }

          <!-- Edit Playlist Modal -->
          @if (active_modal() === 'edit-playlist') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>Edit Playlist</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" [value]="form_pl_name()" (input)="form_pl_name.set(asInput($event).value)">

                <label class="form-label">Description</label>
                <input type="text" class="form-input" [value]="form_pl_desc()" (input)="form_pl_desc.set(asInput($event).value)">

                <div class="form-row">
                  <label class="form-checkbox">
                    <input type="checkbox" [checked]="form_pl_loop()" (change)="form_pl_loop.set(!form_pl_loop())">
                    <span>Loop</span>
                  </label>
                  <label class="form-checkbox">
                    <input type="checkbox" [checked]="form_pl_enabled()" (change)="form_pl_enabled.set(!form_pl_enabled())">
                    <span>Enabled</span>
                  </label>
                </div>

                <label class="form-label">Orientation</label>
                <select class="form-input" [value]="form_pl_orientation()" (change)="setOrientation($event)">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>

                <label class="form-label">Animation</label>
                <select class="form-input" [value]="form_pl_animation()" (change)="setAnimation($event)">
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!form_pl_name()" (click)="submitEditPlaylist()">Save</button>
              </div>
            </div>
          }

          <!-- Add Media to Playlist Modal -->
          @if (active_modal() === 'add-media-to-playlist') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>Add Media to Playlist</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <div class="media-select-list">
                  @for (item of signageService.media(); track item.id) {
                    <div class="media-select-item" [class.already-added]="isMediaInTargetPlaylist(item.id)" (click)="addMediaToTargetPlaylist(item.id)">
                      <span class="material-symbols-rounded" style="font-size: 20px;">{{ getMediaTypeIcon(item.type) }}</span>
                      <span style="flex: 1;">{{ item.name }}</span>
                      <span class="badge badge-info">{{ item.type }}</span>
                      @if (isMediaInTargetPlaylist(item.id)) {
                        <span class="material-symbols-rounded" style="color: var(--success); font-size: 18px;">check_circle</span>
                      } @else {
                        <span class="material-symbols-rounded" style="color: var(--neutral); font-size: 18px;">add_circle</span>
                      }
                    </div>
                  }
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" (click)="closeModal()">Done</button>
              </div>
            </div>
          }

          <!-- Select Playlist for Media (from media tab) -->
          @if (active_modal() === 'select-playlist-for-media') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>Add to Playlist</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <p style="font-size: 13px; color: var(--neutral); margin-bottom: 12px;">
                  Adding: <strong>{{ pending_media_id() ? signageService.getMediaName(pending_media_id()!) : '' }}</strong>
                </p>
                <div class="media-select-list">
                  @for (pl of signageService.playlists(); track pl.id) {
                    @if (!pl.is_emergency) {
                      <div class="media-select-item"
                        [class.already-added]="pl.media_ids.includes(pending_media_id() ?? '')"
                        (click)="addMediaToSelectedPlaylist(pl.id)">
                        <span class="material-symbols-rounded" style="font-size: 20px;">playlist_play</span>
                        <div style="flex: 1;">
                          <div style="font-weight: 600;">{{ pl.name }}</div>
                          <div style="font-size: 11px; color: var(--neutral);">{{ pl.media_ids.length }} items</div>
                        </div>
                        @if (pl.media_ids.includes(pending_media_id() ?? '')) {
                          <span class="material-symbols-rounded" style="color: var(--success); font-size: 18px;">check_circle</span>
                        } @else {
                          <span class="material-symbols-rounded" style="color: var(--neutral); font-size: 18px;">add_circle</span>
                        }
                      </div>
                    }
                  }
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Close</button>
              </div>
            </div>
          }

          <!-- Add Schedule Modal -->
          @if (active_modal() === 'add-schedule') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>New Schedule</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" placeholder="Schedule name" [value]="form_sch_name()" (input)="form_sch_name.set(asInput($event).value)">

                <label class="form-label">Playlist</label>
                <select class="form-input" [value]="form_sch_playlist_id()" (change)="form_sch_playlist_id.set(asSelect($event).value)">
                  <option value="">Select playlist...</option>
                  @for (pl of signageService.playlists(); track pl.id) {
                    @if (!pl.is_emergency) {
                      <option [value]="pl.id">{{ pl.name }}</option>
                    }
                  }
                </select>

                <label class="form-label">Zone</label>
                <select class="form-input" [value]="form_sch_zone_id()" (change)="form_sch_zone_id.set(asSelect($event).value)">
                  <option value="">Select zone...</option>
                  @for (z of signageService.zones(); track z.id) {
                    <option [value]="z.id">{{ z.name }}</option>
                  }
                </select>

                <div class="form-row">
                  <div style="flex: 1;">
                    <label class="form-label">Start Time</label>
                    <input type="time" class="form-input" [value]="form_sch_start()" (input)="form_sch_start.set(asInput($event).value)">
                  </div>
                  <div style="flex: 1;">
                    <label class="form-label">End Time</label>
                    <input type="time" class="form-input" [value]="form_sch_end()" (input)="form_sch_end.set(asInput($event).value)">
                  </div>
                </div>

                <label class="form-label">Cron Expression</label>
                <input type="text" class="form-input mono" placeholder="0 8 * * 1-5" [value]="form_sch_cron()" (input)="form_sch_cron.set(asInput($event).value)">

                <label class="form-label">Priority ({{ form_sch_priority() }})</label>
                <input type="range" min="1" max="20" [value]="form_sch_priority()" (input)="form_sch_priority.set(+asInput($event).value)" class="form-range">
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!form_sch_name() || !form_sch_playlist_id() || !form_sch_zone_id()" (click)="submitAddSchedule()">Create Schedule</button>
              </div>
            </div>
          }

          <!-- Add Display Modal -->
          @if (active_modal() === 'add-display') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>Add Display</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <label class="form-label">Display Name</label>
                <input type="text" class="form-input" placeholder="e.g. Lobby Screen 1" [value]="form_dsp_name()" (input)="form_dsp_name.set(asInput($event).value)">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" placeholder="e.g. Main Lobby, Counter Area" [value]="form_dsp_location()" (input)="form_dsp_location.set(asInput($event).value)">
                <label class="form-label">Zone</label>
                <select class="form-input" [value]="form_dsp_zone_id()" (change)="form_dsp_zone_id.set(asSelect($event).value)">
                  <option value="">— Select Zone —</option>
                  @for (z of signageService.zones(); track z.id) {
                    <option [value]="z.id">{{ z.name }}</option>
                  }
                </select>
                <label class="form-label">Resolution</label>
                <select class="form-input" [value]="form_dsp_resolution()" (change)="form_dsp_resolution.set(asSelect($event).value)">
                  <option value="1920x1080">1920 × 1080 (Full HD)</option>
                  <option value="3840x2160">3840 × 2160 (4K)</option>
                  <option value="1080x1920">1080 × 1920 (Portrait FHD)</option>
                  <option value="2160x3840">2160 × 3840 (Portrait 4K)</option>
                  <option value="1280x720">1280 × 720 (HD)</option>
                </select>
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!form_dsp_name() || !form_dsp_zone_id()" (click)="submitAddDisplay()">Add Display</button>
              </div>
            </div>
          }

          <!-- Add Zone Modal -->
          @if (active_modal() === 'add-zone') {
            <div class="modal-panel">
              <div class="modal-header">
                <h3>Add Zone</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <label class="form-label">Zone Name</label>
                <input type="text" class="form-input" placeholder="e.g. Norwalk HQ" [value]="form_zone_name()" (input)="form_zone_name.set(asInput($event).value)">
                <label class="form-label">Location ID</label>
                <input type="text" class="form-input" placeholder="e.g. norwalk, lancaster" [value]="form_zone_location()" (input)="form_zone_location.set(asInput($event).value)">
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!form_zone_name()" (click)="submitAddZone()">Create Zone</button>
              </div>
            </div>
          }

          <!-- Confirm Delete Modal -->
          @if (active_modal() === 'confirm-delete') {
            <div class="modal-panel modal-sm">
              <div class="modal-header">
                <h3>Confirm Delete</h3>
                <button class="icon-btn" (click)="closeModal()"><span class="material-symbols-rounded">close</span></button>
              </div>
              <div class="modal-body">
                <p>Are you sure you want to delete <strong>{{ delete_payload()?.name }}</strong>?</p>
                <p class="delete-warning">This action cannot be undone.</p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
                <button class="btn btn-error" (click)="executeDelete()">Delete</button>
              </div>
            </div>
          }
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

    /* Search box */
    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-box .search-icon {
      position: absolute;
      left: 10px;
      font-size: 18px;
      color: var(--neutral);
      pointer-events: none;
    }
    .search-box input {
      padding: 7px 12px 7px 34px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--base-200);
      font-size: 13px;
      background: var(--base-100);
      color: var(--base-content);
      width: 200px;
    }
    .search-box input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px var(--primary-wash); }

    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-header h3 { font-size: 15px; font-weight: 700; }
    .header-actions { display: flex; gap: 8px; align-items: center; }

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
    .mono { font-family: monospace; }

    .playlist-badges { display: flex; gap: 4px; flex-wrap: wrap; }

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .dot-online { background: var(--success); animation: dotPulse 2s ease-in-out infinite; }
    .dot-offline { background: var(--error); }
    @keyframes dotPulse {
      0%, 100% { box-shadow: 0 0 0 0 var(--success); }
      50% { box-shadow: 0 0 6px 2px var(--success); }
    }

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

    .icon-btn-mini {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: var(--neutral);
      border: none;
      cursor: pointer;
      transition: all 0.15s;
      padding: 0;
    }
    .icon-btn-mini:hover:not(:disabled) { color: var(--primary); background: var(--primary-wash); }
    .icon-btn-mini:disabled { opacity: 0.3; cursor: not-allowed; }
    .icon-btn-mini .material-symbols-rounded { font-size: 14px; }

    .preview-row td { background: var(--base-200); }
    .preview-panel {
      padding: 16px;
      animation: fadeIn 0.25s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .preview-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
    }
    .preview-frame-wrapper {
      position: relative;
      border-radius: var(--radius);
      overflow: hidden;
      border: 2px solid var(--base-300);
      background: var(--secondary);
    }
    .preview-iframe {
      width: 100%;
      height: 420px;
      display: block;
      border: none;
    }
    .preview-iframe.portrait {
      max-width: 480px;
      margin: 0 auto;
      display: block;
    }
    .preview-overlay {
      position: absolute;
      top: 12px;
      right: 12px;
    }
    .preview-footer {
      display: flex;
      gap: 24px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--base-300);
    }
    .preview-meta {
      font-size: 12px;
      color: var(--neutral);
    }

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

    /* Playlists */
    .playlists-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .playlist-card { padding: 20px; }
    .playlist-card.emergency { border: 1.5px solid var(--error); }
    .playlist-card.disabled-card { opacity: 0.6; }
    .pl-header { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
    .pl-header h4 { font-size: 15px; font-weight: 700; }
    .pl-desc { font-size: 12px; color: var(--neutral); margin-top: 2px; }
    .pl-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .pl-meta-row { display: flex; gap: 6px; margin-bottom: 12px; }

    .approval-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: var(--base-200);
      border-radius: var(--radius-sm);
      flex-wrap: wrap;
    }
    .approval-meta { font-size: 11px; color: var(--neutral); }

    .btn-success { background: var(--success); color: white; border: none; }
    .btn-success:hover { filter: brightness(0.9); }
    .btn-error { background: var(--error); color: white; border: none; }
    .btn-error:hover { filter: brightness(0.9); }

    .pl-media-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .pl-media-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: var(--base-200);
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
    }
    .item-controls { display: flex; gap: 2px; }
    .pl-footer { display: flex; gap: 8px; align-items: center; }

    /* Schedule timeline */
    .timeline-wrapper { margin-top: 8px; }
    .tl-grid-header {
      display: flex;
      align-items: flex-end;
      margin-bottom: 6px;
      border-bottom: 1px solid var(--base-200);
      padding-bottom: 6px;
    }
    .tl-grid-header .tl-row-label { visibility: hidden; }
    .tl-grid-cols {
      flex: 1;
      display: flex;
    }
    .tl-hour {
      flex: 1;
      font-size: 10px;
      font-weight: 600;
      color: var(--neutral);
      text-align: center;
    }
    .tl-row {
      display: flex;
      align-items: stretch;
      min-height: 44px;
      border-bottom: 1px solid var(--base-200);
    }
    .tl-row:last-child { border-bottom: none; }
    .tl-row-label {
      width: 160px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 6px 12px 6px 0;
      border-right: 1px solid var(--base-200);
    }
    .tl-row-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--base-content);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tl-row-zone {
      font-size: 10px;
      color: var(--neutral);
    }
    .tl-row-track {
      flex: 1;
      position: relative;
      min-height: 36px;
      margin: 4px 0;
    }
    .tl-grid-lines {
      position: absolute;
      inset: 0;
      display: flex;
      pointer-events: none;
    }
    .tl-grid-line {
      flex: 1;
      border-left: 1px solid var(--base-200);
    }
    .tl-grid-line:first-child { border-left: none; }
    .tl-block {
      position: absolute;
      top: 3px;
      bottom: 3px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 600;
      color: white;
      overflow: hidden;
      padding: 0 8px;
      z-index: 1;
      transition: opacity 0.15s;
      cursor: default;
    }
    .tl-block:hover { opacity: 0.85; }
    .tl-block-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tl-block-time {
      font-size: 9px;
      opacity: 0.7;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .pl-color-0 { background: var(--primary); }
    .pl-color-1 { background: var(--accent); color: var(--accent-content); }
    .pl-color-2 { background: hsl(28, 80%, 52%); }
    .pl-color-3 { background: hsl(262, 52%, 55%); }
    .pl-color-4 { background: var(--error); }
    .pl-color-5 { background: var(--secondary); }

    .tl-now {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      background: var(--error);
      z-index: 3;
      pointer-events: none;
    }
    .tl-now::before {
      content: '';
      position: absolute;
      top: -3px;
      left: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--error);
    }
    .tl-now::after {
      content: 'NOW';
      position: absolute;
      top: -16px;
      left: -10px;
      font-size: 8px;
      font-weight: 700;
      color: var(--error);
      letter-spacing: 0.5px;
    }

    .timeline-date-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--base-content);
      min-width: 140px;
      text-align: center;
    }
    .schedule-view-toggle { display: flex; gap: 4px; }

    /* Media */
    .dropzone {
      border: 2px dashed var(--base-300);
      border-radius: var(--radius);
      padding: 32px;
      text-align: center;
      margin-bottom: 20px;
      transition: all 0.2s;
      cursor: pointer;
    }
    .dropzone:hover,
    .dropzone-active {
      border-color: var(--primary);
      background: var(--primary-wash);
    }
    .dropzone-text { font-size: 14px; font-weight: 600; color: var(--base-content); margin: 8px 0 4px; }
    .dropzone-sub { font-size: 12px; color: var(--neutral); }

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
      position: relative;
      cursor: pointer;
    }
    .media-thumb .material-symbols-rounded { font-size: 32px; }
    .media-thumb-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      color: white;
    }
    .media-thumb-overlay .material-symbols-rounded { font-size: 28px; }
    .media-thumb:hover .media-thumb-overlay { opacity: 1; }
    .media-info { padding: 12px; }
    .media-name { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .media-meta { display: flex; align-items: center; gap: 8px; }
    .media-dur { font-size: 11px; color: var(--neutral); }
    .media-card-actions { display: flex; gap: 4px; margin-top: 8px; }

    /* Zones */
    .zones-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
    }
    .zones-list-card { padding: 0; }
    .zones-list-card .card-header { padding: 16px 16px 0 16px; margin-bottom: 8px; }
    .zone-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid var(--base-200);
    }
    .zone-item:hover { background: var(--base-200); }
    .zone-item.active { background: var(--primary-wash); border-left: 3px solid var(--primary); }
    .zone-item-name { font-size: 14px; font-weight: 600; }
    .zone-item-meta { font-size: 11px; color: var(--neutral); }
    .zone-detail { display: flex; flex-direction: column; gap: 16px; }
    .zone-entity-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .zone-entity-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--base-200);
      border-radius: var(--radius-sm);
      font-size: 13px;
    }
    .zone-add-row { display: flex; gap: 8px; align-items: center; }
    .zone-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--neutral);
      text-align: center;
      gap: 12px;
    }

    /* Emergency */
    .emergency-panel { display: flex; flex-direction: column; gap: 20px; }
    .emergency-card { padding: 24px; }
    .emergency-desc { font-size: 14px; color: var(--neutral); margin-bottom: 24px; line-height: 1.6; }
    .emergency-form { display: flex; flex-direction: column; gap: 16px; }
    .form-label { font-size: 13px; font-weight: 600; margin-bottom: 4px; display: block; }
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
      box-sizing: border-box;
    }
    textarea:focus { border-color: var(--error); outline: none; box-shadow: 0 0 0 3px var(--error-light); }
    .emergency-presets { display: flex; align-items: center; gap: 8px; }
    .presets-label { font-size: 12px; color: var(--neutral); font-weight: 500; }
    .activate-btn { margin-top: 8px; }
    .btn-sm { padding: 6px 14px; font-size: 12px; }
    .btn-lg { padding: 12px 24px; font-size: 14px; }

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

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      animation: fadeInBackdrop 0.2s ease;
    }
    @keyframes fadeInBackdrop { from { opacity: 0; } to { opacity: 1; } }
    .modal-container {
      position: fixed;
      inset: 0;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .modal-panel {
      background: var(--base-100);
      border-radius: var(--radius);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 480px;
      max-height: 85vh;
      overflow-y: auto;
      pointer-events: all;
      animation: modalSlideIn 0.25s ease;
    }
    .modal-lg { width: 720px; }
    .modal-sm { width: 400px; }
    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(-20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--base-200);
    }
    .modal-header h3 { font-size: 16px; font-weight: 700; }
    .modal-body { padding: 24px; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 24px;
      border-top: 1px solid var(--base-200);
    }

    .form-input {
      width: 100%;
      padding: 9px 14px;
      border: 1.5px solid var(--base-200);
      border-radius: var(--radius-sm);
      font-size: 13px;
      background: var(--base-100);
      color: var(--base-content);
      margin-bottom: 14px;
      box-sizing: border-box;
    }
    .form-input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px var(--primary-wash); }

    .form-range {
      width: 100%;
      margin-bottom: 14px;
      accent-color: var(--primary);
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }
    .form-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      cursor: pointer;
    }
    .form-checkbox input { accent-color: var(--primary); }

    /* Media select list in add-media-to-playlist modal */
    .media-select-list { display: flex; flex-direction: column; gap: 4px; }
    .media-select-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.15s;
      font-size: 13px;
    }
    .media-select-item:hover { background: var(--base-200); }
    .media-select-item.already-added { background: var(--success-light); }

    .delete-warning { font-size: 13px; color: var(--error); margin-top: 8px; }

    /* Preview media in modal */
    .preview-media-body { min-height: 200px; display: flex; align-items: center; justify-content: center; }
    .preview-media-img { max-width: 100%; max-height: 400px; border-radius: var(--radius-sm); }
    .preview-media-video { width: 100%; max-height: 400px; border-radius: var(--radius-sm); }
    .preview-media-iframe { width: 100%; height: 400px; border: 1px solid var(--base-200); border-radius: var(--radius-sm); }
    .preview-media-html-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--neutral); padding: 40px; }

    .uppercase { text-transform: uppercase; }

    @media (max-width: 1200px) {
      .stats-row { grid-template-columns: repeat(3, 1fr); }
      .playlists-grid { grid-template-columns: repeat(2, 1fr); }
      .media-grid { grid-template-columns: repeat(2, 1fr); }
      .affected-grid { grid-template-columns: repeat(2, 1fr); }
      .zones-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class SignageAdminComponent {
  readonly signageService = inject(SignageService);
  private readonly _sanitizer = inject(DomSanitizer);

  readonly activeTab = signal<SignageTab>('displays');
  readonly zoneFilter = signal('');
  readonly showPlaylistAssign = signal<string | null>(null);
  readonly previewDisplay = signal<string | null>(null);
  readonly emergencyMessage = signal('');

  // Search signals
  readonly display_search = signal('');
  readonly playlist_search = signal('');
  readonly media_search = signal('');
  readonly zone_search = signal('');

  // Modal
  readonly active_modal = signal<ModalType>('none');
  readonly delete_payload = signal<ConfirmDeletePayload | null>(null);

  // Drag-drop
  readonly drag_over = signal(false);

  // Media form
  readonly form_media_name = signal('');
  readonly form_media_type = signal<MediaType>('image');
  readonly form_media_url = signal('');
  readonly form_media_duration = signal(10);
  readonly editing_media_id = signal<string | null>(null);
  readonly preview_media = signal<SignageMedia | null>(null);

  // Playlist form
  readonly form_pl_name = signal('');
  readonly form_pl_desc = signal('');
  readonly form_pl_loop = signal(true);
  readonly form_pl_orientation = signal<Orientation>('landscape');
  readonly form_pl_animation = signal<AnimationStyle>('fade');
  readonly form_pl_enabled = signal(true);
  readonly editing_pl_id = signal<string | null>(null);
  readonly target_playlist_id = signal<string | null>(null);
  readonly pending_media_id = signal<string | null>(null);

  // Schedule form
  readonly form_sch_name = signal('');
  readonly form_sch_playlist_id = signal('');
  readonly form_sch_zone_id = signal('');
  readonly form_sch_start = signal('08:00');
  readonly form_sch_end = signal('17:00');
  readonly form_sch_cron = signal('0 8 * * 1-5');
  readonly form_sch_priority = signal(10);

  // Display form
  readonly form_dsp_name = signal('');
  readonly form_dsp_location = signal('');
  readonly form_dsp_zone_id = signal('');
  readonly form_dsp_resolution = signal('1920x1080');

  // Zone form
  readonly form_zone_name = signal('');
  readonly form_zone_location = signal('');

  // Schedule timeline
  readonly timeline_date = signal(new Date());
  readonly schedule_view_mode = signal<'display' | 'zone'>('zone');

  // Zones
  readonly selected_zone_id = signal<string | null>('zone-1');

  readonly tabs: { id: SignageTab; label: string; icon: string }[] = [
    { id: 'displays', label: 'Displays', icon: 'tv' },
    { id: 'playlists', label: 'Playlists', icon: 'playlist_play' },
    { id: 'schedules', label: 'Schedules', icon: 'schedule' },
    { id: 'media', label: 'Media', icon: 'perm_media' },
    { id: 'zones', label: 'Zones', icon: 'location_on' },
    { id: 'emergency', label: 'Emergency', icon: 'warning' },
  ];

  readonly TIMELINE_HOURS = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];

  // ── Helper methods ──

  asSelect(event: Event): HTMLSelectElement {
    return event.target as HTMLSelectElement;
  }

  asInput(event: Event): HTMLInputElement {
    return event.target as HTMLInputElement;
  }

  setMediaType(event: Event): void {
    this.form_media_type.set(this.asSelect(event).value as MediaType);
  }

  setOrientation(event: Event): void {
    this.form_pl_orientation.set(this.asSelect(event).value as Orientation);
  }

  setAnimation(event: Event): void {
    this.form_pl_animation.set(this.asSelect(event).value as AnimationStyle);
  }

  // ── Filtered lists ──

  filteredDisplays(): SignageDisplay[] {
    const zone = this.zoneFilter();
    const search = this.display_search().toLowerCase();
    let list = this.signageService.displays();
    if (zone) list = list.filter(d => d.zone_id === zone);
    if (search) list = list.filter(d => d.name.toLowerCase().includes(search));
    return list;
  }

  filteredPlaylists(): SignagePlaylist[] {
    const search = this.playlist_search().toLowerCase();
    if (!search) return this.signageService.playlists();
    return this.signageService.playlists().filter(p => p.name.toLowerCase().includes(search));
  }

  filteredMedia(): SignageMedia[] {
    const search = this.media_search().toLowerCase();
    if (!search) return this.signageService.media();
    return this.signageService.media().filter(m => m.name.toLowerCase().includes(search));
  }

  filteredZones() {
    const search = this.zone_search().toLowerCase();
    if (!search) return this.signageService.zones();
    return this.signageService.zones().filter(z => z.name.toLowerCase().includes(search));
  }

  selectedZone() {
    const id = this.selected_zone_id();
    if (!id) return null;
    return this.signageService.getZone(id) ?? null;
  }

  availablePlaylistsForZone(): SignagePlaylist[] {
    const zone = this.selectedZone();
    if (!zone) return [];
    return this.signageService.playlists().filter(p => !zone.playlist_ids.includes(p.id) && !p.is_emergency);
  }

  availableDisplaysForZone(): SignageDisplay[] {
    const zone = this.selectedZone();
    if (!zone) return [];
    return this.signageService.displays().filter(d => !zone.display_ids.includes(d.id));
  }

  getDisplayName(id: string): string {
    return this.signageService.displays().find(d => d.id === id)?.name ?? 'Unknown';
  }

  getTimeSince(date: Date): string {
    const diff = Math.round((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.round(diff / 60)}h ago`;
  }

  getMediaIcon(media_id: string): string {
    const item = this.signageService.getMediaItem(media_id);
    return item ? this.getMediaTypeIcon(item.type) : 'article';
  }

  getMediaTypeIcon(type: MediaType): string {
    const MAP: Record<MediaType, string> = { image: 'image', video: 'movie', webpage: 'language', html: 'code' };
    return MAP[type] ?? 'article';
  }

  getPlaylistNames(ids: string[]): string {
    return ids.map(id => this.signageService.getPlaylistName(id)).join(', ');
  }

  // ── Display helpers ──

  togglePlaylistOnDisplay(display_id: string, playlist_id: string): void {
    const display = this.signageService.displays().find(d => d.id === display_id);
    if (!display) return;
    if (display.assigned_playlist_ids.includes(playlist_id)) {
      this.signageService.removePlaylistFromDisplay(display_id, playlist_id);
    } else {
      this.signageService.addPlaylistToDisplay(display_id, playlist_id);
    }
  }

  getPreviewRoute(display: SignageDisplay): string {
    const playlist_id = display.assigned_playlist_ids[0];
    if (!playlist_id) return '/queue';
    const PLAYLIST_MAP: Record<string, string> = {
      'pl-1': '/queue',
      'pl-2': '/kiosk',
      'pl-3': '/kiosk',
      'pl-4': '/queue',
      'pl-6': '/queue',
    };
    return PLAYLIST_MAP[playlist_id] ?? '/queue';
  }

  getPreviewUrl(display: SignageDisplay): SafeResourceUrl {
    const route = this.getPreviewRoute(display);
    return this._sanitizer.bypassSecurityTrustResourceUrl(route);
  }

  isKioskDisplay(display: SignageDisplay): boolean {
    return display.assigned_playlist_ids.includes('pl-2') || display.assigned_playlist_ids.includes('pl-3');
  }

  // ── Emergency ──

  activateEmergency(): void {
    this.signageService.activateEmergency(this.emergencyMessage());
    this.emergencyMessage.set('');
  }

  // ── Modal management ──

  openModal(type: ModalType): void {
    this.active_modal.set(type);
  }

  closeModal(): void {
    this.active_modal.set('none');
    this.editing_media_id.set(null);
    this.editing_pl_id.set(null);
    this.preview_media.set(null);
    this.delete_payload.set(null);
    this.target_playlist_id.set(null);
  }

  // ── Media CRUD ──

  submitAddMedia(): void {
    const type = this.form_media_type();
    const ICON_MAP: Record<MediaType, string> = { image: 'image', video: 'movie', webpage: 'language', html: 'code' };
    this.signageService.addMedia({
      name: this.form_media_name(),
      type,
      url: this.form_media_url(),
      duration: this.form_media_duration(),
      thumbnail: ICON_MAP[type],
    });
    this.resetMediaForm();
    this.closeModal();
  }

  startEditMedia(item: SignageMedia): void {
    this.editing_media_id.set(item.id);
    this.form_media_name.set(item.name);
    this.form_media_type.set(item.type);
    this.form_media_url.set(item.url);
    this.form_media_duration.set(item.duration);
    this.active_modal.set('edit-media');
  }

  submitEditMedia(): void {
    const id = this.editing_media_id();
    if (!id) return;
    const type = this.form_media_type();
    const ICON_MAP: Record<MediaType, string> = { image: 'image', video: 'movie', webpage: 'language', html: 'code' };
    this.signageService.updateMedia(id, {
      name: this.form_media_name(),
      type,
      url: this.form_media_url(),
      duration: this.form_media_duration(),
      thumbnail: ICON_MAP[type],
    });
    this.resetMediaForm();
    this.closeModal();
  }

  openPreviewMedia(item: SignageMedia): void {
    this.preview_media.set(item);
    this.active_modal.set('preview-media');
  }

  onPreviewImgError(event: Event): void {
    (event.target as HTMLImageElement).src = '';
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this._sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private resetMediaForm(): void {
    this.form_media_name.set('');
    this.form_media_type.set('image');
    this.form_media_url.set('');
    this.form_media_duration.set(10);
  }

  // ── Drag-drop ──

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.drag_over.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.drag_over.set(false);
    // Simulate adding dropped file as media
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const type: MediaType = file.type.startsWith('video') ? 'video' : 'image';
      this.form_media_name.set(file.name.replace(/\.[^/.]+$/, ''));
      this.form_media_type.set(type);
      this.form_media_url.set(URL.createObjectURL(file));
      this.form_media_duration.set(type === 'video' ? 30 : 10);
      this.active_modal.set('add-media');
    }
  }

  // ── Playlist CRUD ──

  submitAddPlaylist(): void {
    this.signageService.addPlaylist({
      name: this.form_pl_name(),
      description: this.form_pl_desc(),
      media_ids: [],
      loop: this.form_pl_loop(),
      is_emergency: false,
      enabled: true,
      orientation: this.form_pl_orientation(),
      animation: this.form_pl_animation(),
      approval_status: 'pending',
      approved_by: null,
      approved_at: null,
    });
    this.resetPlaylistForm();
    this.closeModal();
  }

  startEditPlaylist(pl: SignagePlaylist): void {
    this.editing_pl_id.set(pl.id);
    this.form_pl_name.set(pl.name);
    this.form_pl_desc.set(pl.description);
    this.form_pl_loop.set(pl.loop);
    this.form_pl_orientation.set(pl.orientation);
    this.form_pl_animation.set(pl.animation);
    this.form_pl_enabled.set(pl.enabled);
    this.active_modal.set('edit-playlist');
  }

  submitEditPlaylist(): void {
    const id = this.editing_pl_id();
    if (!id) return;
    this.signageService.updatePlaylist(id, {
      name: this.form_pl_name(),
      description: this.form_pl_desc(),
      loop: this.form_pl_loop(),
      orientation: this.form_pl_orientation(),
      animation: this.form_pl_animation(),
      enabled: this.form_pl_enabled(),
    });
    this.resetPlaylistForm();
    this.closeModal();
  }

  startAddMediaToPlaylist(media_id: string): void {
    this.pending_media_id.set(media_id);
    this.active_modal.set('select-playlist-for-media');
  }

  addMediaToSelectedPlaylist(playlist_id: string): void {
    const media_id = this.pending_media_id();
    if (media_id) {
      this.signageService.addMediaToPlaylist(playlist_id, media_id);
    }
    this.pending_media_id.set(null);
    this.closeModal();
  }

  openAddMediaToPlaylist(playlist_id: string): void {
    this.target_playlist_id.set(playlist_id);
    this.active_modal.set('add-media-to-playlist');
  }

  isMediaInTargetPlaylist(media_id: string): boolean {
    const pl_id = this.target_playlist_id();
    if (!pl_id) return false;
    const pl = this.signageService.getPlaylist(pl_id);
    return pl?.media_ids.includes(media_id) ?? false;
  }

  addMediaToTargetPlaylist(media_id: string): void {
    const pl_id = this.target_playlist_id();
    if (!pl_id) return;
    if (this.isMediaInTargetPlaylist(media_id)) {
      this.signageService.removeMediaFromPlaylist(pl_id, media_id);
    } else {
      this.signageService.addMediaToPlaylist(pl_id, media_id);
    }
  }

  private resetPlaylistForm(): void {
    this.form_pl_name.set('');
    this.form_pl_desc.set('');
    this.form_pl_loop.set(true);
    this.form_pl_orientation.set('landscape');
    this.form_pl_animation.set('fade');
    this.form_pl_enabled.set(true);
  }

  // ── Schedule ──

  submitAddSchedule(): void {
    this.signageService.addSchedule({
      name: this.form_sch_name(),
      playlist_id: this.form_sch_playlist_id(),
      zone_id: this.form_sch_zone_id(),
      start_time: this.form_sch_start(),
      end_time: this.form_sch_end(),
      cron: this.form_sch_cron(),
      priority: this.form_sch_priority(),
      status: 'active',
    });
    this.resetScheduleForm();
    this.closeModal();
  }

  private resetScheduleForm(): void {
    this.form_sch_name.set('');
    this.form_sch_playlist_id.set('');
    this.form_sch_zone_id.set('');
    this.form_sch_start.set('08:00');
    this.form_sch_end.set('17:00');
    this.form_sch_cron.set('0 8 * * 1-5');
    this.form_sch_priority.set(10);
  }

  // ── Timeline ──

  goToToday(): void {
    this.timeline_date.set(new Date());
  }

  navigateDay(offset: number): void {
    const d = new Date(this.timeline_date());
    d.setDate(d.getDate() + offset);
    this.timeline_date.set(d);
  }

  formatTimelineDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

  currentTimePercent(): number {
    const now = new Date();
    return ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  }

  getTimelineLeft(time: string): number {
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    // offset for label column
    const pct = ((hours * 60 + minutes) / 1440) * 100;
    // Timeline starts after the label (120px), but since we use % for bars that are absolute in the track
    // and the label is a flex item taking 120px, we adjust the left with calc equivalent
    // Actually the bars are position: absolute so left% is relative to the track, but the label occupies 120px
    // So we need to offset. We'll use a left calc. But we can't use calc in interpolation easily.
    // Let's adjust: the track is position:relative with the label in flow. The bar positions absolute
    // from the track's left edge. So 0% = track left = behind the label.
    // We need to shift: left = 120px + pct * (track_width - 120px) / track_width... but we don't know track_width.
    // Simpler: the tl-bar left should be in the space after the label.
    // Since we can't use calc easily, let's just remap: the bars should have left offset with 120px shift.
    // Actually in the old code it used padding-left on timeline-hours. Let's just offset with a percentage estimate.
    // The label is 120px. If container ~1000px, that's ~12%. So effective area is 88%.
    // Let's approximate: the visible timeline area = (100% - 120px). We'll just scale the pct to fit
    // and add a fixed offset. Not perfect but functional.
    return pct;
  }

  getTimelineWidth(start: string, end: string): number {
    const parse = (t: string) => {
      const p = t.split(':');
      return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    };
    let start_min = parse(start);
    let end_min = parse(end);
    if (end_min <= start_min) end_min += 1440;
    return ((end_min - start_min) / 1440) * 100;
  }

  getPlaylistColorIndex(playlist_id: string): number {
    const ids = this.signageService.playlists().map(p => p.id);
    return ids.indexOf(playlist_id) % 6;
  }

  getSchedulesForDisplay(display: SignageDisplay): SignageSchedule[] {
    return this.signageService.schedules().filter(s => s.zone_id === display.zone_id);
  }

  getSchedulesForZone(zone_id: string): SignageSchedule[] {
    return this.signageService.schedules().filter(s => s.zone_id === zone_id);
  }

  // ── Display CRUD ──

  openAddDisplay(): void {
    this.form_dsp_name.set('');
    this.form_dsp_location.set('');
    this.form_dsp_zone_id.set('');
    this.form_dsp_resolution.set('1920x1080');
    this.active_modal.set('add-display');
  }

  submitAddDisplay(): void {
    this.signageService.addDisplay({
      name: this.form_dsp_name(),
      location: this.form_dsp_location(),
      zone_id: this.form_dsp_zone_id(),
      status: 'online',
      resolution: this.form_dsp_resolution(),
      assigned_playlist_ids: [],
      last_heartbeat: new Date(),
    });
    this.closeModal();
  }

  // ── Zone CRUD ──

  openAddZone(): void {
    this.form_zone_name.set('');
    this.form_zone_location.set('');
    this.active_modal.set('add-zone');
  }

  submitAddZone(): void {
    this.signageService.addZone({
      name: this.form_zone_name(),
      location_id: this.form_zone_location(),
      display_ids: [],
      playlist_ids: [],
    });
    this.closeModal();
  }

  // ── Delete confirmation ──

  confirmDelete(entity: 'media' | 'playlist' | 'schedule' | 'display' | 'zone', id: string, name: string): void {
    this.delete_payload.set({ entity, id, name });
    this.active_modal.set('confirm-delete');
  }

  executeDelete(): void {
    const payload = this.delete_payload();
    if (!payload) return;
    switch (payload.entity) {
      case 'media':
        this.signageService.deleteMedia(payload.id);
        break;
      case 'playlist':
        this.signageService.deletePlaylist(payload.id);
        break;
      case 'schedule':
        this.signageService.deleteSchedule(payload.id);
        break;
      case 'display':
        this.signageService.deleteDisplay(payload.id);
        break;
      case 'zone':
        this.signageService.deleteZone(payload.id);
        break;
    }
    this.closeModal();
  }

  // ── Zone helpers ──

  addPlaylistToSelectedZone(playlist_id: string): void {
    const zone_id = this.selected_zone_id();
    if (!zone_id || !playlist_id) return;
    this.signageService.addPlaylistToZone(zone_id, playlist_id);
  }

  addDisplayToSelectedZone(display_id: string): void {
    const zone_id = this.selected_zone_id();
    if (!zone_id || !display_id) return;
    this.signageService.addDisplayToZone(zone_id, display_id);
  }
}
