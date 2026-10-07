import { Component, signal, OnInit } from '@angular/core';
import { ToastService, ToastMessage } from './services/toast';

@Component({
  selector: 'app-root',
  standalone: false,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('web2-final');
  toastMessage = signal<ToastMessage | null>(null);

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toast$.subscribe({
      next: (toast) => this.toastMessage.set(toast)
    });
  }

  closeToast(): void {
    this.toastMessage.set(null);
  }
}
