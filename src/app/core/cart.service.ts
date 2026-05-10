import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem, ShopItem } from './models/shop.models';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<CartItem[]>(this.loadCartFromStorage());
  
  cartItems$: Observable<CartItem[]> = this.cartItems.asObservable();

  constructor() {}

  private loadCartFromStorage(): CartItem[] {
    const saved = localStorage.getItem('logpose_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  private saveCartToStorage(items: CartItem[]): void {
    localStorage.setItem('logpose_cart', JSON.stringify(items));
    this.cartItems.next(items);
  }

  getCart(): CartItem[] {
    return this.cartItems.getValue();
  }

  addToCart(item: ShopItem, quantity: number = 1): void {
    const currentItems = this.getCart();
    const existing = currentItems.find(c => c.item.id === item.id);
    
    if (existing) {
      if (existing.quantity + quantity <= item.stock) {
        existing.quantity += quantity;
      } else {
        existing.quantity = item.stock;
      }
    } else {
      currentItems.push({ item, quantity: Math.min(quantity, item.stock) });
    }
    
    this.saveCartToStorage(currentItems);
  }

  updateQuantity(itemId: number, quantity: number): void {
    const currentItems = this.getCart();
    const existing = currentItems.find(c => c.item.id === itemId);
    
    if (existing) {
      if (quantity <= 0) {
        this.removeFromCart(itemId);
        return;
      }
      existing.quantity = Math.min(quantity, existing.item.stock);
      this.saveCartToStorage(currentItems);
    }
  }

  removeFromCart(itemId: number): void {
    const currentItems = this.getCart().filter(c => c.item.id !== itemId);
    this.saveCartToStorage(currentItems);
  }

  clearCart(): void {
    this.saveCartToStorage([]);
  }

  getTotalPrice(): number {
    return this.getCart().reduce((total, cartItem) => total + (cartItem.item.price * cartItem.quantity), 0);
  }

  getTotalItemsCount(): number {
    return this.getCart().reduce((total, cartItem) => total + cartItem.quantity, 0);
  }
}
