import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="logo">
          <span class="logo-mark">AQS</span>
          <div class="logo-text">
            <span class="logo-name">PlaceOS</span>
            <span class="logo-sub">AQS Platform</span>
          </div>
        </div>
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
          <a routerLink="/booking" class="nav-item" title="Customer Portal" aria-label="Customer Portal">
            <span class="material-symbols-rounded nav-icon">open_in_new</span>
            <span class="nav-label">Portal</span>
          </a>
          <div class="nav-item" title="Settings" aria-label="Settings">
            <span class="material-symbols-rounded nav-icon">settings</span>
            <span class="nav-label">Settings</span>
          </div>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <h1 class="page-title">{{ getPageTitle() }}</h1>
            <span class="county-tag">LA County RR/CC</span>
            <span class="env-tag">Internal</span>
          </div>
          <div class="topbar-right">
            <div class="system-status">
              <span class="status-dot"></span>
              System Online
            </div>
            <div class="topbar-user">
              <div class="avatar">MC</div>
              <div class="user-info">
                <span class="user-name">Maria Chen</span>
                <span class="user-role">Administrator</span>
              </div>
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
      width: 200px;
      background: var(--secondary);
      display: flex;
      flex-direction: column;
      padding: 16px 12px;
      flex-shrink: 0;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
      padding: 0 8px;
    }
    .logo-mark {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--primary);
      color: var(--primary-content);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: -0.5px;
      flex-shrink: 0;
    }
    .logo-text { display: flex; flex-direction: column; line-height: 1.15; }
    .logo-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--secondary-content);
    }
    .logo-sub {
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
    }
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
      color: var(--neutral-content);
      opacity: 0.6;
      text-decoration: none;
      transition: all 0.15s;
      cursor: pointer;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.08);
      opacity: 0.9;
    }
    .nav-item.active {
      background: rgba(255,255,255,0.12);
      opacity: 1;
      border-left: 3px solid var(--primary);
      padding-left: 9px;
    }
    .nav-icon { font-size: 20px; }
    .nav-label {
      font-size: 13px;
      font-weight: 500;
    }
    .sidebar-footer {
      margin-top: auto;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
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
      gap: 12px;
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
      font-size: 11px;
      font-weight: 600;
    }
    .env-tag {
      background: var(--secondary);
      color: var(--secondary-content);
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
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
    .topbar-user {
      display: flex;
      align-items: center;
      gap: 10px;
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
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-size: 13px; font-weight: 600; color: var(--base-content); }
    .user-role { font-size: 11px; color: var(--neutral); }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }
  `]
})
export class AdminLayoutComponent {
  private readonly _router = inject(Router);

  readonly navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/staff', label: 'Staff Console', icon: 'person' },
    { path: '/admin/signage', label: 'Signage', icon: 'tv_signin' },
    { path: '/admin/cv', label: 'Analytics', icon: 'monitoring' },
  ];

  getPageTitle(): string {
    const url = this._router.url;
    const titles: Record<string, string> = {
      '/admin/dashboard': 'Admin Dashboard',
      '/admin/staff': 'Staff Console',
      '/admin/signage': 'Signage Manager',
      '/admin/cv': 'Occupancy Analytics',
    };
    return titles[url] ?? 'Admin';
  }
}
