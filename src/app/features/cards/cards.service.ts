import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, forkJoin, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { ApiClientService } from '../../core/api-client.service';
import { CardFilters, ExternalCardDto } from './cards.models';

@Injectable({ providedIn: 'root' })
export class CardsService {
  private cardsCache: ExternalCardDto[] | null = null;
  private cardsInFlight$: Observable<ExternalCardDto[]> | null = null;

  constructor(
    private api: ApiClientService,
    private http: HttpClient
  ) { }

  getAllSets(): Observable<unknown[]> {
    return this.api.get<unknown[]>('/cards/sets');
  }

  preloadAllCards(forceRefresh = false): Observable<ExternalCardDto[]> {
    if (!forceRefresh && this.cardsCache) {
      return of(this.cardsCache);
    }

    if (!forceRefresh && this.cardsInFlight$) {
      return this.cardsInFlight$;
    }

    const request$ = this.api.get<unknown[]>('/cards').pipe(
      map((cards) => cards.map((raw) => this.normalizeCard(raw))),
      tap((cards) => {
        this.cardsCache = cards;
      }),
      finalize(() => {
        this.cardsInFlight$ = null;
      }),
      shareReplay(1)
    );

    this.cardsInFlight$ = request$;
    return request$;
  }

  getCards(filters?: CardFilters): Observable<ExternalCardDto[]> {
    return this.preloadAllCards().pipe(
      map((cards) => this.sortCards(this.applyFilters(cards, filters)))
    );
  }

  sortCards(cards: ExternalCardDto[]): ExternalCardDto[] {
    return [...cards].sort((a, b) => {
      const idA = (a.cardSetId || a.id || '').trim().toUpperCase();
      const idB = (b.cardSetId || b.id || '').trim().toUpperCase();
      // Descending order: B compare to A
      return idB.localeCompare(idA);
    });
  }

  getCardById(id: string): Observable<ExternalCardDto> {
    const targetId = id.trim();

    return this.preloadAllCards().pipe(
      map((cards) => cards.find((card) => card.id === targetId || card.cardSetId === targetId)),
      switchMap((card) => (card ? of(card) : this.getCardByIdRemoteFallback(id)))
    );
  }

  getCardByIdRemoteFallback(id: string): Observable<ExternalCardDto> {
    return this.api.get<unknown>(`/cards/${id}`).pipe(
      map((raw) => this.normalizeCard(raw))
    );
  }

  getLeaders(grouped = false): Observable<ExternalCardDto[]> {
    return this.preloadAllCards().pipe(
      map((cards) => {
        const leaders = cards.filter((card) => (card.type ?? '').toLowerCase() === 'leader');
        return grouped ? this.groupAndPickBase(leaders) : leaders;
      })
    );
  }

  getBaseId(card: ExternalCardDto): string {
    const id = (card.cardSetId || card.id || '').trim();
    if (!id) return (card.name || '').trim().toLowerCase();
    // Typical OP TCG ID: OP01-001_P1, ST01-001-V.1, OP01-001 AA
    // Split by common separators and take the first part
    return id.split('_')[0].split('-V')[0].split(' ')[0].toLowerCase();
  }

  groupAndPickBase(cards: ExternalCardDto[]): ExternalCardDto[] {
    const grouped = new Map<string, ExternalCardDto[]>();
    for (const card of cards) {
      const bid = this.getBaseId(card);
      if (!bid) continue;
      const existing = grouped.get(bid) ?? [];
      existing.push(card);
      grouped.set(bid, existing);
    }

    const result: ExternalCardDto[] = [];
    for (const [bid, group] of grouped.entries()) {
      result.push(this.pickBaseVersion(bid, group));
    }
    return this.sortCards(result);
  }

