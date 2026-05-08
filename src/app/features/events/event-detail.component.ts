import { Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityEvent } from '../../core/models/event.models';
import { TranslateModule } from '@ngx-translate/core';
import { AuthSessionService } from '../../core/auth-session.service';
import { EventService } from '../../core/event.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements AfterViewInit, OnDestroy {
  @Input() event!: CommunityEvent;
  @Output() close = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  private map?: L.Map;
  isCreator = false;
  isDeleting = false;

  constructor(
    private session: AuthSessionService,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    this.session.user$.subscribe(user => {
      this.isCreator = user?.username === this.event.creator.username;
    });
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
    if (confirm('¿Estás seguro de que deseas eliminar este evento? Se notificará a todos los asistentes.')) {
      this.isDeleting = true;
      this.eventService.deleteEvent(this.event.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.deleted.emit();
        },
        error: (err) => {
          console.error('Error deleting event:', err);
          this.isDeleting = false;
          alert('Error al eliminar el evento.');
        }
      });
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
}
