import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de paginación reutilizable (1-indexed).
 *
 * Sustituye la lógica de paginación duplicada en:
 * - CardsComponent
 * - DeckBuilderComponent
 * - DecksExploreComponent
 *
 * Para paginación de servidor (0-indexed) adaptar el handler:
 *   (pageChange)="onPage($event - 1)"
 *
 * @example
 * <app-pagination
 *   [currentPage]="currentPage"
 *   [totalPages]="totalPages"
 *   (pageChange)="goToPage($event)"
 *   (pageSizeChange)="changePageSize($event)"
 *   [showPageSizeSelector]="true"
 * />
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">

      <!-- Info + page size selector -->
      <div class="flex items-center gap-3 text-sm text-slate-400">
        <span *ngIf="totalPages > 0">
          Pág. <span class="font-bold text-white">{{ currentPage }}</span> de
          <span class="font-bold text-white">{{ totalPages }}</span>
        </span>

        <select *ngIf="showPageSizeSelector"
          [value]="pageSize"
          (change)="onPageSizeChange($event)"
          class="rounded-lg border border-white/10 bg-[#1d2269] px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#857752]">
          <option *ngFor="let s of pageSizeOptions" [value]="s">{{ s }} / pág.</option>
        </select>
      </div>

      <!-- Page buttons -->
      <div class="flex items-center gap-1">
        <!-- Prev -->
        <button
          (click)="onPageChange(currentPage - 1)"
          [disabled]="currentPage <= 1"
          class="rounded-lg border border-white/10 bg-[#1d2269] px-3 py-1.5 text-sm text-white transition-all hover:bg-[#857752]/20 disabled:cursor-not-allowed disabled:opacity-40">
          ‹
        </button>

        <!-- Visible page numbers -->
        <ng-container *ngFor="let p of visiblePageNumbers">
          <button
            (click)="onPageChange(p)"
            [class.bg-\[#857752\]]="p === currentPage"
            [class.text-white]="p === currentPage"
            [class.font-bold]="p === currentPage"
            [class.bg-\[#1d2269\]]="p !== currentPage"
            [class.text-slate-400]="p !== currentPage"
            class="rounded-lg border border-white/10 px-3 py-1.5 text-sm transition-all hover:bg-[#857752]/20 min-w-[2.25rem]">
            {{ p }}
          </button>
        </ng-container>

        <!-- Next -->
        <button
          (click)="onPageChange(currentPage + 1)"
          [disabled]="currentPage >= totalPages"
          class="rounded-lg border border-white/10 bg-[#1d2269] px-3 py-1.5 text-sm text-white transition-all hover:bg-[#857752]/20 disabled:cursor-not-allowed disabled:opacity-40">
          ›
        </button>
      </div>
    </div>
  `,
})
export class PaginationComponent implements OnChanges {
  /** Página actual (1-indexed). */
  @Input() currentPage = 1;
  /** Total de páginas disponibles. */
  @Input() totalPages = 1;
  /** Tamaño de página actual (para el selector). */
  @Input() pageSize = 24;
  /** Mostrar selector de tamaño de página. */
  @Input() showPageSizeSelector = false;
  /** Opciones del selector de tamaño. */
  @Input() pageSizeOptions: number[] = [12, 24, 48, 96];

  /** Emite el nuevo número de página (1-indexed). */
  @Output() pageChange = new EventEmitter<number>();
  /** Emite el nuevo tamaño de página. */
  @Output() pageSizeChange = new EventEmitter<number>();

  visiblePageNumbers: number[] = [];
  private readonly WINDOW_SIZE = 5;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPage'] || changes['totalPages']) {
      this.visiblePageNumbers = this.calcVisiblePages();
    }
  }

  onPageChange(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages);
    if (next !== this.currentPage) {
      this.pageChange.emit(next);
    }
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(val) && val > 0) {
      this.pageSizeChange.emit(val);
    }
  }

  private calcVisiblePages(): number[] {
    if (this.totalPages <= this.WINDOW_SIZE) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(this.WINDOW_SIZE / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = start + this.WINDOW_SIZE - 1;
    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - this.WINDOW_SIZE + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}
