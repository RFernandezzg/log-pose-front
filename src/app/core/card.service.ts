/**
 * @deprecated SERVICIO LEGACY — No usar en código nuevo.
 *
 * Este servicio existe por compatibilidad histórica con la API REST propia del backend
 * (`/api/cards`) usando el modelo `Card` (snake_case de `core/models/card.models.ts`).
 *
 * ✅ USAR EN SU LUGAR: `CardsService` de `features/cards/cards.service.ts`
 *    - Soporta caché en memoria
 *    - Normaliza campos (camelCase: `imageUrl`, `cardSetId`, `name`, etc.)
 *    - Filtrado avanzado del lado cliente
 *    - Manejo de versiones/variantes de carta
 *
 * Este archivo se mantiene para no romper posibles integraciones externas,
 * pero todos los componentes internos deben migrar a CardsService.
 */
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { Card, CardFilterParams } from './models/card.models';

/** @deprecated Usar CardsService de features/cards/cards.service.ts */
@Injectable({ providedIn: 'root' })
export class CardService {
  constructor(private api: ApiClientService) {}

  /** @deprecated Usar CardsService.getCards(filters) */
  getCards(params?: CardFilterParams): Observable<Card[]> {
    let queryParams = '';
    if (params) {
      const parts: string[] = [];
      Object.entries(params).forEach(([key, value]) => {
        if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
      });
      if (parts.length > 0) queryParams = '?' + parts.join('&');
    }
    return this.api.get<Card[]>(`/cards${queryParams}`);
  }

  /** @deprecated Usar CardsService.getLeaders() */
  getLeaders(): Observable<Card[]> {
    return this.api.get<Card[]>('/cards/leaders');
  }

  /** @deprecated Usar CardsService.getCardById(id) */
  getCardById(id: string): Observable<Card> {
    return this.api.get<Card>(`/cards/${id}`);
  }
}
