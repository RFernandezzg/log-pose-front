import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DeckService } from '../../core/deck.service';
import { CardsService } from '../cards/cards.service';
import { ColorUtilsService } from '../../core/color-utils.service';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { DeckSummary } from '../../core/models/deck.models';
import { ExternalCardDto } from '../cards/cards.models';

import { TranslateModule } from '@ngx-translate/core';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'app-decks',
  standalone: true,
  imports: [CommonModule, RouterModule, DateFormatPipe, TranslateModule],
  templateUrl: './decks.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(75, 85, 99, 0.8); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 1); }
  `]
})
export class DecksComponent implements OnInit {
  myDecks: DeckSummary[] = [];
  isLoading = true;
  error = '';
  leaderImages: Map<string, ExternalCardDto> = new Map();

  constructor(
    private deckService: DeckService,
    private cardsService: CardsService,
    public colorUtils: ColorUtilsService,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.loadMyDecks();
  }

  loadMyDecks(): void {
    this.isLoading = true;
    this.error = '';

    this.deckService.getMyDecks().subscribe({
      next: (decks: DeckSummary[]) => {
        this.myDecks = decks;
        this.isLoading = false;
        this.loadLeaderImages();
      },
      error: (err: any) => {
        console.error('Error loading decks:', err);
        this.error = 'Error al cargar tus decks. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  loadLeaderImages(): void {
    const leaderIds = new Set(this.myDecks.map(d => d.leaderCardId));
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

  /** Devuelve las clases Tailwind de hover-borde usando ColorUtilsService. */
  getBorderColorClass(leaderCardId: string): string {
    const leader = this.leaderImages.get(leaderCardId);
    return this.colorUtils.getHoverBorderClass(leader?.color);
  }

  viewDeck(deckId: number): void { this.router.navigate(['/decks/view', deckId]); }
  editDeck(deckId: number): void { this.router.navigate(['/decks/edit', deckId]); }
  navigateToBuild(): void { this.router.navigate(['/decks/build']); }

  deleteDeck(deckId: number, deckName: string): void {
    this.modalService.show({
      title: 'Eliminar Mazo',
      message: `¿Estás seguro de que deseas eliminar el mazo "${deckName}"?`,
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        this.deckService.deleteDeck(deckId).subscribe({
          next: () => {
            this.myDecks = this.myDecks.filter(d => d.id !== deckId);
            this.modalService.show({
              title: 'Éxito',
              message: 'Mazo eliminado correctamente.',
              type: 'success'
            });
          },
          error: (err: any) => {
            console.error('Error deleting deck:', err);
            this.modalService.show({
              title: 'Error',
              message: 'Error al eliminar el mazo.',
              type: 'error'
            });
          }
        });
      }
    });
  }
}
