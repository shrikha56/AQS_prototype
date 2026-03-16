import { Routes } from '@angular/router';

export const routes: Routes = [
  // Customer-facing routes
  {
    path: '',
    loadComponent: () => import('./layout/customer-layout.component').then(m => m.CustomerLayoutComponent),
    children: [
      { path: '', redirectTo: 'booking', pathMatch: 'full' },
      { path: 'booking', loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent) },
      { path: 'kiosk', loadComponent: () => import('./kiosk/kiosk.component').then(m => m.KioskComponent) },
      { path: 'queue', loadComponent: () => import('./queue/queue.component').then(m => m.QueueComponent) },
    ],
  },
  // Admin / internal team routes
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent) },
      { path: 'staff', loadComponent: () => import('./staff/staff.component').then(m => m.StaffComponent) },
      { path: 'signage', loadComponent: () => import('./signage/signage-admin.component').then(m => m.SignageAdminComponent) },
      { path: 'cv', loadComponent: () => import('./cv/cv.component').then(m => m.CvComponent) },
    ],
  },
];
