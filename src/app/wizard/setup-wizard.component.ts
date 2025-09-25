import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
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
import { GeneratedSite, HeroTheme, NavbarTheme, ProductCardTheme, ProductDetails } from '../models/site.model';

interface ThemeOption<T extends string> {
  id: T;
  label: string;
  description: string;
}

interface ProductFormValue {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  gallery: string;
  sizes: string;
  colors: string;
  category: string;
  subCategory: string;
  highlight: string;
}

const DEFAULT_PRODUCTS: ProductDetails[] = [
  {
    name: 'Signature Hoodie',
    description: 'Cozy fleece-lined hoodie with minimalist branding.',
    price: 68,
    imageUrl: 'https://images.unsplash.com/photo-1542293787938-4d2226c9a6f0?auto=format&fit=crop&w=1600&q=80',
    highlight: 'Best Seller',
    slug: 'signature-hoodie',
    gallery: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80'
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Heather Gray', 'Navy'],
    category: 'Apparel',
    subCategory: 'Outerwear'
  },
  {
    name: 'Essential Backpack',
    description: 'Durable commuter pack with smart storage for every day.',
    price: 92,
    imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1600&q=80',
    highlight: 'Staff Pick',
    slug: 'essential-backpack',
    gallery: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80'
    ],
    sizes: ['One Size'],
    colors: ['Olive', 'Black'],
    category: 'Accessories',
    subCategory: 'Bags'
  },
  {
    name: 'Everyday Water Bottle',
    description: 'Insulated steel bottle that keeps drinks cold for 24h.',
    price: 32,
    imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1600&q=80',
    highlight: 'Limited Release',
    slug: 'everyday-water-bottle',
    gallery: [
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1600&q=80'
    ],
    sizes: ['600ml', '1L'],
    colors: ['Slate', 'Sand'],
    category: 'Lifestyle',
    subCategory: 'Drinkware'
  }
];

const NAVBAR_THEME_OPTIONS: ThemeOption<NavbarTheme>[] = [
  { id: 'classic', label: 'Classic', description: 'Layered glass effect with balanced layout.' },
  { id: 'minimal', label: 'Minimal', description: 'Clean underline with centered brand.' },
  { id: 'contrast', label: 'Contrast', description: 'Bold twilight bar with light typography.' },
  { id: 'floating', label: 'Floating', description: 'Rounded capsule nav that hovers over content.' },
  { id: 'pill', label: 'Pill', description: 'Accent-backed brand badge with pill links.' }
];

const HERO_THEME_OPTIONS: ThemeOption<HeroTheme>[] = [
  { id: 'spotlight', label: 'Spotlight', description: 'Full-bleed hero with gradient overlay.' },
  { id: 'split', label: 'Split', description: 'Two-column layout with framed imagery.' },
  { id: 'overlay', label: 'Overlay', description: 'Soft background with centered call-to-action.' }
];

const PRODUCT_CARD_THEME_OPTIONS: ThemeOption<ProductCardTheme>[] = [
  { id: 'elevated', label: 'Elevated', description: 'Shadowed cards with hover lift.' },
  { id: 'bordered', label: 'Bordered', description: 'Clean outlines with subtle depth.' },
  { id: 'minimal', label: 'Minimal', description: 'Flat cards with relaxed spacing.' }
];