  pickBaseVersion(baseId: string, group: ExternalCardDto[]): ExternalCardDto {
    if (group.length === 1) return group[0];

    const normalizedBaseId = baseId.toLowerCase();

    // 1. Exact match on cardImageId (highest priority for base version)
    const imageMatch = group.find(c => (c.cardImageId ?? '').trim().toLowerCase() === normalizedBaseId);
    if (imageMatch) return imageMatch;

    // 2. Exact match on cardSetId (fallback)
    const setMatch = group.find(c => (c.cardSetId ?? '').trim().toLowerCase() === normalizedBaseId);
    if (setMatch) return setMatch;

    // 3. Shortest cardImageId wins (base versions usually don't have suffixes like _p1)
    return [...group].sort((a, b) => {
      const idA = (a.cardImageId ?? (a.id || '')).trim();
      const idB = (b.cardImageId ?? (b.id || '')).trim();
      if (idA.length !== idB.length) return idA.length - idB.length;
      return idA.localeCompare(idB);
    })[0];
  }

  getCardVersionsBySetId(cardSetId: string): Observable<ExternalCardDto[]> {
    const baseId = this.getBaseId({ cardSetId } as any);

    return this.preloadAllCards().pipe(
      map((cards) => cards.filter((card) => this.getBaseId(card) === baseId))
    );
  }

  private normalizeCard(raw: unknown): ExternalCardDto {
    const card = (raw ?? {}) as Record<string, unknown>;
    const image = this.toStr(card['imageUrl']) ?? this.toStr(card['img']) ?? this.toStr(card['image']) ?? this.toStr(card['card_image']);
    const name = this.toStr(card['name']) ?? this.toStr(card['card_name']) ?? 'Unknown card';
    const cardType = this.toStr(card['type']) ?? this.toStr(card['card_type']);
    const cardColor = this.toColorStr(card['color']) ?? this.toColorStr(card['card_color']);
    const cardText = this.toStr(card['text']) ?? this.toStr(card['card_text']);
    const cardCost = this.toStr(card['cost']) ?? this.toStr(card['card_cost']);
    const cardPower = this.toStr(card['power']) ?? this.toStr(card['card_power']);
    const cardCounter = this.toStr(card['counter']) ?? this.toNum(card['counter_amount'])?.toString();
    const subTypes = this.toArray(card['subTypes']) ?? this.toArray(card['sub_types']) ?? (this.toStr(card['sub_types']) ? [this.toStr(card['sub_types'])!] : undefined);

    return {
      id: this.toStr(card['id']) ?? this.toStr(card['card_set_id']) ?? '',
      name,
      type: cardType,
      attribute: this.toStr(card['attribute']),
      power: cardPower,
      counter: cardCounter,
      color: cardColor,
      text: cardText,
      cost: cardCost,
      life: this.toStr(card['life']) === 'NULL' ? undefined : this.toStr(card['life']),
      imageUrl: image,
      setName: this.toStr(card['setName']) ?? this.toStr(card['set_name']),
      setId: this.toStr(card['setId']) ?? this.toStr(card['set_id']),
      cardSetId: this.toStr(card['card_set_id']),
      subTypes,
      rarity: this.toStr(card['rarity']) ?? this.toStr(card['card_rarity']),
      inventoryPrice: this.toNum(card['inventory_price']),
      marketPrice: this.toNum(card['market_price']),
      counterAmount: this.toNum(card['counter_amount']),
      dateScraped: this.toStr(card['date_scraped']),
      cardImageId: this.toStr(card['card_image_id'])
    };
  }

  private extractCardList(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
      return raw;
    }

    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const candidates = [obj['results'], obj['data'], obj['cards'], obj['items']];
      const foundArray = candidates.find((entry) => Array.isArray(entry));
      if (Array.isArray(foundArray)) {
        return foundArray;
      }

