import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardTheme, ProductDetails } from '../../models/site.model';
import { CartStateService } from '../../state/cart-state.service';
import { SiteStateService } from '../../state/site-state.service';

@Component({
  selector: 'app-products-grid',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './products-grid.component.html',
  styleUrls: ['./products-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsGridComponent {
  private readonly cartState = inject(CartStateService);
  private readonly siteState = inject(SiteStateService);

  @Input({ required: true }) products: ProductDetails[] = [];

  protected readonly activeCategory = this.siteState.activeCategory;

  protected readonly productCardTheme = computed<ProductCardTheme>(() =>
    this.siteState.site()?.themes?.productCard ?? 'elevated'
  );
  protected readonly gridThemeClass = computed(() => `products-grid--${this.productCardTheme()}`);

  protected readonly title = computed(() => {
    const active = this.activeCategory();
    if (!active) {
      return 'Featured products';
    }

    if (active.subCategory) {
      return `${active.category} · ${active.subCategory}`;
    }

    return active.category;
  });
  protected readonly subtitle = computed(() =>
    this.activeCategory()
      ? 'Curated picks based on your selected category.'
      : 'Hand-picked pieces built around your brand story.'
  );

  protected addToCart(product: ProductDetails): void {
    this.cartState.addToCart(product);
  }

  protected toggleFavorite(product: ProductDetails): void {
    this.cartState.toggleFavorite(product);
  }

  protected isFavorite(product: ProductDetails): boolean {
    return this.cartState.isFavorite(product.slug);
  }

  protected isInCart(product: ProductDetails): boolean {
    return this.cartState.isInCart(product.slug);
  }

  protected clearFilter(): void {
    this.siteState.clearCategoryFilter();
  }
}


