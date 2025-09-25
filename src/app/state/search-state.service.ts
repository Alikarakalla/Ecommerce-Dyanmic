import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ProductDetails } from '../models/site.model';
import { SiteStateService } from './site-state.service';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  private readonly siteState = inject(SiteStateService);

  private readonly querySignal = signal('');
  private readonly openSignal = signal(false);

  readonly query = computed(() => this.querySignal());
  readonly open = computed(() => this.openSignal());
  readonly results = computed<ProductDetails[]>(() => {
    const query = this.querySignal().trim().toLowerCase();
    const site = this.siteState.site();

    if (!query || !site) {
      return [];
    }

    return site.products.filter((product) => {
      const haystack = [
        product.name,
        product.description,
        product.category,
        product.subCategory,
        product.highlight
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  constructor() {
    effect(() => {
      if (!this.openSignal() && this.querySignal()) {
        this.querySignal.set('');
      }
    });
  }

  setQuery(query: string): void {
    this.querySignal.set(query);
    if (query && !this.openSignal()) {
      this.openSignal.set(true);
    }
  }

  openPanel(): void {
    this.openSignal.set(true);
  }

  closePanel(): void {
    this.openSignal.set(false);
  }

  clear(): void {
    this.querySignal.set('');
  }
}
