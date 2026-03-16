import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'booking', pathMatch: 'full' },
  { path: 'booking', loadComponent: () => import('./booking/booking.component').then(m => m.BookingComponent) },
  { path: 'kiosk', loadComponent: () => import('./kiosk/kiosk.component').then(m => m.KioskComponent) },
  { path: 'queue', loadComponent: () => import('./queue/queue.component').then(m => m.QueueComponent) },
  { path: 'staff', loadComponent: () => import('./staff/staff.component').then(m => m.StaffComponent) },
  { path: 'admin', loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent) },
  { path: 'signage', loadComponent: () => import('./signage/signage-admin.component').then(m => m.SignageAdminComponent) },
];
