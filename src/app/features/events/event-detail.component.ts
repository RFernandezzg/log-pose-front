import { Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityEvent } from '../../core/models/event.models';
import { TranslateModule } from '@ngx-translate/core';
import { AuthSessionService } from '../../core/auth-session.service';
import { AuthUser } from '../../core/auth.models';
import { EventService } from '../../core/event.service';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() event!: CommunityEvent;
  @Output() close = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<void>();

  private map?: L.Map;
  isCreator = false;
  isDeleting = false;
  isAttendee = false;
  isLoading = false;
  currentUsername: string | null = null;

  constructor(
    private session: AuthSessionService,
    private eventService: EventService,
    private modalService: ModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.session.user$.subscribe(user => {
      this.currentUsername = user?.username || null;
      this.updateState();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event']) {
      this.updateState();
    }
  }

  private updateState(): void {
    if (this.event) {
      this.isCreator = this.currentUsername === this.event.creator.username;
      this.checkIfAttendee();
    }
  }

  checkIfAttendee(): void {
    if (this.currentUsername && this.event?.attendees) {
      this.isAttendee = this.event.attendees.some(a => a.username === this.currentUsername);
    } else {
      this.isAttendee = false;
    }
  }

  toggleRegistration(): void {
    if (!this.currentUsername) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.isLoading = true;
    if (this.isAttendee) {
      this.eventService.unregisterAttendee(this.event.id).subscribe({
        next: () => {
          this.isLoading = false;
          // Refresh event data or notify parent
          this.statusChanged.emit();
        },
        error: (err) => {
          console.error('Error unregistering:', err);
          this.isLoading = false;
        }
      });
    } else {
      if (this.isFull) {
        this.modalService.show({
          title: 'Evento Lleno',
          message: 'Este evento ya ha alcanzado el máximo de asistentes.',
          type: 'info'
        });
        this.isLoading = false;
        return;
      }
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

  get isFull(): boolean {
    return this.event.attendeeCount >= this.event.maxAttendees;
  }

  ngAfterViewInit(): void {
    if (this.event.latitude && this.event.longitude) {
      this.initMap();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    const lat = this.event.latitude!;
    const lng = this.event.longitude!;

    this.map = L.map('detail-map', {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(this.map);

    const customIcon = L.icon({
      iconUrl: 'assets/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'assets/marker-shadow.png',
      shadowSize: [41, 41]
    });

    // Fallback if custom icon not found (Leaflet default icons are tricky in build systems)
    L.marker([lat, lng]).addTo(this.map)
      .bindPopup(this.event.name)
      .openPopup();
    
    // Add zoom control to a better position
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
  }

  onDelete(): void {
    this.modalService.show({
      title: 'Eliminar Evento',
      message: '¿Estás seguro de que deseas eliminar este evento? Se notificará a todos los asistentes.',
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        this.isDeleting = true;
        this.eventService.deleteEvent(this.event.id).subscribe({
          next: () => {
            this.isDeleting = false;
            this.deleted.emit();
          },
          error: (err) => {
            console.error('Error deleting event:', err);
            this.isDeleting = false;
            this.modalService.show({
              title: 'Error',
              message: 'Error al eliminar el evento.',
              type: 'error'
            });
          }
        });
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
}
