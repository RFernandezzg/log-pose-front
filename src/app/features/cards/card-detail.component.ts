import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardsService } from './cards.service';
import { ExternalCardDto } from './cards.models';

@Component({
  selector: 'app-card-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="space-y-6">
      <a routerLink="/cards" class="inline-flex rounded-xl border border-white/20 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Volver a cartas</a>

      <p *ngIf="loading" class="text-sm text-slate-300">Cargando detalle...</p>
      <p *ngIf="error" class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{{ error }}</p>

      <article *ngIf="card" class="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 lg:grid-cols-2">
        <img *ngIf="card.imageUrl" [src]="card.imageUrl" [alt]="card.name" class="w-full rounded-2xl object-cover" />
        <div class="space-y-4">
          <h1 class="text-3xl font-semibold text-white">{{ card.name }}</h1>
          <p class="text-sm text-slate-400">ID: {{ card.id }}</p>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl bg-slate-900/70 p-3"><span class="text-slate-400">Tipo</span><p class="text-white">{{ card.type || '-' }}</p></div>
            <div class="rounded-xl bg-slate-900/70 p-3"><span class="text-slate-400">Color</span><p class="text-white">{{ card.color || '-' }}</p></div>
            <div class="rounded-xl bg-slate-900/70 p-3"><span class="text-slate-400">Coste</span><p class="text-white">{{ card.cost || '-' }}</p></div>
            <div class="rounded-xl bg-slate-900/70 p-3"><span class="text-slate-400">Poder</span><p class="text-white">{{ card.power || '-' }}</p></div>
            <div class="rounded-xl bg-slate-900/70 p-3"><span class="text-slate-400">Vida</span><p class="text-white">{{ card.life || '-' }}</p></div>
            <div class="rounded-xl bg-slate-900/70 p-3"><span class="text-slate-400">Atributo</span><p class="text-white">{{ card.attribute || '-' }}</p></div>
          </div>

          <div *ngIf="card.text" class="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
            {{ card.text }}
          </div>
        </div>
      </article>
    </section>
  `
})
export class CardDetailComponent implements OnInit {
  loading = false;
  error = '';
  card: ExternalCardDto | null = null;

  constructor(
    private route: ActivatedRoute,
    private cardsService: CardsService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Carta no encontrada';
      return;
    }

    this.loading = true;
    this.cardsService.getCardById(id).subscribe({
      next: (card) => {
        this.card = card;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'No se pudo cargar el detalle de la carta';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}