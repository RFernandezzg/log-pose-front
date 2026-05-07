import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { DeckSummary, DeckDetail, DeckRequest, PageResponse } from './models/deck.models';

@Injectable({ providedIn: 'root' })
export class DeckService {
  constructor(private api: ApiClientService) {}

  getPublicDecks(
    page: number = 0,
    size: number = 20,
    leaderCardId?: string,
    color?: string,
    sort?: string
  ): Observable<PageResponse<DeckSummary>> {
    let url = `/decks?page=${page}&size=${size}`;
    if (leaderCardId) {
      url += `&leaderCardId=${leaderCardId}`;
    }
    if (color) {
      url += `&color=${color}`;
    }
    if (sort) {
      url += `&sort=${sort}`;
    }
    return this.api.get<PageResponse<DeckSummary>>(url);
  }

  getMyDecks(): Observable<DeckSummary[]> {
    return this.api.get<DeckSummary[]>('/decks/my');
  }

  getDeckById(id: number): Observable<DeckDetail> {
    return this.api.get<DeckDetail>(`/decks/${id}`);
  }

  createDeck(request: DeckRequest): Observable<DeckDetail> {
    return this.api.post<DeckDetail>('/decks', request);
  }

  updateDeck(id: number, request: DeckRequest): Observable<DeckDetail> {
    return this.api.put<DeckDetail>(`/decks/${id}`, request);
  }

  deleteDeck(id: number): Observable<void> {
    return this.api.delete<void>(`/decks/${id}`);
  }

  toggleLike(id: number): Observable<{ liked: boolean; likesCount: number }> {
    return this.api.post<{ liked: boolean; likesCount: number }>(`/decks/${id}/like`, {});
  }

  getLikeStatus(id: number): Observable<{ liked: boolean; likesCount: number }> {
    return this.api.get<{ liked: boolean; likesCount: number }>(`/decks/${id}/like`);
  }
}
