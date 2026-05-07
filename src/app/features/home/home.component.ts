import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CardsService } from '../cards/cards.service';
import { DeckService } from '../../core/deck.service';
import { AuthSessionService } from '../../core/auth-session.service';
import { ExternalCardDto } from '../cards/cards.models';
import { DeckSummary } from '../../core/models/deck.models';
import { forkJoin, map } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  topLeaders: ExternalCardDto[] = [];
  featuredLeader: ExternalCardDto | null = null;
  topDecks: DeckSummary[] = [];
  allCards: ExternalCardDto[] = [];
  featuredSetCards: ExternalCardDto[] = [];
  featuredSetId = "OP15-EB04";
  isLoggedIn$ = this.authSessionService.user$.pipe(map(user => !!user));
  copied = false;

  constructor(
    private cardsService: CardsService,
    private deckService: DeckService,
    private authSessionService: AuthSessionService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // 1. Fetch Leaders and Decks to calculate popularity
    forkJoin({
      leaders: this.cardsService.getLeaders(true),
      decksResponse: this.deckService.getPublicDecks(0, 1000) // Get a large sample of decks
    }).subscribe(({ leaders, decksResponse }) => {
      const decks = decksResponse.content;
      const leaderCounts = new Map<string, number>();

      // Count decks per leader
      decks.forEach(deck => {
        if (deck.leaderCardId) {
          leaderCounts.set(deck.leaderCardId, (leaderCounts.get(deck.leaderCardId) ?? 0) + 1);
        }
      });

      // Sort leaders by deck count descending
      this.topLeaders = [...leaders].sort((a, b) => {
        const countA = leaderCounts.get(a.cardSetId ?? '') ?? 0;
        const countB = leaderCounts.get(b.cardSetId ?? '') ?? 0;
        return countB - countA;
      }).slice(0, 4);

      if (this.topLeaders.length > 0) {
        this.featuredLeader = this.topLeaders[0];
      }
    });

    // 2. Fetch Top Decks by likes for the other section
    this.deckService.getPublicDecks(0, 3, undefined, 'likesCount,desc').subscribe(res => {
      this.topDecks = res.content;
    });

    // 3. Load all cards for images and OP-15 promo
    this.cardsService.preloadAllCards().subscribe(cards => {
      this.allCards = cards;
      this.featuredSetCards = cards
        .filter(c => (c.cardSetId ?? '').startsWith('OP15') || (c.setId ?? '') === 'OP15-EB04')
        .slice(0, 12);
    });
  }

  getLeaderImage(cardId?: string): string | undefined {
    if (!cardId) return undefined;
    const card = this.allCards.find(c => c.cardSetId === cardId || c.id === cardId);
    return card?.imageUrl;
  }

  viewDecksWithLeader(card: ExternalCardDto): void {
    const cardSetId = card.cardSetId || card.id;
    this.router.navigate(['/decks/explore'], { queryParams: { leader: cardSetId } });
  }

  copyInviteLink(): void {
    const url = window.location.origin;
    navigator.clipboard.writeText(url).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 3000);
    });
  }
}
