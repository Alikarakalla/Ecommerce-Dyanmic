import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { GeneratedSite, ProductDetails } from '../../models/site.model';
import { CartStateService } from '../../state/cart-state.service';
import { SearchStateService } from '../../state/search-state.service';
import { SiteStateService, CategoryGroup } from '../../state/site-state.service';

@Component({
  selector: 'app-site-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './site-navbar.component.html',
  styleUrls: ['./site-navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteNavbarComponent {
  @Input({ required: true }) site!: GeneratedSite;

  private readonly siteState = inject(SiteStateService);
  private readonly auth = inject(AuthService);
  private readonly cartState = inject(CartStateService);
  private readonly searchState = inject(SearchStateService);
  private readonly router = inject(Router);

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly currentUser = this.auth.currentUser;
  protected readonly cartCount = this.cartState.totalQuantity;
  protected readonly favoriteCount = this.cartState.favoriteCount;
  protected readonly categories = this.siteState.categories;
  protected readonly profileMenuOpen = this.siteState.profileMenuOpen;
  protected readonly searchQuery = this.searchState.query;
  protected readonly searchOpen = this.searchState.open;
  protected readonly searchResults = this.searchState.results;
  protected readonly activeCategory = this.siteState.activeCategory;

  protected get profileInitial(): string {
    const name = this.currentUser()?.name ?? this.site.storeName;
    return name.charAt(0).toUpperCase();
  }

  @HostListener('window:click', ['$event'])
  handleWindowClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const insideProfile = target?.closest('.site-nav__profile') || target?.closest('.site-nav__profile-menu');
    const insideSearch = target?.closest('.site-nav__search') || target?.closest('.site-nav__search-panel');

    if (!insideProfile) {
      this.siteState.closeProfileMenu();
    }

    if (!insideSearch) {
      this.searchState.closePanel();
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.siteState.closeProfileMenu();
    this.searchState.closePanel();
  }

  protected async customize(): Promise<void> {
    if (this.siteState.openWizard()) {
      return;
    }

    await this.redirectToLogin();
  }

  protected async logout(): Promise<void> {
    this.auth.logout();
    this.siteState.closeProfileMenu();
    await this.router.navigateByUrl('/');
  }

  protected async redirectToLogin(): Promise<void> {
    await this.router.navigate(['/auth/login'], {
      queryParams: { redirect: this.router.url }
    });
  }

  protected openAccountModal(): void {
    if (this.siteState.openAccountModal()) {
      this.siteState.closeProfileMenu();
    } else {
      void this.redirectToLogin();
    }
  }

  protected goToFavorites(): void {
    this.siteState.closeProfileMenu();
    void this.router.navigate(['/favorites']);
  }

  protected toggleProfileMenu(): void {
    this.siteState.toggleProfileMenu();
  }

  protected onSearchFocus(): void {
    this.searchState.openPanel();
  }

  protected onSearchInput(value: string): void {
    this.searchState.setQuery(value);
  }

  protected clearSearch(): void {
    this.searchState.clear();
    this.searchState.closePanel();
  }

  protected async goToProduct(slug: string): Promise<void> {
    this.clearSearch();
    await this.router.navigate(['/product', slug]);
  }

  protected quickAddToCart(product: ProductDetails): void {
    this.cartState.addToCart(product);
    this.clearSearch();
  }

  protected selectCategory(category: string, subCategory?: string): void {
    this.siteState.setCategoryFilter(category, subCategory);
    this.searchState.closePanel();
    void this.router.navigate(['/']);
  }

  protected trackByCategory(_: number, item: CategoryGroup): string {
    return item.category;
  }

  protected trackBySubCategory(_: number, sub: string): string {
    return sub;
  }
}

