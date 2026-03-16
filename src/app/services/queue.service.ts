import { Injectable, signal, computed } from '@angular/core';

export interface Location {
  id: string;
  name: string;
  address: string;
  waitTime: number;
}

export interface Service {
  id: string;
  name: string;
  icon: string;
  avgDuration: number;
  capacity: number;
  walkInsEnabled: boolean;
  active: boolean;
}

export interface QueueItem {
  ticket: string;
  name: string;
  service: string;
  serviceId: string;
  status: 'waiting' | 'serving' | 'completed' | 'no-show';
  checkInTime: Date;
  counter: number | null;
  phone: string;
  email: string;
  reference: string;
  jediRef: string;
}

export interface Counter {
  id: number;
  agent: string;
  status: 'active' | 'paused' | 'closed';
  currentTicket: string | null;
}

@Injectable({ providedIn: 'root' })
export class QueueService {
  readonly locations = signal<Location[]>([
    { id: 'norwalk', name: 'Norwalk Headquarters', address: '12400 Imperial Hwy, Norwalk, CA 90650', waitTime: 23 },
    { id: 'vannuys', name: 'Van Nuys', address: '14340 Sylvan St, Van Nuys, CA 91401', waitTime: 15 },
    { id: 'lancaster', name: 'Lancaster', address: '1028 W Ave J, Lancaster, CA 93534', waitTime: 8 },
    { id: 'pomona', name: 'Pomona', address: '350 S Garey Ave, Pomona, CA 91766', waitTime: 31 },
    { id: 'inglewood', name: 'Inglewood', address: '8834 S Western Ave, Los Angeles, CA 90047', waitTime: 19 },
    { id: 'palmdale', name: 'Palmdale', address: '1008 W Ave M-14, Palmdale, CA 93551', waitTime: 6 },
    { id: 'beverlyhills', name: 'Beverly Hills', address: '9355 Burton Way, Beverly Hills, CA 90210', waitTime: 12 },
  ]);

  readonly services = signal<Service[]>([
    { id: 'vital', name: 'Vital Records', icon: 'description', avgDuration: 12, capacity: 50, walkInsEnabled: true, active: true },
    { id: 'property', name: 'Property Documents', icon: 'home', avgDuration: 18, capacity: 30, walkInsEnabled: true, active: true },
    { id: 'marriage', name: 'Marriage License', icon: 'favorite', avgDuration: 25, capacity: 20, walkInsEnabled: false, active: true },
    { id: 'birth', name: 'Birth Certificate', icon: 'child_care', avgDuration: 10, capacity: 40, walkInsEnabled: true, active: true },
    { id: 'voter', name: 'Voter Registration', icon: 'how_to_vote', avgDuration: 8, capacity: 60, walkInsEnabled: true, active: true },
    { id: 'business', name: 'Business Filing', icon: 'work', avgDuration: 20, capacity: 25, walkInsEnabled: true, active: true },
    { id: 'notary', name: 'Notary Services', icon: 'draw', avgDuration: 15, capacity: 35, walkInsEnabled: false, active: true },
    { id: 'recording', name: 'Document Recording', icon: 'folder_open', avgDuration: 22, capacity: 28, walkInsEnabled: true, active: true },
  ]);

  readonly queue = signal<QueueItem[]>([
    { ticket: 'A-047', name: 'James Rodriguez', service: 'Vital Records', serviceId: 'vital', status: 'serving', checkInTime: new Date(2026, 2, 16, 9, 15), counter: 3, phone: '(213) 555-0147', email: 'j.rodriguez@email.com', reference: 'AQS-2026-1047', jediRef: 'JEDI-VR-2026-0391' },
    { ticket: 'A-048', name: 'Sarah Kim', service: 'Marriage License', serviceId: 'marriage', status: 'waiting', checkInTime: new Date(2026, 2, 16, 9, 22), counter: null, phone: '(310) 555-0283', email: 's.kim@email.com', reference: 'AQS-2026-1048', jediRef: 'JEDI-ML-2026-0142' },
    { ticket: 'A-049', name: 'Michael Chen', service: 'Property Documents', serviceId: 'property', status: 'waiting', checkInTime: new Date(2026, 2, 16, 9, 28), counter: null, phone: '(626) 555-0419', email: 'm.chen@email.com', reference: 'AQS-2026-1049', jediRef: 'JEDI-PD-2026-0567' },
    { ticket: 'A-050', name: 'Lisa Patel', service: 'Birth Certificate', serviceId: 'birth', status: 'waiting', checkInTime: new Date(2026, 2, 16, 9, 35), counter: null, phone: '(818) 555-0592', email: 'l.patel@email.com', reference: 'AQS-2026-1050', jediRef: 'JEDI-BC-2026-0823' },
    { ticket: 'A-051', name: 'David Washington', service: 'Voter Registration', serviceId: 'voter', status: 'waiting', checkInTime: new Date(2026, 2, 16, 9, 41), counter: null, phone: '(323) 555-0731', email: 'd.wash@email.com', reference: 'AQS-2026-1051', jediRef: 'JEDI-VT-2026-0204' },
    { ticket: 'A-052', name: 'Emma Torres', service: 'Business Filing', serviceId: 'business', status: 'waiting', checkInTime: new Date(2026, 2, 16, 9, 48), counter: null, phone: '(562) 555-0168', email: 'e.torres@email.com', reference: 'AQS-2026-1052', jediRef: 'JEDI-BF-2026-0455' },
  ]);

