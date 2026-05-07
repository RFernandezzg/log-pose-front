import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CardsService } from './cards.service';
import { ExternalCardDto } from './cards.models';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-leaders',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './leaders.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(75, 85, 99, 0.8); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 1); }
  `]
})
export class LeadersComponent implements OnInit {
  loading = false;
  error = '';
  leaders: ExternalCardDto[] = [];

  // Modal state
  detailOpen = false;
  detailLoading = false;
  detailCard: ExternalCardDto | null = null;
  detailSlides: ExternalCardDto[] = [];
  detailImageIndex = 0;
  private detailRequestSeq = 0;

  constructor(
    private cardsService: CardsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.cardsService.getLeaders(true).subscribe({
      next: (leaders) => {
        this.leaders = leaders;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'No se pudieron cargar los leaders';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  openDetail(card: ExternalCardDto): void {
    this.detailOpen = true;
    this.detailLoading = true;
    this.detailCard = card;
    this.detailSlides = [card];
    this.detailImageIndex = 0;

    const baseId = this.cardsService.getBaseId(card);
    if (!baseId) {
      this.detailLoading = false;
      return;
    }

    const requestId = ++this.detailRequestSeq;
    this.cardsService.preloadAllCards().subscribe({
      next: (allCards) => {
        if (requestId !== this.detailRequestSeq) return;
        
        const versions = allCards.filter(c => {
          const cBase = this.cardsService.getBaseId(c);
          return cBase === baseId;
        });

        this.detailSlides = versions.length > 0 ? versions : [card];
        
        const initialIndex = this.detailSlides.findIndex(v => v.id === card.id || v.imageUrl === card.imageUrl);
        if (initialIndex !== -1) this.detailImageIndex = initialIndex;
        
        this.detailLoading = false;
      },
      error: () => {
        if (requestId !== this.detailRequestSeq) return;
        this.detailLoading = false;
      }
    });
  }

  get activeDetailSlide(): ExternalCardDto | undefined {
    return this.detailSlides[this.detailImageIndex];
  }

  selectDetailIndex(index: number): void {
    this.detailImageIndex = index;
  }

  closeDetail(): void {
    this.detailRequestSeq++;
    this.detailOpen = false;
    this.detailCard = null;
    this.detailSlides = [];
    this.detailImageIndex = 0;
  }

  viewDecksWithLeader(card: ExternalCardDto): void {
    const leaderId = card.cardSetId || card.id;
    this.closeDetail();
    this.router.navigate(['/decks/explore'], { queryParams: { leaderCardId: leaderId } });
  }
}