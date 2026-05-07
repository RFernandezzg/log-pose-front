export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  category: 'SLEEVES' | 'PLAYMAT' | 'DECK_BOX' | 'ACCESSORY';
  createdAt: string;
}

export interface CartItem {
  item: ShopItem;
  quantity: number;
}

export interface OrderRequest {
  items: { [itemId: string]: number };
}

export interface OrderResponse {
  id: number;
  userId: number;
  total: number;
  status: string;
  createdAt: string;
  items: { [itemName: string]: number };
}
