import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DeckService } from '../../core/deck.service';
import { CardsService } from '../cards/cards.service';
import { AuthSessionService } from '../../core/auth-session.service';
import { DeckDetail } from '../../core/models/deck.models';
import { ExternalCardDto } from '../cards/cards.models';
import { ColorUtilsService } from '../../core/color-utils.service';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';
import { environment } from '../../../environments/environment';
import { jsPDF } from 'jspdf';

interface CardWithQuantity extends ExternalCardDto {
  quantity: number;
}

const WATERMARK = 'OPTCG Deck Builder';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-deck-view',
  standalone: true,
  imports: [CommonModule, RouterModule, DateFormatPipe, TranslateModule],
  templateUrl: './deck-view.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(75, 85, 99, 0.8); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 1); }
  `]
})
export class DeckViewComponent implements OnInit {
  deck: DeckDetail | null = null;
  leaderCard: ExternalCardDto | null = null;
  deckCards: CardWithQuantity[] = [];
  isLoading = true;
  error = '';
  isOwner = false;
  hasLiked = false;

  // Modal state
  detailOpen = false;
  detailCard: CardWithQuantity | null = null;

  // Export state
  exportMenuOpen = false;
  exportTextCopied = false;
  exportingImage = false;
  exportingPdf = false;

  constructor(
    private deckService: DeckService,
    private cardsService: CardsService,
    private authSession: AuthSessionService,
    private route: ActivatedRoute,
    public router: Router,
    public colorUtils: ColorUtilsService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: any) => {
      const deckId = params.get('id');
      if (deckId) this.loadDeck(parseInt(deckId, 10));
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('#export-menu-container')) {
      this.exportMenuOpen = false;
    }
  }

  // ─── Data loading ─────────────────────────────────────────────────────────

  loadDeck(deckId: number): void {
    this.isLoading = true;
    this.error = '';
    this.deckCards = [];
    this.leaderCard = null;

    this.deckService.getDeckById(deckId).subscribe({
      next: (deck: DeckDetail) => {
        this.deck = deck;
        const currentUser = this.authSession.user?.username;
        this.isOwner = !!currentUser && deck.username === currentUser;
        if (this.isAuthenticated) {
          this.deckService.getLikeStatus(deck.id).subscribe({
            next: (status) => { this.hasLiked = status.liked; },
            error: () => { this.hasLiked = false; }
          });
        }
        this.loadLeaderCard();
        this.loadDeckCards();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar el deck.';
        this.isLoading = false;
      }
    });
  }

  loadLeaderCard(): void {
    if (!this.deck?.leaderCardId) return;
    this.cardsService.getCardById(this.deck.leaderCardId).subscribe({
      next: (card: ExternalCardDto) => { this.leaderCard = card; },
      error: (err: any) => console.error('Error loading leader card:', err)
    });
  }

  loadDeckCards(): void {
    if (!this.deck?.cards) { this.isLoading = false; return; }
    const cardIds = Object.keys(this.deck.cards);
    if (cardIds.length === 0) { this.isLoading = false; return; }

    let loaded = 0;
    cardIds.forEach(cardId => {
      this.cardsService.getCardById(cardId).subscribe({
        next: (card: ExternalCardDto) => {
          const withQty: CardWithQuantity = { ...card, quantity: this.deck?.cards[cardId] || 1 };
          this.deckCards.push(withQty);
          if (++loaded === cardIds.length) {
            this.deckCards.sort((a, b) => parseInt(a.cost || '0') - parseInt(b.cost || '0'));
            this.isLoading = false;
          }
        },
        error: () => { if (++loaded === cardIds.length) this.isLoading = false; }
      });
    });
  }

  // ─── Modal ────────────────────────────────────────────────────────────────

  openCardDetail(card: CardWithQuantity): void { this.detailCard = card; this.detailOpen = true; }
  openLeaderDetail(): void {
    if (!this.leaderCard) return;
    this.detailCard = { ...this.leaderCard, quantity: 1 };
    this.detailOpen = true;
  }
  closeDetail(): void { this.detailOpen = false; this.detailCard = null; }
  selectCardByIndex(i: number): void { if (i >= 0 && i < this.deckCards.length) this.detailCard = this.deckCards[i]; }

  // ─── Owner actions ────────────────────────────────────────────────────────

  editDeck(): void { if (this.deck?.id) this.router.navigate(['/decks/edit', this.deck.id]); }

  deleteDeck(): void {
    if (!this.deck) return;
    if (confirm(`¿Estás seguro de que deseas eliminar el mazo "${this.deck.name}"?`)) {
      this.deckService.deleteDeck(this.deck.id).subscribe({
        next: () => { alert('Mazo eliminado correctamente.'); this.router.navigate(['/decks']); },
        error: () => alert('Error al eliminar el mazo.')
      });
    }
  }

  toggleLike(): void {
    if (!this.deck?.id) return;
    this.deckService.toggleLike(this.deck.id).subscribe({
      next: (result) => { this.hasLiked = result.liked; if (this.deck) this.deck.likesCount = result.likesCount; },
      error: (err: any) => console.error(err)
    });
  }

  copyDeck(): void {
    if (!this.deck) return;
    localStorage.setItem('pending_deck', JSON.stringify({
      name: this.deck.name + ' (copia)', description: this.deck.description || '',
      isPublic: true, leaderCardId: this.deck.leaderCardId, cards: this.deck.cards
    }));
    this.router.navigate(['/decks/build']);
  }

  // ─── Export menu ──────────────────────────────────────────────────────────

  toggleExportMenu(event: MouseEvent): void { event.stopPropagation(); this.exportMenuOpen = !this.exportMenuOpen; }

  // ─── EXPORT 1: Text list → clipboard ─────────────────────────────────────

  exportToText(): void {
    if (!this.deck) return;
    this.exportMenuOpen = false;

    const lines: string[] = [];
    if (this.leaderCard?.cardSetId) {
      lines.push(`1x${this.leaderCard.cardSetId}`);
    } else if (this.deck.leaderCardId) {
      lines.push(`1x${this.deck.leaderCardId}`);
    }
    this.deckCards.forEach(c => lines.push(`${c.quantity}x${c.cardSetId || c.id}`));
    const text = lines.join('\n');

    const showCopied = () => {
      this.exportTextCopied = true;
      setTimeout(() => { this.exportTextCopied = false; }, 2500);
    };

    navigator.clipboard.writeText(text).then(showCopied).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showCopied();
    });
  }

  // ─── EXPORT 2: PNG image via Canvas ───────────────────────────────────────

  async exportToImage(): Promise<void> {
    if (!this.deck || this.exportingImage) return;
    this.exportMenuOpen = false;
    this.exportingImage = true;

    try {
      const COLS = 5;
      const CARD_W = 140;
      const CARD_H = 196;
      const GAP = 14;
      const HEADER_H = 160;
      const PAD = 24;
      const BADGE_H = 28;

      const rows = Math.ceil(this.deckCards.length / COLS);
      const W = PAD * 2 + COLS * CARD_W + (COLS - 1) * GAP;
      const H = HEADER_H + PAD + rows * (CARD_H + GAP + BADGE_H) + PAD + 36;

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#0b0d2a';
      ctx.fillRect(0, 0, W, H);

      const fetchImgAsDataUrl = (url: string) => this.fetchViaProxy(url);
      const loadImgFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(new Image());
          img.src = dataUrl;
        });

      const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
      grad.addColorStop(0, '#1d2269');
      grad.addColorStop(1, '#0d1040');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, HEADER_H);
      ctx.strokeStyle = '#857752';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, HEADER_H); ctx.lineTo(W, HEADER_H); ctx.stroke();

      const leaderDataUrl = this.leaderCard?.imageUrl ? await fetchImgAsDataUrl(this.leaderCard.imageUrl) : null;
      const LW = 90, LH = 126;
      const LX = PAD, LY = (HEADER_H - LH) / 2;
      if (leaderDataUrl) {
        const lImg = await loadImgFromDataUrl(leaderDataUrl);
        ctx.save();
        this.roundRect(ctx, LX, LY, LW, LH, 8); ctx.clip();
        ctx.drawImage(lImg, LX, LY, LW, LH);
        ctx.restore();
        ctx.strokeStyle = '#857752'; ctx.lineWidth = 2;
        this.roundRect(ctx, LX, LY, LW, LH, 8); ctx.stroke();
      }

      const TX = LX + LW + 18;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Inter, Arial, sans-serif';
      ctx.fillText(this.deck.name, TX, HEADER_H / 2 - 8);
      ctx.fillStyle = '#857752';
      ctx.font = '15px Inter, Arial, sans-serif';
      ctx.fillText(`por ${this.deck.username}`, TX, HEADER_H / 2 + 16);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.fillText(`${this.getTotalCards()} cartas · ${this.deckCards.length} únicas`, TX, HEADER_H / 2 + 38);

      const dataUrls = await Promise.all(this.deckCards.map(c => fetchImgAsDataUrl(c.imageUrl || '')));
      const cardImgs = await Promise.all(dataUrls.map(d => d ? loadImgFromDataUrl(d) : Promise.resolve(null)));

      for (let i = 0; i < this.deckCards.length; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = PAD + col * (CARD_W + GAP);
        const y = HEADER_H + PAD + row * (CARD_H + GAP + BADGE_H);

        const img = cardImgs[i];
        if (img && img.naturalWidth > 0) {
          ctx.save();
          this.roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.clip();
          ctx.drawImage(img, x, y, CARD_W, CARD_H);
          ctx.restore();
        } else {
          ctx.fillStyle = '#1d2269';
          this.roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();
          ctx.fillStyle = '#857752';
          ctx.font = '11px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(this.deckCards[i].cardSetId || this.deckCards[i].id || '-', x + CARD_W / 2, y + CARD_H / 2);
          ctx.textAlign = 'left';
        }

        const qty = this.deckCards[i].quantity;
        const pillY = y + CARD_H + 4;
        ctx.fillStyle = qty >= 4 ? '#857752' : '#1d2269';
        this.roundRect(ctx, x, pillY, CARD_W, 20, 6); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 12px Inter, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`x${qty}`, x + CARD_W / 2, pillY + 14);
        ctx.textAlign = 'left';
      }

      ctx.fillStyle = 'rgba(133,119,82,0.35)';
      ctx.font = 'bold 13px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(WATERMARK, W - PAD, H - 12);
      ctx.textAlign = 'left';

      const link = document.createElement('a');
      link.download = `${this.deck.name.replace(/[^a-z0-9]/gi, '_')}_deck.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
    } finally {
      this.exportingImage = false;
    }
  }

  // ─── EXPORT 3: Real PDF via jsPDF ─────────────────────────────────────────

  async exportToPdf(): Promise<void> {
    if (!this.deck || this.exportingPdf) return;
    this.exportMenuOpen = false;
    this.exportingPdf = true;

    try {
      type PrintCard = { src: string; id: string; name: string };
      const printCards: PrintCard[] = [];

      if (this.leaderCard?.imageUrl) {
        printCards.push({
          src: this.leaderCard.imageUrl,
          id: this.leaderCard.cardSetId || this.deck.leaderCardId,
          name: this.leaderCard.name || this.deck.leaderCardId
        });
      }
      for (const c of this.deckCards) {
        for (let i = 0; i < c.quantity; i++) {
          printCards.push({ src: c.imageUrl || '', id: c.cardSetId || c.id, name: c.name });
        }
      }

      const dataUrls = await Promise.all(printCards.map(c => this.fetchViaProxy(c.src)));

      const CARD_W = 63, CARD_H = 88, COLS = 3, ROWS = 3, GAP = 1;
      const MARGIN_X = (210 - COLS * CARD_W - (COLS - 1) * GAP) / 2;
      const MARGIN_Y = (297 - ROWS * CARD_H - (ROWS - 1) * GAP) / 2;
      const CARDS_PER_PAGE = COLS * ROWS;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let cardIndex = 0;

      for (const dataUrl of dataUrls) {
        const posOnPage = cardIndex % CARDS_PER_PAGE;
        if (cardIndex > 0 && posOnPage === 0) doc.addPage();

        const col = posOnPage % COLS;
        const row = Math.floor(posOnPage / COLS);
        const x = MARGIN_X + col * (CARD_W + GAP);
        const y = MARGIN_Y + row * (CARD_H + GAP);

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.15);
        doc.setLineDashPattern([0.8, 0.8], 0);
        doc.rect(x, y, CARD_W, CARD_H);
        doc.setLineDashPattern([], 0);

        if (dataUrl) {
          const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          try {
            doc.addImage(dataUrl, format, x, y, CARD_W, CARD_H);
          } catch {
            doc.setFillColor(29, 34, 105);
            doc.rect(x, y, CARD_W, CARD_H, 'F');
            doc.setFontSize(7); doc.setTextColor(133, 119, 82);
            doc.text(printCards[cardIndex]?.id || '?', x + 2, y + CARD_H / 2);
          }
        } else {
          doc.setFillColor(20, 25, 80);
          doc.rect(x, y, CARD_W, CARD_H, 'F');
          doc.setFontSize(7); doc.setTextColor(133, 119, 82);
          doc.text(printCards[cardIndex]?.id || '?', x + 2, y + CARD_H / 2);
        }
        cardIndex++;
      }

      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        if (p === 1) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(29, 34, 105);
          doc.text(`${this.deck.name}  ·  por ${this.deck.username}`, MARGIN_X, MARGIN_Y - 6);
        }
        doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(180, 170, 140);
        doc.text(`${WATERMARK}  ·  pág. ${p}/${totalPages}`, 210 - MARGIN_X, 297 - (MARGIN_Y - 6), { align: 'right' });
      }

      doc.save(`${this.deck.name.replace(/[^a-z0-9]/gi, '_')}_deck.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el PDF. Comprueba la consola para más detalles.');
    } finally {
      this.exportingPdf = false;
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private async fetchViaProxy(url: string): Promise<string | null> {
    if (!url) return null;
    const proxyUrl = `${environment.apiBaseUrl}/proxy/image?url=${encodeURIComponent(url)}`;
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  backToDecks(): void { this.router.navigate(['/decks']); }

  getTotalCards(): number {
    if (!this.deck?.cards) return 0;
    return Object.values(this.deck.cards).reduce((sum: number, qty: any) => sum + qty, 0);
  }

  getBorderColorClass(color: string): string {
    return this.colorUtils.getBorderClass(color);
  }

  get isAuthenticated(): boolean { return this.authSession.isAuthenticated(); }

  getHeaderGradient(): { [key: string]: string } {
    return this.colorUtils.getHeaderGradientStyle(this.leaderCard?.color);
  }
}
