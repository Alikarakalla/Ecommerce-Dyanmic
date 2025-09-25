import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';
import { SiteNavbarComponent } from '../components/site-navbar/site-navbar.component';
import { ProductDetails } from '../models/site.model';
import { CartStateService } from '../state/cart-state.service';
import { SiteStateService } from '../state/site-state.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteNavbarComponent, SiteFooterComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesComponent {
  private readonly cartState = inject(CartStateService);
  private readonly siteState = inject(SiteStateService);

  protected readonly site = this.siteState.site;
  protected readonly favorites = this.cartState.favoriteProducts;
  protected readonly hasFavorites = computed(() => this.favorites().length > 0);

  protected addToCart(product: ProductDetails): void {
    this.cartState.addToCart(product);
    this.cartState.removeFavorite(product.slug);
  }

  protected removeFavorite(slug: string): void {
    this.cartState.removeFavorite(slug);
  }

  protected trackByProduct(_: number, product: ProductDetails): string {
    return product.slug;
  }
}
