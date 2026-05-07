export interface Card {
  card_set_id: string; // e.g. OP01-001
  card_name: string;
  card_type: string;
  attribute?: string;
  card_power?: string;
  counter_amount?: string;
  card_color: string;
  card_text?: string;
  card_cost?: string;
  life?: string;
  card_image: string;
  set_name?: string;
  set_id?: string;
  sub_types?: string;
}

export interface CardFilterParams {
  name?: string;
  color?: string;
  type?: string;
  cost?: string;
  power?: string;
  set?: string;
  attribute?: string;
}
