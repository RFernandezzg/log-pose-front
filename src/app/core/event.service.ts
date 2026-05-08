import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { Event, EventRequest } from './models/event.models';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly endpoint = '/events';

  constructor(private apiClient: ApiClientService) {}

  getAllEvents(): Observable<Event[]> {
    return this.apiClient.get<Event[]>(this.endpoint);
  }

  getEventById(id: number): Observable<Event> {
    return this.apiClient.get<Event>(`${this.endpoint}/${id}`);
  }

  createEvent(event: EventRequest): Observable<Event> {
    return this.apiClient.post<Event>(this.endpoint, event);
  }

  registerAttendee(eventId: number): Observable<Event> {
    return this.apiClient.post<Event>(`${this.endpoint}/${eventId}/register`, {});
  }

  unregisterAttendee(eventId: number): Observable<Event> {
    return this.apiClient.post<Event>(`${this.endpoint}/${eventId}/unregister`, {});
  }
}
