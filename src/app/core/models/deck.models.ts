export interface DeckSummary {
  id: number;
  name: string;
  description?: string;
  leaderCardId: string;
  isPublic: boolean;
  likesCount: number;
  username: string;
  createdAt: string;
  leaderColor?: string;
  avatarUrl?: string;
}

export interface DeckDetail {
  id: number;
  name: string;
  description: string;
  leaderCardId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  userId: number;
  username: string;
  leaderColor?: string;
  avatarUrl?: string;
  cards: { [cardId: string]: number };
}

export interface DeckRequest {
  name: string;
  description?: string;
  leaderCardId: string;
  isPublic: boolean;
  leaderColor?: string;
  cards: { [cardId: string]: number };
}

export interface PageResponse<T> {
  content: T[];
  pageable: any;
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}
