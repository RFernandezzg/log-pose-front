import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DeckService } from '../../core/deck.service';
import { CardsService } from '../cards/cards.service';
import { ColorUtilsService } from '../../core/color-utils.service';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { DeckSummary } from '../../core/models/deck.models';
import { ExternalCardDto } from '../cards/cards.models';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-decks-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DateFormatPipe, PaginationComponent, TranslateModule],
  templateUrl: './decks-explore.component.html',
  styleUrls: ['./decks-explore.component.scss']
})
export class DecksExploreComponent implements OnInit {
  isLoading = false;
  decks: DeckSummary[] = [];
  leaderImages: Map<string, ExternalCardDto> = new Map();
  currentPage = 0;    // 0-indexed (server-side pagination)
  pageSize = 20;
  totalPages = 0;
  filterLeaderId: string | null = null;
  filterLeaderName: string | null = null;

  selectedColor = '';
  leaderSearchText = '';
  allLeaders: ExternalCardDto[] = [];
  filteredLeaders: ExternalCardDto[] = [];
  showLeaderDropdown = false;
  colors: string[] = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'];

  constructor(
    private deckService: DeckService,
    private cardsService: CardsService,
    public colorUtils: ColorUtilsService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    let firstLoad = true;
    this.route.queryParams.subscribe(params => {
      const newLeaderId = params['leader'] || params['leaderCardId'] || null;
      const newColor = params['color'] || '';

      if (firstLoad || newLeaderId !== this.filterLeaderId || newColor !== this.selectedColor) {
        firstLoad = false;
        this.filterLeaderId = newLeaderId;
        this.selectedColor = newColor;
        this.filterLeaderName = null;
        this.currentPage = 0;

        if (this.filterLeaderId) {
          this.cardsService.getCardById(this.filterLeaderId).subscribe({
            next: (card) => {
              this.filterLeaderName = card.name || this.filterLeaderId;
              this.leaderSearchText = card.name || '';
            },
            error: () => { this.filterLeaderName = this.filterLeaderId; }
          });
        }
        this.loadDecks();
      }
    });

    this.loadAllLeaders();
  }

  private loadAllLeaders(): void {
    this.cardsService.getLeaders().subscribe({
      next: (leaders) => {
        this.allLeaders = this.cardsService.groupAndPickBase(leaders);
        leaders.forEach(leader => {
          this.leaderImages.set(leader.id, leader);
          if (leader.cardSetId) this.leaderImages.set(leader.cardSetId, leader);
        });
      },
      error: (err) => console.error('Error loading leaders:', err)
    });
  }

  loadDecks(page = 0): void {
    this.isLoading = true;
    this.deckService.getPublicDecks(page, this.pageSize, this.filterLeaderId || undefined, this.selectedColor || undefined).subscribe({
      next: (response) => {
        this.decks = response.content;
        this.currentPage = response.number;
        this.totalPages = response.totalPages;
        this.isLoading = false;
        this.loadLeaderImages();
      },
      error: (err) => {
        console.error('Error loading public decks:', err);
        this.isLoading = false;
      }
    });
  }

  clearLeaderFilter(): void {
    this.filterLeaderId = null;
    this.filterLeaderName = null;
    this.leaderSearchText = '';
    this.applyFilters();
  }

  onLeaderSearch(): void {
    const text = this.leaderSearchText.toLowerCase().trim();
    if (!text) { this.filteredLeaders = []; this.showLeaderDropdown = false; return; }
    this.filteredLeaders = this.allLeaders
      .filter(l => (l.name ?? '').toLowerCase().includes(text) || (l.cardSetId ?? '').toLowerCase().includes(text))
      .slice(0, 10);
    this.showLeaderDropdown = this.filteredLeaders.length > 0;
  }

  selectLeader(leader: ExternalCardDto): void {
    this.filterLeaderId = leader.cardSetId || leader.id;
    this.filterLeaderName = leader.name || null;
    this.leaderSearchText = leader.name || '';
    this.showLeaderDropdown = false;
    this.applyFilters();
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadDecks();
  }

  loadLeaderImages(): void {
    const leaderIds = new Set(this.decks.map(d => d.leaderCardId));
    leaderIds.forEach(leaderId => {
      if (!this.leaderImages.has(leaderId)) {
        this.cardsService.getCardById(leaderId).subscribe({
          next: (leader) => { this.leaderImages.set(leaderId, leader); },
          error: (err) => console.error('Error loading leader:', err)
        });
      }
    });
  }

  getLeaderImage(leaderCardId: string): string | undefined {
    return this.leaderImages.get(leaderCardId)?.imageUrl;
  }

  /** Clases de hover-borde usando ColorUtilsService. */
  getBorderColorClass(deck: DeckSummary): string {
    // Prefiere el color almacenado en el deck si existe
    const color = deck.leaderColor || this.leaderImages.get(deck.leaderCardId)?.color;
    return this.colorUtils.getHoverBorderClass(color);
  }

  // ─── Pagination helpers (server-side 0-indexed) ───────────────────────────

  /** Handler del PaginationComponent (1-indexed) → convierte a 0-indexed para el servidor. */
  onPageChange(onePage: number): void {
    this.loadDecks(onePage - 1);
  }

  /** Página 1-indexed para el PaginationComponent. */
  get currentPageUI(): number { return this.currentPage + 1; }
}
