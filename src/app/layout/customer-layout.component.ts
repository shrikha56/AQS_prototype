import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="customer-layout">
      <header class="customer-header">
        <a routerLink="/booking" class="header-brand">
          <span class="brand-mark">AQS</span>
          <div class="brand-text">
            <span class="brand-title">LA County Registrar-Recorder/County Clerk</span>
            <span class="brand-sub">Appointment & Queuing System</span>
          </div>
        </a>
        <nav class="header-nav">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path"
               routerLinkActive="active"
               class="nav-link"
               [attr.aria-label]="item.label">
              <span class="material-symbols-rounded nav-icon">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>
        <a routerLink="/admin" class="staff-login">
          <span class="material-symbols-rounded" style="font-size: 18px;">lock</span>
          Staff Login
        </a>
      </header>
      <main class="customer-content" [class.fullscreen]="isFullscreen()">
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
    .customer-header {
      height: 64px;
      background: var(--base-100);
      border-bottom: 1px solid var(--base-200);
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 32px;
      flex-shrink: 0;
      box-shadow: var(--shadow);
      z-index: 10;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      flex-shrink: 0;
    }
    .brand-mark {
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
    }
    .brand-text { display: flex; flex-direction: column; }
    .brand-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--base-content);
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 11px;
      color: var(--neutral);
    }
    .header-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--neutral);
      text-decoration: none;
      transition: all 0.15s;
    }
    .nav-link:hover {
      background: var(--primary-wash);
      color: var(--primary);
    }
    .nav-link.active {
      background: var(--primary);
      color: var(--primary-content);
    }
    .nav-icon { font-size: 18px; }
    .staff-login {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--neutral);
      text-decoration: none;
      border: 1px solid var(--base-200);
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .staff-login:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .customer-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }
    .customer-content.fullscreen {
      padding: 0;
    }

    @media (max-width: 768px) {
      .customer-header { padding: 0 12px; gap: 12px; }
      .brand-text { display: none; }
      .nav-link span:not(.nav-icon) { display: none; }
      .nav-link { padding: 8px 12px; }
      .staff-login span:not(.material-symbols-rounded) { display: none; }
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

  isFullscreen(): boolean {
    const url = this._router.url;
    return url === '/kiosk' || url === '/queue';
  }
}
