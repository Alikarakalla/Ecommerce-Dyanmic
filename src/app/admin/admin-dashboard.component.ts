import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
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

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly siteState = inject(SiteStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private skipNextSync = false;
  private lastSiteSnapshot: string | null = null;
  private saveToastTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly hasSite = this.siteState.hasSite;
  protected readonly currentSite = this.siteState.site;
  protected readonly totalProducts = computed(() => this.currentSite()?.products.length ?? 0);
  protected readonly totalCategories = computed(() => {
    const site = this.currentSite();
    if (!site) {
      return 0;
    }

    const categories = new Set<string>();
    site.products.forEach((product) => {
      categories.add((product.category || 'Uncategorized').trim().toLowerCase());
    });

    return categories.size;
  });

  protected readonly dashboardForm = this.fb.group({
    brand: this.fb.group({
      storeName: this.fb.control('', [Validators.required, Validators.maxLength(60)]),
      tagline: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
      logoUrl: this.fb.control('', [Validators.required])
    }),
    hero: this.fb.group({
      heroImageUrl: this.fb.control('', [Validators.required]),
      heroCtaLabel: this.fb.control('Shop now', [Validators.required, Validators.maxLength(40)]),
      heroCtaLink: this.fb.control('#featured-products', [Validators.required, Validators.maxLength(120)]),
      primaryColor: this.fb.control('#2563eb', [Validators.required]),
      accentColor: this.fb.control('#f97316', [Validators.required])
    }),
    about: this.fb.group({
      title: this.fb.control('Our Story', [Validators.required, Validators.maxLength(60)]),
      description: this.fb.control('', [Validators.required, Validators.minLength(30), Validators.maxLength(360)])
    }),
    contact: this.fb.group({
      contactEmail: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(120)]),
      contactPhone: this.fb.control('', [Validators.maxLength(40)]),
      contactAddress: this.fb.control('', [Validators.maxLength(160)]),
      instagramUrl: this.fb.control('', [Validators.maxLength(160)]),
      facebookUrl: this.fb.control('', [Validators.maxLength(160)])
    }),
    products: this.fb.array<ProductFormGroup>([])
  });

  protected readonly productsArray = this.dashboardForm.controls.products;
  protected readonly hasUnsavedChanges = signal(false);
  protected readonly saveFeedback = signal<SaveFeedback>('idle');
  protected readonly lastSavedAt = signal<Date | null>(null);

  constructor() {
    effect(
      () => {
        const site = this.currentSite();
        const serialized = site ? JSON.stringify(site) : null;

        if (this.skipNextSync) {
          this.skipNextSync = false;
          this.lastSiteSnapshot = serialized;
          return;
        }

        if (serialized === this.lastSiteSnapshot) {
          return;
        }

        this.lastSiteSnapshot = serialized;
        this.resetForm(site ?? null);
      },
      { allowSignalWrites: true }
    );

    this.dashboardForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.hasUnsavedChanges.set(this.dashboardForm.dirty);
      if (this.saveFeedback() !== 'idle') {
        this.saveFeedback.set('idle');
      }
    });
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  protected addProduct(): void {
    this.productsArray.push(this.buildProductGroup());
    this.markDirty();
  }

  protected removeProduct(index: number): void {
    if (this.productsArray.length <= 1) {
      return;
    }

    this.productsArray.removeAt(index);
    this.markDirty();
  }

  protected saveChanges(): void {
    if (this.dashboardForm.invalid) {
      this.dashboardForm.markAllAsTouched();
      return;
    }

    const raw = this.dashboardForm.getRawValue();
    const usedSlugs = new Set<string>();
    const products: ProductDetails[] = raw.products.map((product, index) => {
      const normalizedSlug = this.generateSlug(product.slug || product.name, index, usedSlugs);

      return {
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        highlight: product.highlight,
        slug: normalizedSlug,
        gallery: this.parseList(product.gallery),
        sizes: this.parseList(product.sizes),
        colors: this.parseList(product.colors),
        category: product.category || undefined,
        subCategory: product.subCategory || undefined
      } satisfies ProductDetails;
    });

    const site: GeneratedSite = {
      storeName: raw.brand.storeName,
      tagline: raw.brand.tagline,
      logoUrl: raw.brand.logoUrl,
      heroImageUrl: raw.hero.heroImageUrl,
      heroCtaLabel: raw.hero.heroCtaLabel,
      heroCtaLink: raw.hero.heroCtaLink,
      primaryColor: raw.hero.primaryColor,
      accentColor: raw.hero.accentColor,
      about: {
        title: raw.about.title,
        description: raw.about.description
      },
      contact: {
        contactEmail: raw.contact.contactEmail,
        contactPhone: raw.contact.contactPhone,
        contactAddress: raw.contact.contactAddress,
        instagramUrl: raw.contact.instagramUrl,
        facebookUrl: raw.contact.facebookUrl
      },
      products
    } satisfies GeneratedSite;

    this.skipNextSync = true;
    this.siteState.setSite(site);
    this.resetForm(site);
    this.hasUnsavedChanges.set(false);
    this.saveFeedback.set('saved');
    this.lastSavedAt.set(new Date());

    if (this.saveToastTimer) {
      clearTimeout(this.saveToastTimer);
    }

    this.saveToastTimer = setTimeout(() => {
      this.saveFeedback.set('idle');
      this.saveToastTimer = null;
    }, 2500);
  }

  protected startWizard(): void {
    if (this.siteState.openWizard()) {
      void this.router.navigateByUrl('/');
    }
  }

  protected navigateToStore(): void {
    void this.router.navigateByUrl('/');
  }

  private markDirty(): void {
    if (!this.dashboardForm.dirty) {
      this.dashboardForm.markAsDirty();
    }
    this.hasUnsavedChanges.set(true);
  }

  private resetForm(site: GeneratedSite | null): void {
    const brandGroup = this.dashboardForm.controls.brand;
    const heroGroup = this.dashboardForm.controls.hero;
    const aboutGroup = this.dashboardForm.controls.about;
    const contactGroup = this.dashboardForm.controls.contact;
    const productsArray = this.productsArray;

    while (productsArray.length) {
      productsArray.removeAt(0);
    }

    if (!site) {
      brandGroup.reset({ storeName: '', tagline: '', logoUrl: '' }, { emitEvent: false });
      heroGroup.reset(
        {
          heroImageUrl: '',
          heroCtaLabel: 'Shop now',
          heroCtaLink: '#featured-products',
          primaryColor: '#2563eb',
          accentColor: '#f97316'
        },
        { emitEvent: false }
      );
      aboutGroup.reset(
        {
          title: 'Our Story',
          description:
            'Share the heart of your brand, your craft, and what makes your products worth discovering.'
        },
        { emitEvent: false }
      );
      contactGroup.reset(
        {
          contactEmail: '',
          contactPhone: '',
          contactAddress: '',
          instagramUrl: '',
          facebookUrl: ''
        },
        { emitEvent: false }
      );
      productsArray.push(this.buildProductGroup());
    } else {
      brandGroup.reset(
        {
          storeName: site.storeName,
          tagline: site.tagline,
          logoUrl: site.logoUrl
        },
        { emitEvent: false }
      );
      heroGroup.reset(
        {
          heroImageUrl: site.heroImageUrl,
          heroCtaLabel: site.heroCtaLabel,
          heroCtaLink: site.heroCtaLink,
          primaryColor: site.primaryColor,
          accentColor: site.accentColor
        },
        { emitEvent: false }
      );
      aboutGroup.reset(
        {
          title: site.about.title,
          description: site.about.description
        },
        { emitEvent: false }
      );
      contactGroup.reset(
        {
          contactEmail: site.contact.contactEmail,
          contactPhone: site.contact.contactPhone ?? '',
          contactAddress: site.contact.contactAddress ?? '',
          instagramUrl: site.contact.instagramUrl ?? '',
          facebookUrl: site.contact.facebookUrl ?? ''
        },
        { emitEvent: false }
      );

      site.products.forEach((product) => {
        productsArray.push(this.buildProductGroup(product));
      });

      if (!productsArray.length) {
        productsArray.push(this.buildProductGroup());
      }
    }

    this.dashboardForm.markAsPristine();
    this.dashboardForm.markAsUntouched();
    this.hasUnsavedChanges.set(false);
  }

  private buildProductGroup(initial?: ProductDetails): ProductFormGroup {
    return this.fb.group({
      name: this.fb.control(initial?.name ?? '', [Validators.required, Validators.maxLength(60)]),
      description: this.fb.control(initial?.description ?? '', [Validators.required, Validators.maxLength(200)]),
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
      .split(/[\n,]+/)
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
