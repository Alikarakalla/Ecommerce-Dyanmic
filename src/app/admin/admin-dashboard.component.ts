import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { OrderRecord } from '../models/auth.model';
import { ProductDetails } from '../models/site.model';
import { SiteStateService } from '../state/site-state.service';

type CustomerSnapshot = {
  id: string;
  name: string;
  email: string;
  orders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  lastOrderTimestamp: number;
};

type OrderSnapshot = OrderRecord & {
  customerName: string;
  customerEmail: string;
  itemCount: number;
};

type ProductSnapshot = Pick<
  ProductDetails,
  'name' | 'slug' | 'price' | 'highlight' | 'category' | 'subCategory'
>;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  private readonly siteState = inject(SiteStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly hasSite = this.siteState.hasSite;
  protected readonly site = this.siteState.site;
  protected readonly products = this.siteState.products;
  protected readonly users = this.auth.users;

  protected readonly productSnapshots = computed<ProductSnapshot[]>(() =>
    this.products()
      .map((product) => ({
        name: product.name,
        slug: product.slug,
        price: product.price,
        highlight: product.highlight,
        category: product.category,
        subCategory: product.subCategory
      }))
      .slice(0, 8)
  );

  protected readonly totalProducts = computed(() => this.products().length);

  protected readonly totalCategories = computed(() => {
    const categories = new Set<string>();
    this.products().forEach((product) => {
      const category = product.category?.trim();
      if (category) {
        categories.add(category.toLowerCase());
      }
    });
    return categories.size;
  });

  protected readonly catalogValue = computed(() =>
    this.products().reduce((sum, product) => sum + product.price, 0)
  );

  protected readonly customerSnapshots = computed<CustomerSnapshot[]>(() =>
    this.users()
      .filter((user) => user.role === 'member')
      .map((user) => {
        const orders = [...(user.orders ?? [])];
        const lastOrder = orders
          .slice()
          .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())[0];
        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          orders: orders.length,
          totalSpent,
          lastOrderAt: lastOrder?.placedAt ?? null,
          lastOrderTimestamp: lastOrder ? new Date(lastOrder.placedAt).getTime() : 0
        } satisfies CustomerSnapshot;
      })
      .sort((a, b) => {
        if (b.lastOrderTimestamp === a.lastOrderTimestamp) {
          return b.orders - a.orders;
        }
        return b.lastOrderTimestamp - a.lastOrderTimestamp;
      })
  );

  protected readonly topCustomers = computed(() => this.customerSnapshots().slice(0, 6));
  protected readonly totalCustomers = computed(() => this.customerSnapshots().length);
  protected readonly engagedCustomers = computed(
    () => this.customerSnapshots().filter((customer) => customer.orders > 0).length
  );

  protected readonly orderSnapshots = computed<OrderSnapshot[]>(() => {
    const allOrders = this.users().flatMap((user) =>
      (user.orders ?? []).map<OrderSnapshot>((order) => ({
        ...order,
        customerName: user.name,
        customerEmail: user.email,
        itemCount: order.items.reduce((count, item) => count + item.quantity, 0)
      }))
    );

    return allOrders
      .slice()
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  });

  protected readonly recentOrders = computed(() => this.orderSnapshots().slice(0, 6));
  protected readonly totalOrders = computed(() => this.orderSnapshots().length);
  protected readonly totalUnitsSold = computed(() =>
    this.orderSnapshots().reduce((sum, order) => sum + order.itemCount, 0)
  );
  protected readonly totalRevenue = computed(() =>
    this.orderSnapshots().reduce((sum, order) => sum + order.total, 0)
  );
  protected readonly averageOrderValue = computed(() => {
    const count = this.totalOrders();
    return count ? this.totalRevenue() / count : 0;
  });
  protected readonly lastOrderAt = computed(() => this.orderSnapshots()[0]?.placedAt ?? null);

  protected readonly heroBackground = computed(() => {
    const heroImage = this.site()?.heroImageUrl;
    if (!heroImage) {
      return null;
    }
    return `linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.35)), url("${heroImage}")`;
  });

  protected readonly storePalette = computed(() => {
    const site = this.site();
    return {
      primary: site?.primaryColor ?? '#2563eb',
      accent: site?.accentColor ?? '#f97316'
    };
  });

  protected startWizard(): void {
    if (this.siteState.openWizard()) {
      void this.router.navigateByUrl('/');
    }
  }
}
