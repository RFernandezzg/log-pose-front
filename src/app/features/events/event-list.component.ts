import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../core/event.service';
import { CommunityEvent } from '../../core/models/event.models';
import { TranslateModule } from '@ngx-translate/core';
import { EventCardComponent } from './event-card.component';
import { EventCreateComponent } from './event-create.component';
import { EventDetailComponent } from './event-detail.component';
import { AuthSessionService } from '../../core/auth-session.service';
import { AuthUser } from '../../core/auth.models';
import { ModalService } from '../../core/modal.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, EventCardComponent, EventCreateComponent, EventDetailComponent],
  templateUrl: './event-list.component.html',
  styles: [`
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
      padding: 2rem 0;
    }
    .hero-section {
      background: linear-gradient(135deg, rgba(29, 34, 105, 0.8) 0%, rgba(11, 13, 42, 0.9) 100%);
      border-radius: 24px;
      padding: 4rem 2rem;
      text-align: center;
      margin-bottom: 3rem;
      border: 1px solid rgba(133, 119, 82, 0.3);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .hero-title {
      font-size: 3.5rem;
      font-weight: 900;
      color: #857752;
      text-transform: uppercase;
      letter-spacing: 4px;
      margin-bottom: 1rem;
      text-shadow: 0 0 20px rgba(133, 119, 82, 0.4);
    }
    .hero-subtitle {
      font-size: 1.2rem;
      color: #94a3b8;
      max-width: 600px;
      margin: 0 auto 2rem;
    }
  `]
})
export class EventListComponent implements OnInit {
  events: CommunityEvent[] = [];
  isLoading = true;
  showCreateModal = false;
  selectedEvent: CommunityEvent | null = null;
  isLoggedIn = false;

  constructor(
    private eventService: EventService,
    private session: AuthSessionService,
    private modalService: ModalService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadEvents();
    this.session.user$.subscribe((user: AuthUser | null) => {
      this.isLoggedIn = !!user;
    });
  }

  loadEvents(): void {
    this.isLoading = true;
    this.eventService.getAllEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading events:', err);
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    if (this.isLoggedIn) {
      this.showCreateModal = true;
    } else {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
    }
  }

  onEventCreated(): void {
    this.showCreateModal = false;
    this.loadEvents();
  }

  onEventDeleted(): void {
    this.selectedEvent = null;
    this.loadEvents();
  }

  openEventDetails(event: CommunityEvent): void {
    this.selectedEvent = event;
  }
}
