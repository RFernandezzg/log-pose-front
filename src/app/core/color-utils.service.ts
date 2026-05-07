import { Injectable } from '@angular/core';

/** Colores canónicos del juego One Piece TCG. */
export type OPTCGColor = 'red' | 'blue' | 'green' | 'purple' | 'black' | 'yellow';

/**
 * Servicio centralizado para toda la lógica de colores del juego.
 * Reemplaza los métodos `getLeaderColor`, `getBorderColorClass` y `getHeaderGradient`
 * que estaban duplicados en DecksComponent, DecksExploreComponent,
 * DeckViewComponent y DeckBuilderComponent.
 */
@Injectable({ providedIn: 'root' })
export class ColorUtilsService {

  /**
   * Normaliza cualquier string de color (incluidos multicolor como "Red/Blue")
   * al color canónico OPTCG dominante.
   */
  getColorKey(color: string | null | undefined): OPTCGColor {
    if (!color) return 'yellow';
    const col = color.toLowerCase();
    if (col.includes('red')) return 'red';
    if (col.includes('blue')) return 'blue';
    if (col.includes('green')) return 'green';
    if (col.includes('purple') || col.includes('violet')) return 'purple';
    if (col.includes('black')) return 'black';
    return 'yellow';
  }

  /**
   * Devuelve la clase Tailwind de borde (sin hover) para usar en detalles de carta.
   * Equivale al antiguo `getBorderColorClass` de DeckViewComponent/DeckBuilderComponent.
   */
  getBorderClass(color: string | null | undefined): string {
    const map: Record<OPTCGColor, string> = {
      red: 'border-red-500',
      blue: 'border-blue-500',
      green: 'border-green-500',
      purple: 'border-purple-500',
      black: 'border-gray-900',
      yellow: 'border-yellow-500',
    };
    return map[this.getColorKey(color)] ?? 'border-gray-500';
  }

  /**
   * Devuelve clases Tailwind de hover con borde + sombra para tarjetas de deck.
   * Equivale al antiguo `getBorderColorClass` de DecksComponent/DecksExploreComponent.
   */
  getHoverBorderClass(color: string | null | undefined): string {
    const map: Record<OPTCGColor, string> = {
      red: 'hover:border-red-500 hover:shadow-red-500/20',
      blue: 'hover:border-blue-500 hover:shadow-blue-500/20',
      green: 'hover:border-green-500 hover:shadow-green-500/20',
      purple: 'hover:border-purple-500 hover:shadow-purple-500/20',
      black: 'hover:border-slate-400 hover:shadow-slate-400/20',
      yellow: 'hover:border-yellow-500 hover:shadow-yellow-500/20',
    };
    return map[this.getColorKey(color)] ?? map['yellow'];
  }

  /**
   * Devuelve el string CSS de gradiente para el header de DeckViewComponent.
   */
  getHeaderGradient(color: string | null | undefined): string {
    const map: Record<OPTCGColor, string> = {
      red: 'linear-gradient(135deg, #991b1b 0%, #dc2626 40%, #f97316 100%)',
      blue: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 40%, #06b6d4 100%)',
      green: 'linear-gradient(135deg, #064e3b 0%, #059669 40%, #34d399 100%)',
      purple: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 40%, #c084fc 100%)',
      black: 'linear-gradient(135deg, #0f172a 0%, #334155 40%, #64748b 100%)',
      yellow: 'linear-gradient(135deg, #92400e 0%, #d97706 40%, #fbbf24 100%)',
    };
    return map[this.getColorKey(color)] ?? map['yellow'];
  }

  /**
   * Devuelve el gradiente como objeto de estilo para usar con `[ngStyle]`.
   */
  getHeaderGradientStyle(color: string | null | undefined): { [key: string]: string } {
    return { background: this.getHeaderGradient(color) };
  }
}
