import { Component, signal, OnInit } from '@angular/core';
import { ToastService } from './services/toast';
import type { ToastMessage } from './classes/admin';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('web2-final');
  toastMessage = signal<ToastMessage | null>(null);

  constructor(
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.toastService.toast$.subscribe({
      next: (toast) => this.toastMessage.set(toast)
    });

    if (this.authService.token) {
      this.authService.restoreSession().subscribe({
        error: () => this.authService.logout()
      });
    }
  }

  closeToast(): void {
    this.toastMessage.set(null);
  }
}
