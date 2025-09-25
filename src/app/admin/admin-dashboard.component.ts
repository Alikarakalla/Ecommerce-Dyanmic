import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { OrderRecord } from '../models/auth.model';
import { GeneratedSite, ProductDetails } from '../models/site.model';
import { SiteStateService } from '../state/site-state.service';

type ProductFormGroup = FormGroup<{
  name: FormControl<string>;
  description: FormControl<string>;
  price: FormControl<number>;
  imageUrl: FormControl<string>;
  highlight: FormControl<string>;
  slug: FormControl<string>;
  gallery: FormControl<string>;
  sizes: FormControl<string>;
  colors: FormControl<string>;
  category: FormControl<string>;
  subCategory: FormControl<string>;
}>;

type SaveFeedback = 'idle' | 'saved';

interface OrderWithCustomer extends OrderRecord {
  customerName: string;
  customerEmail: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly siteState = inject(SiteStateService);
  private readonly router = inject(Router);

  private skipProductSync = false;
  private restoringProducts = false;
  private productSaveTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly fallbackImage = 'https://dummyimage.com/320x320/f3f4f6/94a3b8.png&text=Preview';

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly hasSite = this.siteState.hasSite;
  protected readonly currentSite = this.siteState.site;
  protected readonly products = this.siteState.products;
  protected readonly users = this.auth.users;

  private readonly ordersWithCustomers = computed<OrderWithCustomer[]>(() => {
    const allUsers = this.users();

    return allUsers
      .flatMap((user) =>
        user.orders.map<OrderWithCustomer>((order) => ({
          ...order,
          customerName: user.name,
          customerEmail: user.email
        }))
      )
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  });

  protected readonly totalProducts = computed(() => this.products().length);
  protected readonly totalUsers = computed(() => this.users().length);
  protected readonly totalOrders = computed(() => this.ordersWithCustomers().length);
  protected readonly totalRevenue = computed(() =>
    this.ordersWithCustomers().reduce((sum, order) => sum + order.total, 0)
  );

  protected readonly recentOrders = computed(() => this.ordersWithCustomers().slice(0, 8));
  protected readonly latestUsers = computed(() => {
    const registered = this.users();
    return registered.slice(Math.max(registered.length - 8, 0)).reverse();
  });

  protected readonly productManagerForm = this.fb.group({
    products: this.fb.array<ProductFormGroup>([])
  });
  protected readonly productsArray = this.productManagerForm.controls.products;
  protected readonly hasUnsavedProductChanges = signal(false);
  protected readonly productSaveState = signal<SaveFeedback>('idle');
  protected readonly selectedProductIndex = signal<number | null>(null);
  protected readonly selectedProduct = computed<ProductFormGroup | null>(() => {
    const index = this.selectedProductIndex();
    if (index === null) {
      return null;
    }

    return this.productsArray.at(index) as ProductFormGroup;
  });

  constructor() {
    effect(
      () => {
        const site = this.currentSite();
        const products = site?.products ?? [];

        if (this.skipProductSync) {
          this.skipProductSync = false;
          return;
        }

        this.restoreProductsForm(products);
      },
      { allowSignalWrites: true }
    );

    this.productsArray.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.restoringProducts) {
        return;
      }

