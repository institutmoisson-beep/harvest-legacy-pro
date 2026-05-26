export interface DocBuyer {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  id_number?: string | null;
}

export interface DocPack {
  name: string;
  price: number;
  benefit_amount?: number;
  description?: string | null;
}

export interface DocPurchase {
  id: string;
  tracking_code?: string | null;
  pickup_code?: string | null;
  delivery_mode?: string | null;
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_phone?: string | null;
  delivery_notes?: string | null;
  created_at?: string | null;
}

export interface DocRelay {
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string | null;
}
