import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModalOptions {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private display = new BehaviorSubject<'open' | 'close'>('close');
  private options = new BehaviorSubject<ModalOptions | null>(null);

  watchDisplay(): Observable<'open' | 'close'> {
    return this.display.asObservable();
  }

  watchOptions(): Observable<ModalOptions | null> {
    return this.options.asObservable();
  }

  show(options: ModalOptions): void {
    this.options.next(options);
    this.display.next('open');
  }

  close(): void {
    this.display.next('close');
  }
}
