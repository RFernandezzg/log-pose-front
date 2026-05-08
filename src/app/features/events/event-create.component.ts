import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../core/event.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-event-create',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './event-create.component.html',
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-content {
      background: #1d2269;
      border: 1px solid rgba(133, 119, 82, 0.3);
      border-radius: 24px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      color: #94a3b8;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    input, textarea {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      color: white;
      transition: all 0.3s ease;
    }
    input:focus, textarea:focus {
      border-color: #857752;
      outline: none;
      background: rgba(15, 23, 42, 0.8);
    }
  `]
})
export class EventCreateComponent {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  eventData = {
    name: '',
    description: '',
    dateTime: '',
    location: ''
  };

  isLoading = false;

  constructor(private eventService: EventService) {}

  onSubmit(): void {
    if (!this.eventData.name || !this.eventData.dateTime || !this.eventData.location) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }

    this.isLoading = true;
    this.eventService.createEvent(this.eventData).subscribe({
      next: () => {
        this.isLoading = false;
        this.created.emit();
      },
      error: (err) => {
        console.error('Error creating event:', err);
        this.isLoading = false;
        alert('Error al crear el evento. Intenta nuevamente.');
      }
    });
  }
}
