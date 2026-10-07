import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toastSource = new BehaviorSubject<ToastMessage | null>(null);
  toast$ = this._toastSource.asObservable();

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this._toastSource.next({ message, type });
    setTimeout(() => {
      this._toastSource.next(null);
    }, 3500);
  }
}