      this.hasUnsavedProductChanges.set(true);
      if (this.productSaveState() !== 'idle') {
        this.productSaveState.set('idle');
      }
    });
  }

  protected trackProductControl(index: number): number {
    return index;
  }

  protected trackOrder(_: number, order: OrderWithCustomer): string {
    return order.id;
  }

  protected trackUser(_: number, user: { id: string }): string {
    return user.id;
  }

  protected isSelected(index: number): boolean {
    return this.selectedProductIndex() === index;
  }

  protected previewImage(group: ProductFormGroup): string {
    const url = group.controls.imageUrl.value?.trim();
    return url || this.fallbackImage;
  }

  protected selectProduct(index: number): void {
    if (index < 0 || index >= this.productsArray.length) {
      return;
    }

    this.selectedProductIndex.set(index);
  }

  protected addProduct(): void {
    this.productsArray.push(this.buildProductGroup());
    this.selectProduct(this.productsArray.length - 1);
    this.hasUnsavedProductChanges.set(true);
    this.productSaveState.set('idle');
  }

  protected removeProduct(index: number): void {
    if (index < 0 || index >= this.productsArray.length) {
      return;
    }

    const current = this.selectedProductIndex();
    this.productsArray.removeAt(index);
    this.hasUnsavedProductChanges.set(true);
    this.productSaveState.set('idle');

    if (!this.productsArray.length) {
      this.selectedProductIndex.set(null);
      return;
    }

    if (current === null) {
      this.selectedProductIndex.set(0);
      return;
    }

    if (current === index) {
      this.selectedProductIndex.set(Math.min(index, this.productsArray.length - 1));
    } else if (current > index) {
      this.selectedProductIndex.set(current - 1);
    }
  }

  protected saveProductChanges(): void {
    if (this.productManagerForm.invalid) {
      this.productManagerForm.markAllAsTouched();
      return;
    }

    const site = this.currentSite();
    if (!site) {
      return;
    }

    const usedSlugs = new Set<string>();
    const products: ProductDetails[] = this.productsArray.controls.map((group, index) => {
      const raw = group.getRawValue();
      const normalizedSlug = this.generateSlug(raw.slug || raw.name, index, usedSlugs);

      return {
        name: raw.name,
        description: raw.description,
        price: Number(raw.price),
        imageUrl: raw.imageUrl,
        highlight: raw.highlight,
        slug: normalizedSlug,
        gallery: this.parseList(raw.gallery),
        sizes: this.parseList(raw.sizes),
        colors: this.parseList(raw.colors),
        category: raw.category || undefined,
        subCategory: raw.subCategory || undefined
      } satisfies ProductDetails;
    });

    const updatedSite = {
      ...site,
      products
    } satisfies GeneratedSite;

    this.skipProductSync = true;
    this.siteState.setSite(updatedSite);
    this.hasUnsavedProductChanges.set(false);
    this.productManagerForm.markAsPristine();
    this.productManagerForm.markAsUntouched();
    this.productSaveState.set('saved');

    if (this.productSaveTimer) {
      clearTimeout(this.productSaveTimer);
    }

    this.productSaveTimer = setTimeout(() => {
      this.productSaveState.set('idle');
      this.productSaveTimer = null;
    }, 2500);
  }

  protected navigateToStore(): void {
    void this.router.navigateByUrl('/');
  }

  ngOnDestroy(): void {
    if (this.productSaveTimer) {
      clearTimeout(this.productSaveTimer);
    }
  }

  private restoreProductsForm(products: ProductDetails[]): void {
    this.restoringProducts = true;
    const previousIndex = this.selectedProductIndex();

    try {
      while (this.productsArray.length) {
        this.productsArray.removeAt(this.productsArray.length - 1);
      }

      if (!products.length) {
        this.productsArray.push(this.buildProductGroup());
      } else {
        products.forEach((product) => {
          this.productsArray.push(this.buildProductGroup(product));
        });
      }

      this.productManagerForm.markAsPristine();
      this.productManagerForm.markAsUntouched();
      this.hasUnsavedProductChanges.set(false);
      this.productSaveState.set('idle');

      if (!this.productsArray.length) {
        this.selectedProductIndex.set(null);
        return;
      }

      if (previousIndex !== null && previousIndex < this.productsArray.length) {
        this.selectedProductIndex.set(previousIndex);
      } else {
        this.selectedProductIndex.set(0);
      }
    } finally {
      this.restoringProducts = false;
    }
  }

  private buildProductGroup(initial?: ProductDetails): ProductFormGroup {
    return this.fb.group({
      name: this.fb.control(initial?.name ?? '', [Validators.required, Validators.maxLength(60)]),
      description: this.fb.control(initial?.description ?? '', [Validators.required, Validators.minLength(30), Validators.maxLength(250)]),
      price: this.fb.control(initial?.price ?? 0, [Validators.required, Validators.min(0)]),
      imageUrl: this.fb.control(initial?.imageUrl ?? '', [Validators.required]),
      highlight: this.fb.control(initial?.highlight ?? '', [Validators.maxLength(80)]),
      slug: this.fb.control(initial?.slug ?? '', [Validators.maxLength(80)]),
      gallery: this.fb.control(this.formatList(initial?.gallery), [Validators.maxLength(800)]),
      sizes: this.fb.control(this.formatList(initial?.sizes), [Validators.maxLength(200)]),
      colors: this.fb.control(this.formatList(initial?.colors), [Validators.maxLength(200)]),
      category: this.fb.control(initial?.category ?? '', [Validators.maxLength(60)]),
      subCategory: this.fb.control(initial?.subCategory ?? '', [Validators.maxLength(60)])
    });
  }

  private parseList(value: string): string[] | undefined {
    const entries = value
      .split(/[\n\r,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    return entries.length ? entries : undefined;
  }

  private formatList(items?: string[]): string {
    return items?.join('\n') ?? '';
  }

  private generateSlug(candidate: string, index: number, used: Set<string>): string {
    const fallback = `product-${index + 1}`;
    const normalized = candidate
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    let slug = normalized || fallback;
    let suffix = 1;

    while (used.has(slug)) {
      slug = `${normalized || fallback}-${suffix}`;
      suffix += 1;
    }

    used.add(slug);
    return slug;
  }
}

