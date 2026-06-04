import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  readonly isOnline = signal(navigator.onLine);

  constructor() {
    effect(() => {
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    });
  }
}
