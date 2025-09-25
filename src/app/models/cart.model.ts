import { ProductDetails, ProductVariantSelection } from './site.model';

export interface CartItem {
  slug: string;
  quantity: number;
  variant?: ProductVariantSelection;
  unitPrice: number;
}

export interface DetailedCartItem {
  product: ProductDetails;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variant?: ProductVariantSelection;
}

export type PaymentMethod = 'card' | 'paypal' | 'cod';
