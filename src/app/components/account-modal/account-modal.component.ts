import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { CartStateService } from '../../state/cart-state.service';
import { SiteStateService } from '../../state/site-state.service';
import { OrderRecord } from '../../models/auth.model';

@Component({
  selector: 'app-account-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-modal.component.html',
  styleUrls: ['./account-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountModalComponent {
  private readonly siteState = inject(SiteStateService);
  private readonly auth = inject(AuthService);
  private readonly cartState = inject(CartStateService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly orders = this.auth.orders;
  protected readonly hasOrders = computed(() => this.orders().length > 0);

  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.maxLength(40)]],
    address: ['', [Validators.maxLength(160)]],
    city: ['', [Validators.maxLength(120)]],
    country: ['', [Validators.maxLength(120)]]
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (!user) {
        this.form.reset({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          country: ''
        }, { emitEvent: false });
        return;
      }

      if (this.saving()) {
        return;
      }

      this.form.reset({
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        address: user.address ?? '',
        city: user.city ?? '',
        country: user.country ?? ''
      }, { emitEvent: false });
    });
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.close();
  }

  protected overlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected close(): void {
    this.siteState.closeAccountModal();
  }

  protected save(): void {
    this.message.set(null);
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Double-check the highlighted fields.');
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);

    const result = this.auth.updateProfile({
      name: value.name.trim(),
      email: value.email.trim().toLowerCase(),
      phone: value.phone?.trim() || undefined,
      address: value.address?.trim() || undefined,
      city: value.city?.trim() || undefined,
      country: value.country?.trim() || undefined
    });

    this.saving.set(false);

    if (!result.success) {
      this.error.set(result.message ?? 'Could not update your profile.');
      return;
    }

    this.message.set('Profile updated successfully.');
  }

  protected reorder(order: OrderRecord): void {
    let added = 0;

    order.items.forEach((item) => {
      const product = this.siteState.findProductBySlug(item.slug);
      if (!product) {
        return;
      }

      this.cartState.addToCart(product, item.quantity, item.variant);
      added += 1;
    });

    this.message.set(added ? 'Items added to your cart.' : 'Those products are no longer available.');
  }

  protected trackOrder(_: number, order: OrderRecord): string {
    return order.id;
  }
}

