import { PaymentMethod } from './cart.model';
import { ProductVariantSelection } from './site.model';

export type UserRole = 'admin' | 'member';

export interface OrderItemSnapshot {
  slug: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variant?: ProductVariantSelection;
}

export interface OrderRecord {
  id: string;
  placedAt: string;
  total: number;
  paymentMethod: PaymentMethod;
  items: OrderItemSnapshot[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  orders: OrderRecord[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  adminCode?: string;
}

export interface ProfileUpdatePayload {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}