      return [obj];
    }

    return [];
  }

  private applyFilters(cards: ExternalCardDto[], filters?: CardFilters): ExternalCardDto[] {
    if (!filters) {
      return cards;
    }

    return cards.filter((card) => {
      // name or id
      if (filters.nameOrId && filters.nameOrId.trim()) {
        const q = filters.nameOrId.trim().toLowerCase();
        const inName = (card.name ?? '').toLowerCase().includes(q);
        const inId = (card.cardSetId ?? card.id ?? '').toLowerCase().includes(q);
        if (!inName && !inId) return false;
      }

      if (filters.text && filters.text.trim()) {
        const q = filters.text.trim().toLowerCase();
        if (!((card.text ?? '').toLowerCase().includes(q))) return false;
      }

      if (filters.set && filters.set.trim()) {
        const q = filters.set.trim().toLowerCase();
        const setId = (card.setId ?? card.setName ?? card.cardSetId ?? '').toLowerCase();
        if (!setId.includes(q)) return false;
      }

      if (filters.subTypes && filters.subTypes.trim()) {
        const q = filters.subTypes.trim().toLowerCase();
        const subs = (card.subTypes ?? []).map((s) => s.toLowerCase());
        if (!subs.some((s) => s.includes(q))) return false;
      }

      if (filters.types && filters.types.length > 0) {
        const t = (card.type ?? '').toLowerCase();
        if (!filters.types.map((x) => x.toLowerCase()).includes(t)) return false;
      }

      if (filters.rarity && filters.rarity.length > 0) {
        const r = (card.rarity ?? '').trim().toUpperCase();
        if (!filters.rarity.map((x) => x.trim().toUpperCase()).includes(r)) return false;
      }

      if (filters.attributes && filters.attributes.length > 0) {
        const a = (card.attribute ?? '').toLowerCase();
        if (!filters.attributes.map((x) => x.toLowerCase()).includes(a)) return false;
      }

      if (filters.keywords && filters.keywords.length > 0) {
        const text = (card.text ?? '').toLowerCase();
        const found = filters.keywords.some((kw) => text.includes(kw.toLowerCase()));
        if (!found) return false;
      }

      if (filters.counterFilters && filters.counterFilters.length > 0) {
        const counterAmount = card.counterAmount ?? 0;
        const selectedCounters = filters.counterFilters.map((value) => value.trim().toLowerCase());
        const matchesCounter =
          (selectedCounters.includes('hascounter') && counterAmount > 0) ||
          (selectedCounters.includes('1000') && counterAmount === 1000) ||
          (selectedCounters.includes('2000') && counterAmount === 2000);

        if (!matchesCounter) return false;
      }

      if (filters.colors && filters.colors.length > 0) {
        const cardColors = (card.color ?? '').toLowerCase();
        const selectedColors = filters.colors.map((x) => x.toLowerCase());
        // A card matches if ANY of the selected colors is present in the card's color string
        if (!selectedColors.some(sc => cardColors.includes(sc))) return false;
      }

      if (filters.hasTrigger !== undefined) {
        const has = ((card.text ?? '').toLowerCase().includes('trigger'));
        if (filters.hasTrigger && !has) return false;
        if (!filters.hasTrigger && has) return false;
      }

      if (filters.costs && filters.costs.length > 0) {
        const costNum = this.toNum(card.cost);
        if (costNum === undefined || !filters.costs.includes(costNum)) return false;
      }

      if (filters.powerRange) {
        const p = this.parsePowerToK(card.power);
        const min = filters.powerRange.min ?? 0;
        const max = filters.powerRange.max ?? 13000;
        if (p === undefined) return false;
        if (p < min || p > max) return false;
      }

      return true;
    });
  }

  private uniqueCards(cards: ExternalCardDto[]): ExternalCardDto[] {
    const seen = new Set<string>();
    return cards.filter((card) => {
      const key = (card.cardSetId || card.id || card.name || '').trim().toUpperCase();
      if (!key) {
        return true;
      }

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private normalizeRarities(rarities?: string[]): string[] {
    if (!rarities || rarities.length === 0) {
      return [];
    }

    return Array.from(
      new Set(
        rarities
          .map((rarity) => rarity.trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }

  private parsePowerToK(value?: string): number | undefined {
    if (!value) return undefined;
    const s = value.toLowerCase().trim();
    if (s.includes('k')) {
      const num = parseFloat(s.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? undefined : Math.round(num * 1000);
    }
    const m = s.match(/-?\d+/);
    if (!m) return undefined;
    const n = parseInt(m[0], 10);
    return n;
  }

  private matchesFilter(source: string | undefined, filter: string | undefined): boolean {
    if (!filter || !filter.trim()) {
      return true;
    }

    const expected = filter.trim().toLowerCase();
    const value = (source ?? '').toLowerCase();
    return value.includes(expected);
  }

  private toStr(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private toColorStr(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return (value as string[]).join('/');
    return undefined;
  }

  private toArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    return value.filter((item) => typeof item === 'string') as string[];
  }

  private toNum(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }
}