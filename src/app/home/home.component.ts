import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ContactSectionComponent } from '../components/contact-section/contact-section.component';
import { ProductsGridComponent } from '../components/products-grid/products-grid.component';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';
import { SiteHeroComponent } from '../components/site-hero/site-hero.component';
import { SiteNavbarComponent } from '../components/site-navbar/site-navbar.component';
import { CartStateService } from '../state/cart-state.service';
import { SiteStateService } from '../state/site-state.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SiteNavbarComponent,
    SiteHeroComponent,
    ProductsGridComponent,
    ContactSectionComponent,
    SiteFooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly siteState = inject(SiteStateService);
  private readonly auth = inject(AuthService);
  private readonly cartState = inject(CartStateService);
  private readonly router = inject(Router);

  protected readonly site = this.siteState.site;
  protected readonly hasSite = this.siteState.hasSite;
  protected readonly filteredProducts = this.siteState.filteredProducts;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly cartCount = this.cartState.totalQuantity;

  protected async startWizard(): Promise<void> {
    if (this.siteState.openWizard()) {
      return;
    }

    await this.router.navigate(['/auth/login'], {
      queryParams: { redirect: this.router.url }
    });
  }
}
