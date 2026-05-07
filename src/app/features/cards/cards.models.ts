export interface ExternalCardDto {
  id: string;
  name: string;
  type?: string;
  attribute?: string;
  power?: string;
  counter?: string;
  color?: string;
  text?: string;
  cost?: string;
  life?: string;
  imageUrl?: string;
  setName?: string;
  setId?: string;
  cardSetId?: string;
  subTypes?: string[];
  rarity?: string;
  inventoryPrice?: number;
  marketPrice?: number;
  counterAmount?: number;
  dateScraped?: string;
  cardImageId?: string;
}

export interface CardFilters {
  nameOrId?: string; // search by name or card_set_id
  text?: string; // card_text
  set?: string; // set id
  subTypes?: string; // archetype
  types?: string[]; // card_type
  rarity?: string[]; // rarity
  attributes?: string[]; // attribute
  keywords?: string[]; // keywords inside text
  counterFilters?: string[]; // hasCounter, 1000, 2000
  colors?: string[]; // card_color
  hasTrigger?: boolean; // separate trigger flag
  costs?: number[]; // card_cost numbers
  powerRange?: { min: number; max: number };
}