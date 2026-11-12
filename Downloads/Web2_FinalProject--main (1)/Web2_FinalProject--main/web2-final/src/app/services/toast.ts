import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { ToastMessage } from '../classes/admin';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toastSource = new BehaviorSubject<ToastMessage | null>(null);
  toast$ = this._toastSource.asObservable();
  private timeout?: ReturnType<typeof setTimeout>;

  showToast(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
    title?: string,
    duration = 5000
  ): void {
    if (this.timeout) clearTimeout(this.timeout);
    this._toastSource.next({ message, type, title });
    this.timeout = setTimeout(() => {
      this._toastSource.next(null);
      this.timeout = undefined;
    }, duration);
  }
}
