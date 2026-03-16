import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="logo">
          <span class="logo-mark">AQS</span>
        </div>
        <nav class="nav">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path"
               routerLinkActive="active"
               class="nav-item"
               [attr.aria-label]="item.label"
               [title]="item.label">
              <span class="material-symbols-rounded nav-icon">{{ item.icon }}</span>
            </a>
          }
        </nav>
        <div class="sidebar-footer">
          <div class="nav-item" title="Settings" aria-label="Settings">
            <span class="material-symbols-rounded nav-icon">settings</span>
          </div>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <h1 class="page-title">{{ getPageTitle() }}</h1>
            <span class="county-tag">LA County RR/CC</span>
          </div>
          <div class="topbar-right">
            <div class="system-status">
              <span class="status-dot"></span>
              System Online
            </div>
            <div class="topbar-user">
              <div class="avatar">MC</div>
            </div>
          </div>
        </header>
        <main class="content">
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
      width: 72px;
      background: var(--secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0;
      flex-shrink: 0;
    }
    .logo {
      margin-bottom: 24px;
      padding: 4px;
    }
    .logo-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--primary);
      color: var(--primary-content);
      font-weight: 700;
      font-size: 13px;
      letter-spacing: -0.5px;
    }
    .nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .nav-item {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--neutral-content);
      opacity: 0.55;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.1);
      opacity: 0.9;
    }
    .nav-item.active {
      background: rgba(255,255,255,0.15);
      opacity: 1;
      box-shadow: inset 3px 0 0 var(--primary);
    }
    .nav-icon {
      font-size: 22px;
    }
    .sidebar-footer {
      margin-top: auto;
    }
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .topbar {
      height: 64px;
      background: var(--base-100);
      border-bottom: 1px solid var(--base-200);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      flex-shrink: 0;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .page-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--base-content);
    }
    .county-tag {
      background: var(--primary-wash);
      color: var(--primary);
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .system-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--neutral);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary);
      color: var(--primary-content);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
    }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }
  `]
})
export class LayoutComponent {
  private readonly _router = inject(Router);

  readonly navItems = [
    { path: '/booking', label: 'Booking', icon: 'calendar_month' },
    { path: '/kiosk', label: 'Kiosk', icon: 'desktop_windows' },
    { path: '/queue', label: 'Queue Display', icon: 'groups' },
    { path: '/staff', label: 'Staff Dashboard', icon: 'person' },
    { path: '/admin', label: 'Admin Console', icon: 'admin_panel_settings' },
    { path: '/signage', label: 'Signage Manager', icon: 'tv_signin' },
  ];

  getPageTitle(): string {
    const url = this._router.url;
    const titles: Record<string, string> = {
      '/booking': 'Appointment Booking',
      '/kiosk': 'Self-Service Kiosk',
      '/queue': 'Queue Display',
      '/staff': 'Staff Dashboard',
      '/admin': 'Admin Console',
      '/signage': 'Signage Manager',
    };
    return titles[url] ?? 'AQS System';
  }
}
