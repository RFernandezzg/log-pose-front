import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { CommunityEvent, EventRequest } from './models/event.models';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly endpoint = '/events';

  constructor(private apiClient: ApiClientService) {}

  getAllEvents(): Observable<CommunityEvent[]> {
    return this.apiClient.get<CommunityEvent[]>(this.endpoint);
  }

  getEventById(id: number): Observable<CommunityEvent> {
    return this.apiClient.get<CommunityEvent>(`${this.endpoint}/${id}`);
  }

  createEvent(event: EventRequest): Observable<CommunityEvent> {
    return this.apiClient.post<CommunityEvent>(this.endpoint, event);
  }

  registerAttendee(eventId: number): Observable<CommunityEvent> {
    return this.apiClient.post<CommunityEvent>(`${this.endpoint}/${eventId}/register`, {});
  }

  unregisterAttendee(eventId: number): Observable<CommunityEvent> {
    return this.apiClient.post<CommunityEvent>(`${this.endpoint}/${eventId}/unregister`, {});
  }

  deleteEvent(eventId: number): Observable<void> {
    return this.apiClient.delete<void>(`${this.endpoint}/${eventId}`);
  }
}
