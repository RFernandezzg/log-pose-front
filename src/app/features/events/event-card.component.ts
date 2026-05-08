import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { CommunityEvent } from '../../core/models/event.models';
import { EventService } from '../../core/event.service';
import { AuthSessionService } from '../../core/auth-session.service';
import { AuthUser } from '../../core/auth.models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './event-card.component.html',
  styles: [`
    .event-card {
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      overflow: hidden;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .event-card:hover {
      transform: translateY(-10px);
      border-color: rgba(133, 119, 82, 0.4);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    .event-header {
      padding: 1.5rem;
      background: rgba(133, 119, 82, 0.1);
      border-bottom: 1px solid rgba(133, 119, 82, 0.2);
    }
    .event-body {
      padding: 1.5rem;
      flex-grow: 1;
    }
    .event-footer {
      padding: 1.5rem;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .avatar-stack {
      display: flex;
      align-items: center;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #1e293b;
      margin-left: -10px;
      background: #334155;
    }
    .avatar:first-child { margin-left: 0; }
  `]
})
export class EventCardComponent implements OnInit {
  @Input() event!: CommunityEvent;
  @Output() statusChanged = new EventEmitter<void>();

  currentUsername: string | null = null;
  isAttendee = false;
  isLoading = false;

  constructor(
    private eventService: EventService,
    private session: AuthSessionService
  ) { }

  ngOnInit(): void {
    this.session.user$.subscribe((user: AuthUser | null) => {
      this.currentUsername = user?.username || null;
      this.checkIfAttendee();
    });
  }

  checkIfAttendee(): void {
    if (this.currentUsername && this.event.attendees) {
      this.isAttendee = this.event.attendees.some(a => a.username === this.currentUsername);
    }
  }

  toggleRegistration(): void {
    if (!this.currentUsername) {
      alert('Debes estar registrado para unirte a un evento.');
      return;
    }

    this.isLoading = true;
    if (this.isAttendee) {
      this.eventService.unregisterAttendee(this.event.id).subscribe({
        next: () => {
          this.isLoading = false;
          this.statusChanged.emit();
        },
        error: (err) => {
          console.error('Error unregistering:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.eventService.registerAttendee(this.event.id).subscribe({
        next: () => {
          this.isLoading = false;
          this.statusChanged.emit();
        },
        error: (err) => {
          console.error('Error registering:', err);
          this.isLoading = false;
        }
      });
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
}
