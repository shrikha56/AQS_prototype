import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout" [class.fullscreen-mode]="isFullscreen()">
      <aside class="sidebar">
        <a routerLink="/booking" class="logo" aria-label="Home">
          <span class="logo-icon">
            <span class="material-symbols-rounded" style="font-size: 20px;">assured_workload</span>
          </span>
          <div class="logo-text">
            <span class="logo-name">LA County</span>
            <span class="logo-sub">RR/CC</span>
          </div>
        </a>
        <nav class="nav">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path"
               routerLinkActive="active"
               class="nav-item"
               [attr.aria-label]="item.label"
               [title]="item.label">
              <span class="material-symbols-rounded nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="sidebar-footer">
          <a routerLink="/admin" class="nav-item staff-link" title="Staff Login" aria-label="Staff Login">
            <span class="material-symbols-rounded nav-icon">shield_person</span>
            <span class="nav-label">Staff Portal</span>
          </a>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <h1 class="page-title">{{ getPageTitle() }}</h1>
          <div class="topbar-right">
            <span class="county-tag">LA County RR/CC</span>
            <div class="status-pill">
              <span class="status-dot"></span>
              Online
            </div>
          </div>
        </header>
        <main class="content" [class.fullscreen]="isFullscreen()">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .sidebar {
      width: 200px;
      background: var(--secondary);
      display: flex;
      flex-direction: column;
      padding: 20px 12px 16px;
      flex-shrink: 0;
    }

    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      padding: 0 8px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: var(--primary);
      color: var(--primary-content);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-text { display: flex; flex-direction: column; line-height: 1.15; }
    .logo-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--secondary-content);
    }
    .logo-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
    }

    /* Nav */
    .nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      transition: all 0.15s;
      cursor: pointer;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.85);
    }
    .nav-item.active {
      background: rgba(255,255,255,0.1);
      color: var(--secondary-content);
    }
    .nav-item.active .nav-icon {
      color: var(--primary);
    }
    .nav-icon { font-size: 20px; }
    .nav-label {
      font-size: 13px;
      font-weight: 500;
    }

    /* Footer */
    .sidebar-footer {
      margin-top: auto;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 12px;
    }
    .staff-link {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
    }
    .staff-link:hover {
      border-color: rgba(255,255,255,0.2);
    }

    /* Main area */
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--base-200);
    }
    .topbar {
      height: 56px;
      background: var(--base-100);
      border-bottom: 1px solid var(--base-200);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      flex-shrink: 0;
    }
    .page-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--base-content);
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .county-tag {
      background: var(--primary-wash);
      color: var(--primary);
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--neutral);
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }
    .content.fullscreen { padding: 0; }

    /* Kiosk & Queue are dedicated screens — hide chrome */
    :host-context(.fullscreen-mode) .sidebar { display: none; }
    :host-context(.fullscreen-mode) .topbar { display: none; }
    .fullscreen-mode .sidebar { display: none; }
    .fullscreen-mode .topbar { display: none; }

    @media (max-width: 768px) {
      .sidebar { width: 64px; padding: 16px 8px; }
      .logo-text { display: none; }
      .nav-label { display: none; }
      .nav-item { justify-content: center; padding: 10px; }
      .staff-link { justify-content: center; }
    }
  `]
})
export class CustomerLayoutComponent {
  private readonly _router = inject(Router);

  readonly navItems = [
    { path: '/booking', label: 'Book Appointment', icon: 'calendar_month' },
    { path: '/kiosk', label: 'Check-In Kiosk', icon: 'desktop_windows' },
    { path: '/queue', label: 'Queue Display', icon: 'groups' },
  ];

  getPageTitle(): string {
    const url = this._router.url;
    const titles: Record<string, string> = {
      '/booking': 'Book an Appointment',
      '/kiosk': 'Check-In Kiosk',
      '/queue': 'Queue Display',
    };
    return titles[url] ?? 'AQS';
  }

  isFullscreen(): boolean {
    const url = this._router.url;
    return url === '/kiosk' || url === '/queue';
  }
}
