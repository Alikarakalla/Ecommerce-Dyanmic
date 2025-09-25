import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';
import { SiteNavbarComponent } from '../components/site-navbar/site-navbar.component';
import { AuthService } from '../auth/auth.service';
import { PaymentMethod } from '../models/cart.model';
import { OrderRecord } from '../models/auth.model';
import { ProductDetails, ProductVariantSelection } from '../models/site.model';
import { CartStateService } from '../state/cart-state.service';
import { SiteStateService } from '../state/site-state.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SiteNavbarComponent, SiteFooterComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cartState = inject(CartStateService);
  private readonly siteState = inject(SiteStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly items = this.cartState.detailedCartItems;
  protected readonly favorites: Signal<ProductDetails[]> = this.cartState.favoriteProducts;
  protected readonly subtotal = this.cartState.subtotal;
  protected readonly cartCount = this.cartState.totalQuantity;
  protected readonly site = this.siteState.site;

  protected readonly shipping = computed(() => (this.cartCount() > 0 ? 8 : 0));
  protected readonly total = computed(() => this.subtotal() + this.shipping());

  protected readonly message = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly freeShippingThreshold = 150;
  protected readonly accentColor = computed(() => this.site()?.accentColor ?? '#2563eb');
  protected readonly qualifiesForFreeShipping = computed(() => this.subtotal() >= this.freeShippingThreshold);
  protected readonly shippingProgress = computed(() => {
    if (this.freeShippingThreshold <= 0) {
      return 100;
    }
    const subtotal = this.subtotal();
    if (subtotal <= 0) {
      return 0;
    }
    return Math.min(Math.round((subtotal / this.freeShippingThreshold) * 100), 100);
  });
  protected readonly shippingDelta = computed(() => {
    const remaining = this.freeShippingThreshold - this.subtotal();
    return remaining > 0 ? remaining : 0;
  });

  protected readonly paymentOptions: Array<{ value: PaymentMethod; label: string; description: string }> = [
    { value: 'card', label: 'Credit / Debit Card', description: 'Secure payment with Visa, Mastercard, Amex.' },
    { value: 'paypal', label: 'PayPal', description: 'Redirect to PayPal to complete your purchase.' },
    { value: 'cod', label: 'Cash on Delivery', description: 'Pay when your order arrives.' }
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required, Validators.maxLength(160)]],
    city: ['', [Validators.required, Validators.maxLength(120)]],
    country: ['United States', [Validators.required, Validators.maxLength(120)]],
    notes: [''],
    paymentMethod: this.fb.nonNullable.control<PaymentMethod>('card')
  });

  protected updateQuantity(slug: string, quantity: number, variant?: ProductVariantSelection): void {
    this.cartState.updateQuantity(slug, quantity, variant);
  }

  protected increment(slug: string, current: number, variant?: ProductVariantSelection): void {
    this.updateQuantity(slug, current + 1, variant);
  }

  protected decrement(slug: string, current: number, variant?: ProductVariantSelection): void {
    this.updateQuantity(slug, current - 1, variant);
  }

  protected remove(slug: string, variant?: ProductVariantSelection): void {
    this.cartState.removeFromCart(slug, variant);
  }

  protected toggleFavorite(slug: string): void {
    const product = this.favorites().find((item: ProductDetails) => item.slug === slug);
    if (!product) {
      return;
    }

    this.cartState.toggleFavorite(product);
  }

  protected moveFavoriteToCart(slug: string): void {
    const product = this.favorites().find((item: ProductDetails) => item.slug === slug);
    if (!product) {
      return;
    }

    this.cartState.addToCart(product);
    this.cartState.removeFavorite(slug);
  }

  protected clearCart(): void {
    this.cartState.clearCart();
  }

  protected async checkout(): Promise<void> {
    this.submitting.set(true);
    this.message.set(null);

    if (this.cartCount() === 0) {
      this.message.set('Add items to your cart before checking out.');
      this.submitting.set(false);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitting.set(false);
      return;
    }

    const formValue = this.form.getRawValue();
    const items = this.items();
    const orderId = this.createOrderId();
    const orderTotal = this.total();

    if (this.auth.isAuthenticated()) {
      const order: OrderRecord = {
        id: orderId,
        placedAt: new Date().toISOString(),
        total: orderTotal,
        paymentMethod: formValue.paymentMethod,
        items: items.map((entry) => ({
          slug: entry.product.slug,
          name: entry.product.name,
          quantity: entry.quantity,
          unitPrice: entry.unitPrice,
          variant: entry.variant
        }))
      };

      this.auth.recordOrder(order);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    this.cartState.clearCart();
    this.message.set(
      this.auth.isAuthenticated()
        ? `Thanks ${formValue.name}! Order #${orderId.slice(-6).toUpperCase()} is confirmed.`
        : `Thanks ${formValue.name}! Your ${formValue.paymentMethod.toUpperCase()} order is confirmed. Sign in to keep track of your history.`
    );
    this.form.reset({
      name: '',
      email: '',
      address: '',
      city: '',
      country: 'United States',
      notes: '',
      paymentMethod: 'card'
    });
    this.submitting.set(false);
  }

  protected continueShopping(): void {
    void this.router.navigateByUrl('/');
  }

  private createOrderId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `order-${Math.random().toString(36).slice(2, 10)}`;
  }
}
