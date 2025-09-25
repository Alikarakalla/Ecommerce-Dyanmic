import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';
import { SiteNavbarComponent } from '../components/site-navbar/site-navbar.component';
import { ProductVariantSelection } from '../models/site.model';
import { CartStateService } from '../state/cart-state.service';
import { SiteStateService } from '../state/site-state.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteNavbarComponent, SiteFooterComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent {
  private readonly siteState = inject(SiteStateService);
  private readonly auth = inject(AuthService);
  private readonly cartState = inject(CartStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug'))),
    { initialValue: this.route.snapshot.paramMap.get('slug') }
  );

  protected readonly selectedSize = signal<string | null>(null);
  protected readonly selectedColor = signal<string | null>(null);
  protected readonly activeImage = signal(0);

  protected readonly site = this.siteState.site;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected readonly product = computed(() => {
    const slug = this.slug();
    if (!slug) {
      return null;
    }

    return this.siteState.findProductBySlug(slug);
  });

  protected readonly sizeOptions = computed(() => this.product()?.sizes ?? []);
  protected readonly colorOptions = computed(() => this.product()?.colors ?? []);
  protected readonly mediaGallery = computed(() => {
    const product = this.product();
    if (!product) {
      return [] as string[];
    }

    const gallery = [product.imageUrl, ...(product.gallery ?? [])]
      .map((url) => url?.trim())
      .filter((url): url is string => !!url);

    return Array.from(new Set(gallery));
  });
  protected readonly currentImage = computed(() => {
    const media = this.mediaGallery();
    const index = this.activeImage();
    return media[index] ?? media[0] ?? this.product()?.imageUrl ?? '';
  });
  protected readonly variantSelection = computed<ProductVariantSelection | undefined>(() => {
    const size = this.selectedSize();
    const color = this.selectedColor();

    if (!size && !color) {
      return undefined;
    }

    return {
      ...(size ? { size } : {}),
      ...(color ? { color } : {})
    } satisfies ProductVariantSelection;
  });
  protected readonly canAddToCart = computed(() => {
    const sizes = this.sizeOptions();
    const colors = this.colorOptions();
    const hasSize = sizes.length === 0 || !!this.selectedSize();
    const hasColor = colors.length === 0 || !!this.selectedColor();
    return hasSize && hasColor;
  });
  protected readonly accentColor = computed(() => this.site()?.accentColor ?? '#f97316');

  constructor() {
    effect(() => {
      const sizes = this.sizeOptions();
      const current = this.selectedSize();
      if (sizes.length === 0) {
        this.selectedSize.set(null);
        return;
      }

      if (!current || !sizes.includes(current)) {
        this.selectedSize.set(sizes[0]);
      }
    });

    effect(() => {
      const colors = this.colorOptions();
      const current = this.selectedColor();
      if (colors.length === 0) {
        this.selectedColor.set(null);
        return;
      }

      if (!current || !colors.includes(current)) {
        this.selectedColor.set(colors[0]);
      }
    });

    effect(() => {
      const images = this.mediaGallery();
      const index = this.activeImage();
      if (index >= images.length) {
        this.activeImage.set(0);
      }
    });
  }

  protected selectImage(index: number): void {
    const images = this.mediaGallery();
    if (index < 0 || index >= images.length) {
      return;
    }

    this.activeImage.set(index);
  }

  protected selectSize(size: string): void {
    this.selectedSize.set(size);
  }

  protected isSizeSelected(size: string): boolean {
    return this.selectedSize() === size;
  }

  protected selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  protected isColorSelected(color: string): boolean {
    return this.selectedColor() === color;
  }

  protected trackImage(index: number, image: string): string {
    return `${index}-${image}`;
  }

  protected addToCart(): void {
    const product = this.product();
    if (!product || !this.canAddToCart()) {
      return;
    }

    this.cartState.addToCart(product, 1, this.variantSelection());
  }

  protected toggleFavorite(): void {
    const product = this.product();
    if (!product) {
      return;
    }

    this.cartState.toggleFavorite(product);
  }

  protected isFavorite(): boolean {
    const product = this.product();
    if (!product) {
      return false;
    }

    return this.cartState.isFavorite(product.slug);
  }

  protected isInCart(): boolean {
    const product = this.product();
    if (!product) {
      return false;
    }

    return this.cartState.isInCart(product.slug, this.variantSelection());
  }

  protected async customize(): Promise<void> {
    if (this.siteState.openWizard()) {
      return;
    }

    await this.router.navigate(['/auth/login'], {
      queryParams: { redirect: this.router.url }
    });
  }
}