type ThemeControl = 'navbarTheme' | 'heroTheme' | 'productCardTheme';

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetupWizardComponent implements OnChanges {
  @Input() site: GeneratedSite | null = null;
  @Output() completed = new EventEmitter<GeneratedSite>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly steps = [
    { title: 'Brand Basics', description: 'Introduce your shop with a clear identity.' },
    { title: 'Visual Identity', description: 'Craft the look and feel of your hero moment.' },
    { title: 'Contact & Social', description: 'Help visitors connect with your brand.' },
    { title: 'Featured Products', description: 'Showcase the items you want to spotlight.' }
  ] as const;

  protected readonly navbarThemeOptions = NAVBAR_THEME_OPTIONS;
  protected readonly heroThemeOptions = HERO_THEME_OPTIONS;
  protected readonly productCardThemeOptions = PRODUCT_CARD_THEME_OPTIONS;

  protected readonly wizardForm = this.fb.group({
    brand: this.fb.group({
      storeName: this.fb.control('', [Validators.required, Validators.maxLength(60)]),
      tagline: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
      logoUrl: this.fb.control('', [Validators.required])
    }),
    visuals: this.fb.group({
      heroImageUrl: this.fb.control('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80', [Validators.required]),
      heroCtaLabel: this.fb.control('Shop the collection', [Validators.required, Validators.maxLength(40)]),
      heroCtaLink: this.fb.control('#featured-products', [Validators.required, Validators.maxLength(120)]),
      primaryColor: this.fb.control('#2563eb', [Validators.required]),
      accentColor: this.fb.control('#f97316', [Validators.required]),
      navbarTheme: this.fb.control<NavbarTheme>('classic'),
      heroTheme: this.fb.control<HeroTheme>('spotlight'),
      productCardTheme: this.fb.control<ProductCardTheme>('elevated'),
      aboutTitle: this.fb.control('Our Story', [Validators.required, Validators.maxLength(60)]),
      aboutDescription: this.fb.control('From concept to doorstep, we curate everyday essentials designed to last. Crafted with sustainable materials and made for life on the move.', [
        Validators.required,
        Validators.minLength(30),
        Validators.maxLength(360)
      ])
    }),
    contact: this.fb.group({
      contactEmail: this.fb.control('', [Validators.required, Validators.email]),
      contactPhone: this.fb.control('', [Validators.maxLength(40)]),
      contactAddress: this.fb.control('', [Validators.maxLength(120)]),
      instagramUrl: this.fb.control('', [Validators.maxLength(120)]),
      facebookUrl: this.fb.control('', [Validators.maxLength(120)])
    }),
    products: this.fb.array(DEFAULT_PRODUCTS.map((product) => this.buildProductGroup(product)))
  });

  protected readonly currentStep = signal(0);
  protected readonly currentStepMeta = computed(() => this.steps[this.currentStep()]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['site']) {
      this.prefillWithSite(changes['site'].currentValue as GeneratedSite | null);
    }
  }

  protected selectTheme(control: ThemeControl, value: string): void {
    this.getThemeControl(control).setValue(value);
  }

  protected isThemeSelected(control: ThemeControl, value: string): boolean {
    return this.getThemeControl(control).value === value;
  }

  private getThemeControl(control: ThemeControl): FormControl<string> {
    return this.wizardForm.controls.visuals.get(control) as FormControl<string>;
  }

  protected get productsArray(): FormArray<FormGroup> {
    return this.wizardForm.controls.products;
  }

  protected get brandControls() {
    return this.wizardForm.controls.brand.controls;
  }

  protected get visualControls() {
    return this.wizardForm.controls.visuals.controls;
  }

  protected get contactControls() {
    return this.wizardForm.controls.contact.controls;
  }

  protected get canGoBack(): boolean {
    return this.currentStep() > 0;
  }

  protected get isLastStep(): boolean {
    return this.currentStep() === this.steps.length - 1;
  }

  protected goToStep(step: number): void {
    if (step < 0 || step >= this.steps.length) {
      return;
    }

    if (step > this.currentStep() && !this.validateStep()) {
      return;
    }

    this.currentStep.set(step);
  }

  protected nextStep(): void {
    if (!this.validateStep()) {
      return;
    }

    this.currentStep.update((value) => Math.min(value + 1, this.steps.length - 1));
  }

  protected previousStep(): void {
    this.currentStep.update((value) => Math.max(value - 1, 0));
  }

  protected addProduct(): void {
    this.productsArray.push(this.buildProductGroup());
  }

  protected removeProduct(index: number): void {
    if (this.productsArray.length <= 1) {
      return;
    }

    this.productsArray.removeAt(index);
  }

  protected submitWizard(): void {
    if (!this.validateStep(true)) {
      return;
    }

    if (this.wizardForm.invalid) {
      this.wizardForm.markAllAsTouched();
      return;
    }

    const raw = this.wizardForm.getRawValue();
    const productForms = raw.products as ProductFormValue[];
    const usedSlugs = new Set<string>();
    const products: ProductDetails[] = productForms.map((product, index) => {
      const name = product.name;
      const description = product.description;
      const price = product.price;
      const imageUrl = product.imageUrl;
      const highlight = product.highlight;
      const gallery = this.parseList(product.gallery);
      const sizes = this.parseList(product.sizes);
      const colors = this.parseList(product.colors);
      const category = product.category || undefined;
      const subCategory = product.subCategory || undefined;

      return {
        name,
        description,
        price,
        imageUrl,
        highlight,
        slug: this.generateSlug(name, index, usedSlugs),
        gallery: gallery.length ? gallery : undefined,
        sizes: sizes.length ? sizes : undefined,
        colors: colors.length ? colors : undefined,
        category,
        subCategory
      } satisfies ProductDetails;
    });

    const site: GeneratedSite = {
      storeName: raw.brand.storeName,
      tagline: raw.brand.tagline,
      logoUrl: raw.brand.logoUrl,
      heroImageUrl: raw.visuals.heroImageUrl,
      heroCtaLabel: raw.visuals.heroCtaLabel,
      heroCtaLink: raw.visuals.heroCtaLink,
      primaryColor: raw.visuals.primaryColor,
      accentColor: raw.visuals.accentColor,
      about: {
        title: raw.visuals.aboutTitle,
        description: raw.visuals.aboutDescription
      },
      contact: {
        contactEmail: raw.contact.contactEmail,
        contactPhone: raw.contact.contactPhone,
        contactAddress: raw.contact.contactAddress,
        instagramUrl: raw.contact.instagramUrl,
        facebookUrl: raw.contact.facebookUrl
      },
      themes: {
        navbar: raw.visuals.navbarTheme,
        hero: raw.visuals.heroTheme,
        productCard: raw.visuals.productCardTheme
      },
      products
    };

    this.completed.emit(site);
  }

  protected cancelWizard(): void {
    this.cancelled.emit();
  }

  private buildProductGroup(initial?: ProductDetails): FormGroup {
    const galleryValue = initial?.gallery?.join(', ') ?? '';
    const sizesValue = initial?.sizes?.join(', ') ?? '';
    const colorsValue = initial?.colors?.join(', ') ?? '';

    return this.fb.group({
      name: this.fb.control(initial?.name ?? '', [Validators.required, Validators.maxLength(60)]),
      description: this.fb.control(initial?.description ?? '', [Validators.required, Validators.maxLength(160)]),
      price: this.fb.control(initial?.price ?? 0, [Validators.required, Validators.min(0)]),
      imageUrl: this.fb.control(initial?.imageUrl ?? '', [Validators.required]),
      gallery: this.fb.control(galleryValue, [Validators.maxLength(800)]),
      sizes: this.fb.control(sizesValue, [Validators.maxLength(200)]),
      colors: this.fb.control(colorsValue, [Validators.maxLength(200)]),
      category: this.fb.control(initial?.category ?? '', [Validators.maxLength(60)]),
      subCategory: this.fb.control(initial?.subCategory ?? '', [Validators.maxLength(60)]),
      highlight: this.fb.control(initial?.highlight ?? '', [Validators.maxLength(80)])
    });
  }

  private prefillWithSite(site: GeneratedSite | null): void {
    const productsArray = this.productsArray;

    if (!site) {
      this.wizardForm.reset(undefined, { emitEvent: false });
      while (productsArray.length) {
        productsArray.removeAt(0);
      }
      DEFAULT_PRODUCTS.forEach((product) => {
        productsArray.push(this.buildProductGroup(product));
      });
      this.currentStep.set(0);
      return;
    }

    this.wizardForm.patchValue({
      brand: {
        storeName: site.storeName,
        tagline: site.tagline,
        logoUrl: site.logoUrl
      },
      visuals: {
        heroImageUrl: site.heroImageUrl,
        heroCtaLabel: site.heroCtaLabel,
        heroCtaLink: site.heroCtaLink,
        primaryColor: site.primaryColor,
        accentColor: site.accentColor,
        navbarTheme: site.themes?.navbar ?? 'classic',
        heroTheme: site.themes?.hero ?? 'spotlight',
        productCardTheme: site.themes?.productCard ?? 'elevated',
        aboutTitle: site.about.title,
        aboutDescription: site.about.description
      },
      contact: {
        contactEmail: site.contact.contactEmail,
        contactPhone: site.contact.contactPhone,
        contactAddress: site.contact.contactAddress,
        instagramUrl: site.contact.instagramUrl,
        facebookUrl: site.contact.facebookUrl
      }
    }, { emitEvent: false });

    while (productsArray.length) {
      productsArray.removeAt(0);
    }

    site.products.forEach((product) => {
      productsArray.push(this.buildProductGroup(product));
    });

    this.currentStep.set(0);
  }

  private parseList(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private validateStep(forceTouch = false): boolean {
    const stepIndex = this.currentStep();
    const segments = [
      this.wizardForm.controls.brand,
      this.wizardForm.controls.visuals,
      this.wizardForm.controls.contact,
      this.wizardForm.controls.products
    ];

    const target = segments[stepIndex];
    if (!target) {
      return true;
    }

    if (forceTouch) {
      target.markAllAsTouched();
      if (target instanceof FormArray) {
        target.controls.forEach((control) => control.markAllAsTouched());
      }
    }

    return target.valid;
  }

  private generateSlug(name: string, index: number, usedSlugs: Set<string>): string {
    const baseCandidate = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || `product-${index + 1}`;

    let candidate = baseCandidate;
    let suffix = 1;

    while (usedSlugs.has(candidate)) {
      candidate = `${baseCandidate}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(candidate);
    return candidate;
  }
}







