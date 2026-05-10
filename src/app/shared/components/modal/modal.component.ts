import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService, ModalOptions } from '../../../core/modal.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('modalScale', [
      transition(':enter', [
        style({ transform: 'scale(0.95) translateY(10px)', opacity: 0 }),
        animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1) translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'scale(0.95) translateY(10px)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class ModalComponent implements OnInit {
  display: 'open' | 'close' = 'close';
  options: ModalOptions | null = null;

  constructor(private modalService: ModalService) {}

  ngOnInit(): void {
    this.modalService.watchDisplay().subscribe((value) => {
      this.display = value;
    });

    this.modalService.watchOptions().subscribe((value) => {
      this.options = value;
    });
  }

  close(): void {
    if (this.options?.onCancel) {
      this.options.onCancel();
    }
    this.modalService.close();
  }

  confirm(): void {
    if (this.options?.onConfirm) {
      this.options.onConfirm();
    }
    this.modalService.close();
  }

  cancel(): void {
    if (this.options?.onCancel) {
      this.options.onCancel();
    }
    this.modalService.close();
  }

  getTypeClasses(): string {
    switch (this.options?.type) {
      case 'success':
        return 'text-green-400 border-green-500/50 bg-green-500/10';
      case 'error':
        return 'text-red-400 border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
      default:
        return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
    }
  }

  getIcon(): string {
    switch (this.options?.type) {
      case 'success':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'error':
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }
}
