import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CardsService } from './cards.service';
import { ExternalCardDto } from './cards.models';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PaginationComponent, TranslateModule],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  loading = false;
  error = '';
  cards: ExternalCardDto[] = [];
  pageSize = 24;
  currentPage = 1;
  detailOpen = false;
  detailLoading = false;
  detailError = '';
  detailCard: ExternalCardDto | null = null;
  detailVersions: ExternalCardDto[] = [];
  detailSlides: ExternalCardDto[] = [];
  detailImageIndex = 0;
  private imageNonce = 0;
  private imageLoadSeq = 0;
  private detailRequestSeq = 0;
  activeImageSrc: string | undefined;
  imageLoading = false;
  private imageFallbackTried = false;

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

  constructor(
    private fb: FormBuilder,
    private cardsService: CardsService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // preload options and cards
    this.cardsService.getAllSets().subscribe({
      next: (sets) => {
        this.sets = Array.isArray(sets) ? sets : [];
      },
      error: () => {
        this.sets = [];
      }
    });

    this.cardsService.preloadAllCards().subscribe((cards) => {
      // derive options from preloaded cards
      this.typesOptions = Array.from(new Set(cards.map((c) => (c.type ?? '').trim()).filter(Boolean)));
    });

    this.filters.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.search();
      });

    // Handle query parameters (e.g. from Home page)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (Object.keys(params).length > 0) {
        const patch: any = {};
        if (params['set']) patch.set = params['set'];
        if (params['name']) patch.nameOrId = params['name'];
        if (params['color']) patch.colors = [params['color']];

        if (Object.keys(patch).length > 0) {
          this.filters.patchValue(patch);
          // The patchValue above will trigger valueChanges and call search()
        } else {
          this.search();
        }
      } else {
        this.search();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
  powerOptions = Array.from({ length: 14 }, (_, i) => i * 1000);

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.cards.length / this.pageSize));
  }

  get pagedCards(): ExternalCardDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.cards.slice(start, start + this.pageSize);
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

  search(): void {
    this.loading = true;
    this.error = '';

    const raw: any = this.filters.getRawValue();
    const params = {
      nameOrId: raw.nameOrId?.trim() || undefined,
      text: raw.text?.trim() || undefined,
      set: raw.set?.trim() || undefined,
      subTypes: raw.subTypes?.trim() || undefined,
      types: Array.isArray(raw.types) && raw.types.length ? raw.types : undefined,
      rarity: Array.isArray(raw.rarity) && raw.rarity.length ? raw.rarity : undefined,
      attributes: Array.isArray(raw.attributes) && raw.attributes.length ? raw.attributes : undefined,
      keywords: Array.isArray(raw.keywords) && raw.keywords.length ? raw.keywords : undefined,
      counterFilters: Array.isArray(raw.counterFilters) && raw.counterFilters.length ? raw.counterFilters : undefined,
      colors: Array.isArray(raw.colors) && raw.colors.length ? raw.colors : undefined,
      hasTrigger: raw.hasTrigger ? true : undefined,
      costs: Array.isArray(raw.costs) && raw.costs.length ? raw.costs.map((n: any) => Number(n)) : undefined,
    } as any;

    const minP = Number(raw.powerMin ?? 0);
    const maxP = Number(raw.powerMax ?? 13000);
    const normalizedMin = Math.min(minP, maxP);
    const normalizedMax = Math.max(minP, maxP);
    if (!(normalizedMin === 0 && normalizedMax === 13000)) {
      (params as any).powerRange = { min: normalizedMin, max: normalizedMax };
    }

    this.cardsService.getCards(params).subscribe({
      next: (cards) => {
        this.cards = cards;
        this.currentPage = 1;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'No se pudieron cargar las cartas';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  toggleArrayValue(control: string, value: any): void {
    const ctrl = this.filters.get(control);
    if (!ctrl) return;
    const arr = Array.isArray(ctrl.value) ? [...ctrl.value] : [];
    const idx = arr.indexOf(value);
    if (idx === -1) arr.push(value);
    else arr.splice(idx, 1);
    ctrl.setValue(arr);
  }

  isSelected(control: string, value: any): boolean {
    const ctrl = this.filters.get(control);
    if (!ctrl) return false;
    const arr = Array.isArray(ctrl.value) ? ctrl.value : [];
    return arr.indexOf(value) !== -1;
  }

  clearFilters(): void {
    this.filters.reset({
      nameOrId: '', text: '', set: '', subTypes: '', types: null, rarity: null, attributes: null, keywords: null, counterFilters: null, colors: null, hasTrigger: false, costs: null, powerMin: 0, powerMax: 13000
    } as any);
  }

  reset(): void {
    this.filters.reset({ nameOrId: '', text: '', set: '', subTypes: '', types: null, rarity: null, attributes: null, keywords: null, counterFilters: null, colors: null, hasTrigger: false, costs: null, powerMin: 0, powerMax: 13000 } as any);
    this.currentPage = 1;
  }

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
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }

    this.pageSize = nextSize;
    this.currentPage = 1;
  }

  openDetail(card: ExternalCardDto): void {
    this.detailOpen = true;
    this.detailError = '';
    this.detailCard = card;
    this.detailVersions = [];
    this.detailSlides = [card];
    this.detailImageIndex = 0;
    this.imageNonce++;
    this.imageFallbackTried = false;
    this.loadActiveImageWithGet();

    const cardSetId = card.cardSetId?.trim();
    if (!cardSetId) {
      this.detailError = 'La carta no incluye card_set_id. Mostrando imagen disponible.';
      this.detailLoading = false;
      return;
    }

    const requestId = ++this.detailRequestSeq;
    this.detailLoading = true;

    this.cardsService.getCardVersionsBySetId(cardSetId).subscribe({
      next: (versions) => {
        if (requestId !== this.detailRequestSeq) {
          return;
        }

        this.detailVersions = versions;
        this.detailSlides = this.buildSlides(card, versions);
        this.detailImageIndex = 0;
        this.imageNonce++;
        this.imageFallbackTried = false;
        this.loadActiveImageWithGet();

        if (this.detailSlides.length > 0) {
          this.detailCard = this.mergeCardData(card, this.detailSlides[0]);
        }
      },
      error: () => {
        if (requestId !== this.detailRequestSeq) {
          return;
        }
        this.detailError = 'No se pudieron cargar las versiones. Mostrando imagen disponible.';
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

  closeDetail(): void {
    this.detailOpen = false;
    this.detailLoading = false;
    this.detailError = '';
    this.detailCard = null;
    this.detailVersions = [];
    this.detailSlides = [];
    this.detailImageIndex = 0;
    this.imageNonce++;
    this.imageLoadSeq++;
    this.activeImageSrc = undefined;
    this.imageLoading = false;
    this.imageFallbackTried = false;
  }

  get activeDetailSlide(): ExternalCardDto | undefined {
    return this.detailSlides[this.detailImageIndex];
  }

  prevDetailImage(): void {
    if (this.detailSlides.length <= 1) {
      return;
    }

    this.detailImageIndex = (this.detailImageIndex - 1 + this.detailSlides.length) % this.detailSlides.length;
    this.imageNonce++;
    this.imageFallbackTried = false;
    this.loadActiveImageWithGet();
  }

  nextDetailImage(): void {
    if (this.detailSlides.length <= 1) {
      return;
    }

    this.detailImageIndex = (this.detailImageIndex + 1) % this.detailSlides.length;
    this.imageNonce++;
    this.imageFallbackTried = false;
    this.loadActiveImageWithGet();
  }

  selectDetailIndex(index: number): void {
    if (index < 0 || index >= this.detailSlides.length) return;
    this.detailImageIndex = index;
    this.imageNonce++;
    this.imageFallbackTried = false;
    this.loadActiveImageWithGet();
  }

  getThumbnailSrc(index: number): string | undefined {
    const slide = this.detailSlides[index];
    if (!slide?.imageUrl) return undefined;
    const sep = slide.imageUrl.includes('?') ? '&' : '?';
    return `${slide.imageUrl}${sep}t=${index}-${this.imageNonce}`;
  }

  private buildSlides(base: ExternalCardDto, versions: ExternalCardDto[]): ExternalCardDto[] {
    const slides = versions
      .filter((version) => !!version.imageUrl)
      .map((version) => this.mergeCardData(base, version));

    if (slides.length > 0) {
      return slides;
    }

    return [base];
  }

  private loadActiveImageWithGet(): void {
    const rawUrl = this.activeDetailSlide?.imageUrl;
    if (!rawUrl) {
      this.activeImageSrc = undefined;
      this.imageLoading = false;
      return;
    }

    const sep = rawUrl.includes('?') ? '&' : '?';
    const requestUrl = `${rawUrl}${sep}v=${this.detailImageIndex}-${this.imageNonce}`;
    const currentLoad = ++this.imageLoadSeq;
    this.imageLoading = true;

    const preloader = new Image();
    preloader.onload = () => {
      if (currentLoad !== this.imageLoadSeq) {
        return;
      }

      // Set src only after a successful GET on this exact URL.
      this.activeImageSrc = requestUrl;
      this.imageLoading = false;
      this.imageFallbackTried = false;
    };

    preloader.onerror = () => {
      if (currentLoad !== this.imageLoadSeq) {
        return;
      }

      this.imageLoading = false;
      this.onImageError();
    };

    preloader.src = requestUrl;
  }

  onImageError(): void {
    if (this.imageFallbackTried) {
      this.activeImageSrc = undefined;
      this.imageLoading = false;
      return;
    }

    // try raw url without cache-buster
    const raw = this.activeDetailSlide?.imageUrl;
    if (raw) {
      this.imageLoading = true;
      this.activeImageSrc = raw;
      this.imageFallbackTried = true;
      return;
    }

    this.imageLoading = false;
  }

  private hasMeaningfulDetail(card: ExternalCardDto): boolean {
    return !!(
      card.imageUrl ||
      card.text ||
      card.type ||
      card.color ||
      card.cost ||
      card.power ||
      card.life ||
      card.attribute ||
      (card.name && card.name !== 'Unknown card')
    );
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
}