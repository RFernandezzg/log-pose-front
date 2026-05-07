import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardsService } from '../../cards/cards.service';
import { DeckService } from '../../../core/deck.service';
import { AuthSessionService } from '../../../core/auth-session.service';
import { ColorUtilsService } from '../../../core/color-utils.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ExternalCardDto, CardFilters } from '../../cards/cards.models';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-deck-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent, TranslateModule],
  templateUrl: './deck-builder.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(75, 85, 99, 0.8); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 1); }
  `]
})
export class DeckBuilderComponent implements OnInit {
  private readonly destroy$ = new Subject<void>();
  availableCards: ExternalCardDto[] = [];
  deckName: string = '';
  deckDescription: string = '';
  deckIsPublic: boolean = true;
  
  selectedLeader: ExternalCardDto | null = null;
  deckCards: Map<string, { card: ExternalCardDto, quantity: number }> = new Map();
  
  editingDeckId: number | null = null;
  isLoading: boolean = false;

  // Card preview on hover
  hoveredCard: ExternalCardDto | null = null;
  previewX: number = 0;
  previewY: number = 0;
  // Card detail modal for deck entries
  detailOpen: boolean = false;
  detailLoading: boolean = false;
  detailError: string = '';
  detailCard: ExternalCardDto | null = null;
  detailVersions: ExternalCardDto[] = [];
  detailSlides: ExternalCardDto[] = [];
  detailImageIndex: number = 0;
  selectedDeckCardKey: string | null = null;
  private detailRequestSeq = 0;

  // Notification modal
  notificationModalOpen: boolean = false;
  notificationModalTitle: string = '';
  notificationModalMessage: string = '';
  notificationModalButtonLabel: string = 'Aceptar';
  notificationModalNavigateToDecks: boolean = false;

  // Filtros
  filters = this.fb.group({
    nameOrId: [''],
    text: [''],
    set: [''],
    subTypes: [''],
    types: [[]],
    rarity: [[]],
    attributes: [[]],
    keywords: [[]],
    counterFilters: [[]],
    colors: [[]],
    hasTrigger: [false],
    costs: [[]],
    powerMin: [0],
    powerMax: [13000]
  });

  // UI options
  sets: any[] = [];
  typesOptions: string[] = [];
  rarityOptions: string[] = ['L', 'C', 'UC', 'R', 'SR', 'SEC', 'TR'];
  attributeOptions: string[] = ['Special', 'Wisdom', 'Ranged', 'Slash', 'Strike', '?'];
  colorsOptions: string[] = ['Blue', 'Red', 'Green', 'Black', 'Yellow', 'Purple'];
  keywordsList = [
    'On Play', 'Blocker', 'Rush', 'Banish', 'Double Attack', 'Activate: Main', 'When attacking', 'On Block', 'On K.O', 'End of your turn', 'Opponent\'s turn', 'On Your Opponent\'s Attack', 'Main', 'Counter'
  ];
  costsList = Array.from({ length: 10 }, (_, i) => i + 1);
  
  // Pagination
  pageSize = 24;
  currentPage = 1;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.availableCards.length / this.pageSize));
  }

  get pagedAvailableCards(): ExternalCardDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.availableCards.slice(start, start + this.pageSize);
  }

  get visiblePageNumbers(): number[] {
    const windowSize = 5;
    if (this.totalPages <= windowSize) {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    }
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(1, this.currentPage - halfWindow);
    let end = start + windowSize - 1;
    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - windowSize + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  /** Delegado a PaginationComponent — se mantiene para compatibilidad interna. */
  goToPage(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.totalPages);
    this.currentPage = nextPage;
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  changePageSize(value: string): void {
    const nextSize = Number(value);
    if (!Number.isFinite(nextSize) || nextSize <= 0) return;
    this.pageSize = nextSize;
    this.currentPage = 1;
  }

  get paginationInfo(): { start: number; end: number } {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.availableCards.length);
    return { start, end };
  }

  onCardHover(card: ExternalCardDto, event: MouseEvent): void {
    this.hoveredCard = card;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const previewWidth = 320; // w-80 = 320px
    const previewHeight = 650; // altura estimada más realista del preview
    const padding = 10;

    // Posición horizontal: intenta poner a la izquierda, si no hay espacio va a la derecha
    let previewX = rect.left - previewWidth - padding;
    if (previewX < 0) {
      previewX = rect.right + padding;
    }

    // Posición vertical: intenta mantener la carta en el centro, pero ajusta si sale de pantalla
    let previewY = rect.top + rect.height / 2 - previewHeight / 2;
    const windowHeight = window.innerHeight;
    
    // Si sale por arriba, ajusta
    if (previewY < padding) {
      previewY = padding;
    }
    // Si sale por abajo, ajusta
    else if (previewY + previewHeight > windowHeight - padding) {
      previewY = windowHeight - previewHeight - padding;
    }

    this.previewX = previewX;
    this.previewY = previewY;
  }

  onCardLeave(): void {
    this.hoveredCard = null;
  }

  showNotificationModal(title: string, message: string, buttonLabel = 'Aceptar', navigateToDecks = false): void {
    this.notificationModalTitle = title;
    this.notificationModalMessage = message;
    this.notificationModalButtonLabel = buttonLabel;
    this.notificationModalNavigateToDecks = navigateToDecks;
    this.notificationModalOpen = true;
  }

  closeNotificationModal(): void {
    this.notificationModalOpen = false;
    this.notificationModalTitle = '';
    this.notificationModalMessage = '';
    this.notificationModalButtonLabel = 'Aceptar';

    const shouldNavigateToDecks = this.notificationModalNavigateToDecks;
    this.notificationModalNavigateToDecks = false;

    if (shouldNavigateToDecks) {
      this.router.navigate(['/decks']);
    }
  }

  openCardDetail(card: ExternalCardDto, deckCardKey: string): void {
    this.selectedDeckCardKey = deckCardKey;
    this.detailOpen = true;
    this.detailLoading = true;
    this.detailError = '';
    this.detailCard = card;
    this.detailVersions = [];
    this.detailSlides = [card];
    this.detailImageIndex = 0;

    const cardSetId = (card.cardSetId || card.id || '').trim();
    if (!cardSetId) {
      this.detailLoading = false;
      this.detailError = 'La carta no incluye card_set_id. Mostrando la versión disponible.';
      return;
    }

    const requestId = ++this.detailRequestSeq;

    this.cardsService.getCardVersionsBySetId(cardSetId).subscribe({
      next: (versions) => {
        if (requestId !== this.detailRequestSeq) {
          return;
        }

        this.detailVersions = versions;
        this.detailSlides = this.buildDetailSlides(card, versions);
        this.detailImageIndex = 0;
        this.detailCard = this.activeDetailSlide ?? card;
      },
      error: () => {
        if (requestId !== this.detailRequestSeq) {
          return;
        }

        this.detailError = 'No se pudieron cargar las versiones. Mostrando la versión disponible.';
        this.detailLoading = false;
      },
      complete: () => {
        if (requestId !== this.detailRequestSeq) {
          return;
        }

        this.detailLoading = false;
      }
    });
  }

  closeCardDetail(): void {
    this.detailRequestSeq++;
    this.detailOpen = false;
    this.detailLoading = false;
    this.detailError = '';
    this.detailCard = null;
    this.detailVersions = [];
    this.detailSlides = [];
    this.detailImageIndex = 0;
    this.selectedDeckCardKey = null;
  }

  get activeDetailSlide(): ExternalCardDto | undefined {
    return this.detailSlides[this.detailImageIndex];
  }

  selectDetailIndex(index: number): void {
    if (index < 0 || index >= this.detailSlides.length) {
      return;
    }

    this.detailImageIndex = index;
    this.detailCard = this.activeDetailSlide ?? this.detailCard;
  }

  applySelectedDetailVersionToDeck(): void {
    if (!this.selectedDeckCardKey) {
      return;
    }

    const selectedVersion = this.activeDetailSlide;
    if (!selectedVersion) {
      return;
    }

    const current = this.deckCards.get(this.selectedDeckCardKey);
    if (!current) {
      return;
    }

    this.deckCards.set(this.selectedDeckCardKey, {
      card: selectedVersion,
      quantity: current.quantity
    });

    this.closeCardDetail();
  }

  increaseCardQuantity(deckEntry: { key: string; card: ExternalCardDto; quantity: number }): void {
    const current = this.deckCards.get(deckEntry.key);
    if (!current) {
      return;
    }

    if (this.totalDeckCards >= 50) {
      this.showNotificationModal('Validación del mazo', 'El mazo ya está lleno (Máximo 50 cartas).');
      return;
    }

    if (current.quantity >= 4) {
      this.showNotificationModal('Validación del mazo', 'Solo puedes tener hasta 4 copias de la misma carta.');
      return;
    }

    current.quantity++;
  }

  decreaseCardQuantity(deckEntry: { key: string; card: ExternalCardDto; quantity: number }): void {
    const current = this.deckCards.get(deckEntry.key);
    if (!current) {
      return;
    }

    current.quantity--;
    if (current.quantity === 0) {
      this.deckCards.delete(deckEntry.key);
      if (this.selectedDeckCardKey === deckEntry.key) {
        this.closeCardDetail();
      }
    }
  }

  constructor(
    private cardsService: CardsService,
    private deckService: DeckService,
    private authSession: AuthSessionService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    public colorUtils: ColorUtilsService
  ) {}

  ngOnInit(): void {
    // Cargar sets y opciones de filtros
    this.cardsService.getAllSets().subscribe({
      next: (sets) => {
        this.sets = Array.isArray(sets) ? sets : [];
      },
      error: () => {
        this.sets = [];
      }
    });

    this.cardsService.preloadAllCards().subscribe((cards) => {
      this.typesOptions = Array.from(new Set(cards.map((c) => (c.type ?? '').trim()).filter(Boolean)));
    });

    this.filters.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.search();
      });

    // Detectar si estamos editando un deck existente
    this.route.paramMap.subscribe(params => {
      const deckId = params.get('id');
      if (deckId) {
        this.editingDeckId = parseInt(deckId, 10);
        this.loadDeckForEditing();
      } else {
        // Try to restore pending deck from localStorage
        this.restorePendingDeck();
        this.search();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDeckForEditing(): void {
    if (!this.editingDeckId) return;
    
    this.isLoading = true;
    this.deckService.getDeckById(this.editingDeckId).subscribe({
      next: (deck) => {
        this.deckName = deck.name;
        this.deckDescription = deck.description || '';
        this.deckIsPublic = deck.isPublic !== false; // default true if not specified
        
        // Buscar y cargar el líder
        this.cardsService.getCardById(deck.leaderCardId).subscribe({
          next: (card: any) => {
            this.selectedLeader = card;
          },
          error: (err: any) => console.error('Error loading leader:', err)
        });
        
        // Cargar las cartas del mazo
        const cardIds = Object.keys(deck.cards);
        if (cardIds.length > 0) {
          let loadedCards = 0;
          cardIds.forEach(cardId => {
            this.cardsService.getCardById(cardId).subscribe({
              next: (card: any) => {
                this.deckCards.set(cardId, {
                  card,
                  quantity: deck.cards[cardId]
                });
                loadedCards++;
                if (loadedCards === cardIds.length) {
                  this.search();
                  this.isLoading = false;
                }
              },
              error: (err: any) => {
                console.error('Error loading card:', err);
                loadedCards++;
                if (loadedCards === cardIds.length) {
                  this.search();
                  this.isLoading = false;
                }
              }
            });
          });
        } else {
          this.search();
          this.isLoading = false;
        }
      },
      error: (err: any) => {
        console.error('Error loading deck:', err);
        this.showNotificationModal('Error al cargar el mazo', 'No se pudo cargar el mazo. Volverás a la lista de mazos.', 'Volver a mis mazos', true);
      }
    });
  }

  search(): void {
    const filterValues = this.filters.getRawValue();
    
    const buildArrayFilter = (value: any): string[] | undefined => {
      return value && Array.isArray(value) && value.length > 0 ? value : undefined;
    };

    const buildNumberArrayFilter = (value: any): number[] | undefined => {
      return value && Array.isArray(value) && value.length > 0 ? value.map((v: any) => Number(v)) : undefined;
    };

    const filters: CardFilters = {
      nameOrId: filterValues.nameOrId || undefined,
      text: filterValues.text || undefined,
      set: filterValues.set || undefined,
      subTypes: filterValues.subTypes || undefined,
      types: buildArrayFilter(filterValues.types),
      rarity: buildArrayFilter(filterValues.rarity),
      attributes: buildArrayFilter(filterValues.attributes),
      keywords: buildArrayFilter(filterValues.keywords),
      counterFilters: buildArrayFilter(filterValues.counterFilters),
      colors: buildArrayFilter(filterValues.colors),
      hasTrigger: filterValues.hasTrigger || undefined,
      costs: buildNumberArrayFilter(filterValues.costs),
    };

    const minPower = Number(filterValues.powerMin ?? 0);
    const maxPower = Number(filterValues.powerMax ?? 13000);
    const normalizedMin = Math.min(minPower, maxPower);
    const normalizedMax = Math.max(minPower, maxPower);

    if (!(normalizedMin === 0 && normalizedMax === 13000)) {
      filters.powerRange = { min: normalizedMin, max: normalizedMax };
    }

    this.cardsService.getCards(filters).subscribe({
      next: (cards) => {
        // Excluimos las cartas DON!! y agrupamos usando la lógica centralizada
        const filtered = cards.filter(c => (c.type ?? '').toLowerCase() !== 'don!! card');
        this.availableCards = this.cardsService.groupAndPickBase(filtered);
        this.currentPage = 1;
      },
      error: (err: any) => console.error('Error searching cards:', err)
    });
  }

  toggleArrayValue(fieldName: string, value: any): void {
    const field = this.filters.get(fieldName);
    if (field) {
      const currentValues = field.value || [];
      const index = currentValues.indexOf(value);
      if (index > -1) {
        currentValues.splice(index, 1);
      } else {
        currentValues.push(value);
      }
      field.setValue([...currentValues]);
    }
  }

  isSelected(fieldName: string, value: any): boolean {
    const field = this.filters.get(fieldName);
    const values = field?.value || [];
    return values.includes(value);
  }

  addCardToDeck(card: ExternalCardDto) {
    if ((card.type ?? '').toLowerCase() === 'leader') {
      this.selectedLeader = card;
      return;
    }

    if (this.totalDeckCards >= 50) {
      this.showNotificationModal('Validación del mazo', 'El mazo ya está lleno (Máximo 50 cartas).');
      return;
    }

    const cardId = card.cardSetId || card.id;
    const current = this.deckCards.get(cardId);
    if (current) {
      if (current.quantity >= 4) {
        this.showNotificationModal('Validación del mazo', 'Solo puedes tener hasta 4 copias de la misma carta.');
        return;
      }
      current.quantity++;
    } else {
      this.deckCards.set(cardId, { card, quantity: 1 });
    }
  }

  removeLeader() {
    this.selectedLeader = null;
  }

  removeCard(card: ExternalCardDto) {
    const cardId = card.cardSetId || card.id;
    const current = this.deckCards.get(cardId);
    if (current) {
      current.quantity--;
      if (current.quantity === 0) {
        this.deckCards.delete(cardId);
      }
    }
  }

  get deckCardsList() {
    // Ordenamos por coste
    return Array.from(this.deckCards.entries())
      .sort((a, b) => {
        const costA = parseInt(a[1].card.cost || '0');
        const costB = parseInt(b[1].card.cost || '0');
        return costA - costB;
      })
      .map(([key, value]) => ({
        key,
        card: value.card,
        quantity: value.quantity
      }));
  }

  private buildDetailSlides(base: ExternalCardDto, versions: ExternalCardDto[]): ExternalCardDto[] {
    const slides = versions
      .filter((version) => !!version.imageUrl)
      .map((version) => this.mergeCardData(base, version));

    return slides.length > 0 ? slides : [base];
  }

  private mergeCardData(base: ExternalCardDto, incoming: ExternalCardDto): ExternalCardDto {
    return {
      ...base,
      ...incoming,
      id: incoming.id || base.id,
      cardSetId: incoming.cardSetId || base.cardSetId,
      imageUrl: incoming.imageUrl || base.imageUrl,
      name: incoming.name && incoming.name !== 'Unknown card' ? incoming.name : base.name
    };
  }

  get totalDeckCards() {
    let total = 0;
    for (const item of this.deckCards.values()) {
      total += item.quantity;
    }
    return total;
  }

  getBorderColorClass(color: string): string {
    return this.colorUtils.getBorderClass(color);
  }

  saveDeck() {
    if (!this.selectedLeader) {
      this.showNotificationModal('Validación del mazo', 'Debes seleccionar un Líder.');
      return;
    }
    if (!this.deckName.trim()) {
      this.showNotificationModal('Validación del mazo', 'Debes introducir un nombre para el mazo.');
      return;
    }

    // If not authenticated, save to localStorage and redirect to login
    if (!this.authSession.isAuthenticated()) {
      this.savePendingDeck();
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const cardMap: { [key: string]: number } = {};
    for (const [id, item] of this.deckCards.entries()) {
      cardMap[id] = item.quantity;
    }

    const deckRequest = {
      name: this.deckName,
      leaderCardId: this.selectedLeader.cardSetId || this.selectedLeader.id,
      leaderColor: this.selectedLeader.color,
      isPublic: this.deckIsPublic,
      cards: cardMap,
      description: this.deckDescription
    };

    if (this.editingDeckId) {
      // Actualizar deck existente
      this.deckService.updateDeck(this.editingDeckId, deckRequest).subscribe({
        next: (res: any) => {
          this.showNotificationModal('Mazo actualizado', '¡Mazo actualizado correctamente!', 'Volver a mis mazos', true);
        },
        error: (err: any) => {
          this.showNotificationModal('Error al actualizar', 'Error al actualizar: ' + (err.error?.message || err.message));
        }
      });
    } else {
      // Crear nuevo deck
      this.deckService.createDeck(deckRequest).subscribe({
        next: (res: any) => {
          localStorage.removeItem('pending_deck');
          this.showNotificationModal('Mazo guardado', '¡Mazo guardado correctamente!', 'Volver a mis mazos', true);
        },
        error: (err: any) => {
          this.showNotificationModal('Error al guardar', 'Error al guardar: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  private savePendingDeck(): void {
    const cardMap: { [key: string]: number } = {};
    for (const [id, item] of this.deckCards.entries()) {
      cardMap[id] = item.quantity;
    }

    const pendingDeck = {
      name: this.deckName,
      description: this.deckDescription,
      isPublic: this.deckIsPublic,
      leaderCardId: this.selectedLeader?.cardSetId || this.selectedLeader?.id || '',
      cards: cardMap
    };
    localStorage.setItem('pending_deck', JSON.stringify(pendingDeck));
  }

  private restorePendingDeck(): void {
    const raw = localStorage.getItem('pending_deck');
    if (!raw) return;

    try {
      const pending = JSON.parse(raw) as {
        name: string;
        description: string;
        isPublic: boolean;
        leaderCardId: string;
        cards: { [key: string]: number };
      };

      this.deckName = pending.name || '';
      this.deckDescription = pending.description || '';
      this.deckIsPublic = pending.isPublic !== false;

      // Load leader card
      if (pending.leaderCardId) {
        this.cardsService.getCardById(pending.leaderCardId).subscribe({
          next: (card) => { this.selectedLeader = card; },
          error: (err) => console.error('Error restoring leader:', err)
        });
      }

      // Load deck cards
      const cardIds = Object.keys(pending.cards);
      if (cardIds.length > 0) {
        this.isLoading = true;
        let loaded = 0;
        cardIds.forEach(cardId => {
          this.cardsService.getCardById(cardId).subscribe({
            next: (card) => {
              this.deckCards.set(cardId, { card, quantity: pending.cards[cardId] });
              loaded++;
              if (loaded === cardIds.length) this.isLoading = false;
            },
            error: () => {
              loaded++;
              if (loaded === cardIds.length) this.isLoading = false;
            }
          });
        });
      }

      // Clear pending deck after restoring
      localStorage.removeItem('pending_deck');
    } catch (e) {
      console.error('Error restoring pending deck:', e);
      localStorage.removeItem('pending_deck');
    }
  }
}
