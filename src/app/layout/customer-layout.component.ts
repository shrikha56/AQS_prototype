import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="customer-layout">
      <header class="header">
        <div class="header-inner">
          <!-- Brand -->
          <a routerLink="/booking" class="brand">
            <span class="brand-icon">
              <span class="material-symbols-rounded" style="font-size: 22px;">assured_workload</span>
            </span>
            <div class="brand-text">
              <span class="brand-name">LA County RR/CC</span>
              <span class="brand-sub">Appointment & Queuing</span>
            </div>
          </a>

          <!-- Nav -->
          <nav class="nav">
            @for (item of navItems; track item.path) {
              <a [routerLink]="item.path"
                 routerLinkActive="active"
                 class="nav-link"
                 [attr.aria-label]="item.label">
                <span class="material-symbols-rounded nav-icon">{{ item.icon }}</span>
                <span class="nav-text">{{ item.label }}</span>
              </a>
            }
          </nav>

          <!-- Right -->
          <div class="header-right">
            <div class="status-pill">
              <span class="status-dot"></span>
              <span class="status-text">Online</span>
            </div>
            <a routerLink="/admin" class="staff-btn" aria-label="Staff Login">
              <span class="material-symbols-rounded" style="font-size: 18px;">shield_person</span>
              <span class="staff-text">Staff Portal</span>
            </a>
          </div>
        </div>
      </header>
      <main class="main" [class.fullscreen]="isFullscreen()">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .customer-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .header {
      background: var(--secondary);
      flex-shrink: 0;
      z-index: 10;
    }
    .header-inner {
      max-width: 1400px;
      margin: 0 auto;
      height: 60px;
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 8px;
    }

    /* Brand */
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--secondary-content);
      margin-right: 20px;
      flex-shrink: 0;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--primary);
      color: var(--primary-content);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-text { display: flex; flex-direction: column; line-height: 1.2; }
    .brand-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--secondary-content);
    }
    .brand-sub {
      font-size: 10px;
      color: rgba(255,255,255,0.45);
    }

    /* Nav */
    .nav {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: 1;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      transition: all 0.15s;
      position: relative;
    }
    .nav-link:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.9);
    }
    .nav-link.active {
      background: rgba(255,255,255,0.1);
      color: var(--secondary-content);
    }
    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: -9px;
      left: 50%;
      transform: translateX(-50%);
      width: 24px;
      height: 2px;
      background: var(--primary);
      border-radius: 1px;
    }
    .nav-icon { font-size: 18px; }

    /* Right */
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 100px;
      background: rgba(255,255,255,0.06);
      font-size: 11px;
      color: rgba(255,255,255,0.5);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }
    .staff-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      border: 1px solid rgba(255,255,255,0.12);
      transition: all 0.15s;
    }
    .staff-btn:hover {
      border-color: rgba(255,255,255,0.3);
      color: var(--secondary-content);
      background: rgba(255,255,255,0.06);
    }

    /* Main */
    .main {
      flex: 1;
      overflow-y: auto;
      padding: 28px 32px;
      background: var(--base-200);
    }
    .main.fullscreen { padding: 0; }

    @media (max-width: 768px) {
      .header-inner { padding: 0 12px; }
      .brand-text { display: none; }
      .nav-text { display: none; }
      .nav-link { padding: 8px 10px; }
      .status-text { display: none; }
      .staff-text { display: none; }
      .staff-btn { padding: 7px 10px; }
    }
  `]
})
export class CustomerLayoutComponent {
  private readonly _router = inject(Router);

  readonly navItems = [
    { path: '/booking', label: 'Book Appointment', icon: 'calendar_month' },
    { path: '/kiosk', label: 'Self Check-In', icon: 'desktop_windows' },
    { path: '/queue', label: 'Queue Status', icon: 'groups' },
  ];

  getPageTitle(): string {
    const url = this._router.url;
    const titles: Record<string, string> = {
      '/booking': 'Book an Appointment',
      '/kiosk': 'Self-Service Check-In',
      '/queue': 'Queue Status',
    };
    return titles[url] ?? 'AQS';
  }

  isFullscreen(): boolean {
    const url = this._router.url;
    return url === '/kiosk' || url === '/queue';
  }
}
