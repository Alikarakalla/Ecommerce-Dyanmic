import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { GeneratedSite, ProductDetails } from '../models/site.model';

const SITE_STORAGE_KEY = 'ecommerce-dynamic-site';

export interface CategoryGroup {
  category: string;
  subCategories: string[];
}

@Injectable({ providedIn: 'root' })
export class SiteStateService {
  private readonly auth = inject(AuthService);

  private readonly siteSignal = signal<GeneratedSite | null>(this.loadSite());
  private readonly wizardVisibleSignal = signal(false);
  private readonly accountModalOpenSignal = signal(false);
  private readonly profileMenuOpenSignal = signal(false);
  private readonly categoryFilterSignal = signal<{ category: string; subCategory?: string } | null>(null);

  readonly site = computed(() => this.siteSignal());
  readonly wizardOpen = computed(() => this.wizardVisibleSignal());
  readonly hasSite = computed(() => this.siteSignal() !== null);
  readonly products = computed(() => this.siteSignal()?.products ?? []);
  readonly filteredProducts = computed(() => {
    const products = this.siteSignal()?.products ?? [];
    const filter = this.categoryFilterSignal();

    if (!filter || filter.category.toLowerCase() === 'all products') {
      return products;
    }

    const category = filter.category.trim().toLowerCase();
    const subCategory = filter.subCategory?.trim().toLowerCase();

    return products.filter((product) => {
      const productCategory = product.category?.trim().toLowerCase() ?? '';
      const productSub = product.subCategory?.trim().toLowerCase() ?? '';

      if (category && category !== 'all products' && productCategory !== category) {
        return false;
      }

      if (subCategory && productSub !== subCategory) {
        return false;
      }

      return true;
    });
  });
  readonly currentYear = new Date().getFullYear();
  readonly canCustomize = computed(() => this.auth.isAdmin());
  readonly accountModalOpen = computed(() => this.accountModalOpenSignal());
  readonly profileMenuOpen = computed(() => this.profileMenuOpenSignal());
  readonly activeCategory = computed(() => this.categoryFilterSignal());
  readonly categories = computed<CategoryGroup[]>(() => {
    const site = this.siteSignal();
    if (!site) {
      return [];
    }

    const map = new Map<string, Set<string>>();
    site.products.forEach((product) => {
      const category = product.category?.trim() || 'All Products';
      const subCategory = product.subCategory?.trim();

      if (!map.has(category)) {
        map.set(category, new Set<string>());
      }

      if (subCategory) {
        map.get(category)!.add(subCategory);
      }
    });

    return Array.from(map.entries()).map(([category, subs]) => ({
      category,
      subCategories: Array.from(subs).sort((a, b) => a.localeCompare(b))
    }));
  });

  constructor() {
    effect(() => {
      if (!this.auth.isAdmin()) {
        this.wizardVisibleSignal.set(false);
      }
    });

    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.accountModalOpenSignal.set(false);
        this.profileMenuOpenSignal.set(false);
      }
    });

    effect(() => {
      this.persistSite(this.siteSignal());
    });
  }

  setSite(site: GeneratedSite): void {
    this.siteSignal.set(site);
  }

  clearSite(): void {
    this.siteSignal.set(null);
  }

  openWizard(): boolean {
    if (!this.auth.isAdmin()) {
      return false;
    }

    this.wizardVisibleSignal.set(true);
    return true;
  }

  closeWizard(): void {
    this.wizardVisibleSignal.set(false);
  }

  openAccountModal(): boolean {
    if (!this.auth.isAuthenticated()) {
      return false;
    }

    this.accountModalOpenSignal.set(true);
    this.profileMenuOpenSignal.set(false);
    return true;
  }

  closeAccountModal(): void {
    this.accountModalOpenSignal.set(false);
  }

  toggleProfileMenu(force?: boolean): void {
    if (!this.auth.isAuthenticated()) {
      this.profileMenuOpenSignal.set(false);
      return;
    }

    if (typeof force === 'boolean') {
      this.profileMenuOpenSignal.set(force);
      return;
    }

    this.profileMenuOpenSignal.update((value) => !value);
  }

  closeProfileMenu(): void {
    this.profileMenuOpenSignal.set(false);
  }

  setCategoryFilter(category: string, subCategory?: string): void {
    if (!category || category.toLowerCase() === 'all products') {
      this.categoryFilterSignal.set(null);
      return;
    }

    this.categoryFilterSignal.set({ category, subCategory });
  }

  clearCategoryFilter(): void {
    this.categoryFilterSignal.set(null);
  }

  findProductBySlug(slug: string): ProductDetails | null {
    const site = this.siteSignal();
    if (!site) {
      return null;
    }

    return site.products.find((product) => product.slug === slug) ?? null;
  }

  private loadSite(): GeneratedSite | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(SITE_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as GeneratedSite;
      if (!parsed.themes) {
        parsed.themes = {
          navbar: 'classic',
          hero: 'spotlight',
          productCard: 'elevated'
        };
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse stored site', error);
      return null;
    }
  }

  private persistSite(site: GeneratedSite | null): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (!site) {
      localStorage.removeItem(SITE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify(site));
  }
}


