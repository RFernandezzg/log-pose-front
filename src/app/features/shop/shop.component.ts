import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShopService } from '../../core/shop.service';
import { CartService } from '../../core/cart.service';
import { AuthSessionService } from '../../core/auth-session.service';
import { ShopItem, CartItem, OrderRequest } from '../../core/models/shop.models';
import { Subject, takeUntil } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './shop.component.html'
})
export class ShopComponent implements OnInit, OnDestroy {
  items: ShopItem[] = [];
  filteredItems: ShopItem[] = [];
  cartItems: CartItem[] = [];
  
  isLoading = true;
  error: string | null = null;
  
  // Filters
  categories: string[] = ['ALL', 'SLEEVES', 'PLAYMAT', 'DECK_BOX', 'ACCESSORY'];
  activeCategory: string = 'ALL';
  searchQuery: string = '';

  // Cart UI
  isCartOpen = false;
  isCheckingOut = false;
  checkoutSuccess = false;

  private destroy$ = new Subject<void>();

  constructor(
    private shopService: ShopService,
    public cartService: CartService,
    private authSession: AuthSessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadItems();
    this.cartService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadItems(): void {
    this.isLoading = true;
    this.shopService.getShopItems().subscribe({
      next: (data) => {
        this.items = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading shop items', err);
        this.error = 'No se pudieron cargar los artículos de la tienda.';
        this.isLoading = false;
      }
    });
  }

  setCategory(cat: string): void {
    this.activeCategory = cat;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredItems = this.items.filter(item => {
      const matchCategory = this.activeCategory === 'ALL' || item.category === this.activeCategory;
      const matchSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }

  addToCart(item: ShopItem): void {
    this.cartService.addToCart(item, 1);
    this.isCartOpen = true;
  }

  updateQuantity(itemId: number, newQty: number): void {
    this.cartService.updateQuantity(itemId, newQty);
  }

  removeFromCart(itemId: number): void {
    this.cartService.removeFromCart(itemId);
  }

  toggleCart(): void {
    this.isCartOpen = !this.isCartOpen;
  }

  getCategoryLabel(cat: string): string {
    const keys: Record<string, string> = {
      'ALL': 'SHOP.CAT_ALL',
      'SLEEVES': 'SHOP.CAT_SLEEVES',
      'PLAYMAT': 'SHOP.CAT_PLAYMAT',
      'DECK_BOX': 'SHOP.CAT_DECK_BOX',
      'ACCESSORY': 'SHOP.CAT_ACCESSORY'
    };
    return keys[cat] || cat;
  }

  checkout(): void {
    if (this.cartItems.length === 0) return;

    if (!this.authSession.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/shop' } });
      return;
    }

    this.isCheckingOut = true;
    this.error = null;

    const request: OrderRequest = {
      items: {}
    };

    this.cartItems.forEach(cartItem => {
      request.items[cartItem.item.id] = cartItem.quantity;
    });

    this.shopService.createOrder(request).subscribe({
      next: (res) => {
        this.isCheckingOut = false;
        this.checkoutSuccess = true;
        this.cartService.clearCart();
        this.loadItems(); // Refresh stock
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          this.checkoutSuccess = false;
          this.isCartOpen = false;
        }, 5000);
      },
      error: (err) => {
        this.isCheckingOut = false;
        this.error = err.error?.message || 'Error al procesar el pedido. Puede que no haya stock suficiente.';
      }
    });
  }
}
