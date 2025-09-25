import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { CartItem, DetailedCartItem } from '../models/cart.model';
import { ProductDetails, ProductVariantSelection } from '../models/site.model';
import { SiteStateService } from './site-state.service';

const CART_STORAGE_KEY = 'ecommerce-dynamic-cart';
const FAVORITES_STORAGE_KEY = 'ecommerce-dynamic-favorites';

@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly siteState = inject(SiteStateService);

  private readonly cartSignal = signal<CartItem[]>(this.loadCart());
  private readonly favoritesSignal = signal<string[]>(this.loadFavorites());

  readonly cartItems: Signal<CartItem[]> = computed(() => this.cartSignal());
  readonly favorites = computed(() => this.favoritesSignal());
  readonly favoriteCount = computed(() => this.favoritesSignal().length);
  readonly totalQuantity = computed(() =>
    this.cartSignal().reduce((count, item) => count + item.quantity, 0)
  );

  readonly detailedCartItems = computed<DetailedCartItem[]>(() => {
    const site = this.siteState.site();
    if (!site) {
      return [];
    }

    return this.cartSignal()
      .map((item) => {
        const product = site.products.find((candidate) => candidate.slug === item.slug);
        if (!product) {
          return null;
        }

        const unitPrice = item.unitPrice ?? product.price;
        const details: DetailedCartItem = {
          product,
          quantity: item.quantity,
          unitPrice,
          lineTotal: item.quantity * unitPrice,
          variant: item.variant
        };

        return details;
      })
      .filter((value): value is DetailedCartItem => value !== null);
  });

  readonly subtotal = computed(() =>
    this.detailedCartItems().reduce((total, item) => total + item.lineTotal, 0)
  );

  readonly favoriteProducts = computed<ProductDetails[]>(() => {
    const site = this.siteState.site();
    if (!site) {
      return [];
    }

    return this.favoritesSignal()
      .map((slug) => site.products.find((product) => product.slug === slug))
      .filter((product): product is ProductDetails => product !== undefined);
  });

  constructor() {
    effect(() => {
      this.persistCart(this.cartSignal());
    });

    effect(() => {
      this.persistFavorites(this.favoritesSignal());
    });

    effect(() => {
      const site = this.siteState.site();
      if (!site) {
        this.cartSignal.set([]);
        this.favoritesSignal.set([]);
        return;
      }

      const validSlugs = new Set(site.products.map((product) => product.slug));
      this.cartSignal.update((items) => items.filter((item) => validSlugs.has(item.slug)));
      this.favoritesSignal.update((items) => items.filter((slug) => validSlugs.has(slug)));
    });
  }

  addToCart(product: ProductDetails, quantity = 1, variant?: ProductVariantSelection): void {
    if (quantity <= 0) {
      return;
    }

    const slug = product.slug;
    const unitPrice = product.price;

    this.cartSignal.update((items) => {
      const index = this.findCartIndex(items, slug, variant);
      if (index === -1) {
        return [
          ...items,
          {
            slug,
            quantity,
            unitPrice,
            variant: this.hasVariantValue(variant) ? variant : undefined
          }
        ];
      }

      const updated = [...items];
      updated[index] = {
        ...updated[index],
        quantity: updated[index].quantity + quantity
      };
      return updated;
    });
  }

  updateQuantity(slug: string, quantity: number, variant?: ProductVariantSelection): void {
    if (quantity <= 0) {
      this.removeFromCart(slug, variant);
      return;
    }

    this.cartSignal.update((items) =>
      items.map((item) =>
        item.slug === slug && this.sameVariant(item.variant, variant)
          ? { ...item, quantity }
          : item
      )
    );
  }

  removeFromCart(slug: string, variant?: ProductVariantSelection): void {
    this.cartSignal.update((items) =>
      items.filter((item) => !(item.slug === slug && this.sameVariant(item.variant, variant)))
    );
  }

  clearCart(): void {
    this.cartSignal.set([]);
  }

  toggleFavorite(product: ProductDetails): void {
    const slug = product.slug;
    this.favoritesSignal.update((items) =>
      items.includes(slug)
        ? items.filter((value) => value !== slug)
        : [...items, slug]
    );
  }

  removeFavorite(slug: string): void {
    this.favoritesSignal.update((items) => items.filter((item) => item !== slug));
  }

  isFavorite(slug: string): boolean {
    return this.favoritesSignal().includes(slug);
  }

  isInCart(slug: string, variant?: ProductVariantSelection): boolean {
    return this.cartSignal().some((item) => item.slug === slug && this.sameVariant(item.variant, variant));
  }

  private loadCart(): CartItem[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch (error) {
      console.error('Failed to load cart', error);
      return [];
    }
  }

  private loadFavorites(): string[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch (error) {
      console.error('Failed to load favorites', error);
      return [];
    }
  }

  private persistCart(items: CartItem[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }

  private persistFavorites(items: string[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  }

  private findCartIndex(items: CartItem[], slug: string, variant?: ProductVariantSelection): number {
    return items.findIndex((item) => item.slug === slug && this.sameVariant(item.variant, variant));
  }

  private sameVariant(a?: ProductVariantSelection, b?: ProductVariantSelection): boolean {
    const sizeMatch = (a?.size ?? '') === (b?.size ?? '');
    const colorMatch = (a?.color ?? '') === (b?.color ?? '');
    return sizeMatch && colorMatch;
  }

  private hasVariantValue(variant?: ProductVariantSelection): boolean {
    return !!variant && ((variant.size ?? '') !== '' || (variant.color ?? '') !== '');
  }
}
