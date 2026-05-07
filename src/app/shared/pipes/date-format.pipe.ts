import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe standalone que formatea fechas en español.
 * Reemplaza el método `formatDate()` duplicado en:
 * - DecksComponent
 * - DecksExploreComponent
 * - DeckViewComponent
 *
 * Uso en template: {{ deck.createdAt | dateFormat }}
 */
@Pipe({
  name: 'dateFormat',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