  readonly counters = signal<Counter[]>([
    { id: 1, agent: 'Robert Taylor', status: 'active', currentTicket: 'A-042' },
    { id: 2, agent: 'Jennifer Lopez', status: 'active', currentTicket: 'A-044' },
    { id: 3, agent: 'Maria Chen', status: 'active', currentTicket: 'A-047' },
    { id: 4, agent: 'Thomas Brown', status: 'paused', currentTicket: null },
    { id: 5, agent: 'Angela Davis', status: 'active', currentTicket: 'A-046' },
    { id: 6, agent: 'Kevin Park', status: 'closed', currentTicket: null },
  ]);

  private _ticketCounter = 53;

  readonly waitingCount = computed(() => this.queue().filter(q => q.status === 'waiting').length);
  readonly servingCount = computed(() => this.queue().filter(q => q.status === 'serving').length);
  readonly completedCount = computed(() => this.queue().filter(q => q.status === 'completed').length);
  readonly avgWaitMinutes = computed(() => {
    const waiting = this.queue().filter(q => q.status === 'waiting');
    if (waiting.length === 0) return 0;
    const now = new Date();
    const total = waiting.reduce((sum, q) => sum + (now.getTime() - q.checkInTime.getTime()) / 60000, 0);
    return Math.round(total / waiting.length);
  });

  addToQueue(name: string, serviceId: string, phone: string, email: string): QueueItem {
    const service = this.services().find(s => s.id === serviceId);
    const ticket = `A-${String(this._ticketCounter++).padStart(3, '0')}`;
    const ref = `AQS-2026-${1000 + this._ticketCounter}`;
    const jediRef = `JEDI-${serviceId.substring(0, 2).toUpperCase()}-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    const item: QueueItem = {
      ticket,
      name,
      service: service?.name ?? 'General',
      serviceId,
      status: 'waiting',
      checkInTime: new Date(),
      counter: null,
      phone,
      email,
      reference: ref,
      jediRef,
    };
    this.queue.update(q => [...q, item]);
    return item;
  }

  callNext(counterId: number): QueueItem | null {
    const waiting = this.queue().filter(q => q.status === 'waiting');
    if (waiting.length === 0) return null;
    const next = waiting[0];
    this.queue.update(q => q.map(item =>
      item.ticket === next.ticket ? { ...item, status: 'serving' as const, counter: counterId } : item
    ));
    this.counters.update(c => c.map(counter =>
      counter.id === counterId ? { ...counter, currentTicket: next.ticket } : counter
    ));
    return next;
  }

  markComplete(ticket: string): void {
    const item = this.queue().find(q => q.ticket === ticket);
    this.queue.update(q => q.map(i =>
      i.ticket === ticket ? { ...i, status: 'completed' as const } : i
    ));
    if (item?.counter) {
      this.counters.update(c => c.map(counter =>
        counter.id === item.counter ? { ...counter, currentTicket: null } : counter
      ));
    }
  }

  markNoShow(ticket: string): void {
    const item = this.queue().find(q => q.ticket === ticket);
    this.queue.update(q => q.map(i =>
      i.ticket === ticket ? { ...i, status: 'no-show' as const } : i
    ));
    if (item?.counter) {
      this.counters.update(c => c.map(counter =>
        counter.id === item.counter ? { ...counter, currentTicket: null } : counter
      ));
    }
  }

  transfer(ticket: string, toCounterId: number): void {
    this.queue.update(q => q.map(i =>
      i.ticket === ticket ? { ...i, counter: toCounterId } : i
    ));
    this.counters.update(c => c.map(counter =>
      counter.id === toCounterId ? { ...counter, currentTicket: ticket } : counter
    ));
  }

  togglePause(counterId: number): void {
    this.counters.update(c => c.map(counter =>
      counter.id === counterId ? { ...counter, status: counter.status === 'paused' ? 'active' as const : 'paused' as const } : counter
    ));
  }
}
