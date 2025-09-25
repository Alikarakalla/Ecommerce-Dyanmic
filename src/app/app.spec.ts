import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { routes } from './app.routes';
import { App } from './app';
import { GeneratedSite } from './models/site.model';
import { SiteStateService } from './state/site-state.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter(routes)]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should not render the onboarding wizard by default', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.wizard-backdrop')).toBeFalsy();
  });

  it('should store generated site data and close the wizard when completed', () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance as App & { [key: string]: unknown };
    const siteState = TestBed.inject(SiteStateService);

    const site: GeneratedSite = {
      storeName: 'Nova Supply Co.',
      tagline: 'Everyday essentials, elevated.',
      logoUrl: 'https://example.com/logo.svg',
      heroImageUrl: 'https://example.com/hero.jpg',
      heroCtaLabel: 'Shop the collection',
      heroCtaLink: '#featured-products',
      primaryColor: '#2563eb',
      accentColor: '#f97316',
      about: {
        title: 'Our Story',
        description: 'From concept to doorstep, we curate everyday essentials designed to last.'
      },
      contact: {
        contactEmail: 'hello@novasupply.com',
        contactPhone: '(555) 123-4567',
        contactAddress: '100 Market Street, San Francisco',
        instagramUrl: 'https://instagram.com/novasupply',
        facebookUrl: ''
      },
      themes: {
        navbar: 'classic',
        hero: 'spotlight',
        productCard: 'elevated'
      },
      products: [
        {
          name: 'Signature Hoodie',
          description: 'Cozy fleece-lined hoodie with minimalist branding.',
          price: 68,
          imageUrl: 'https://example.com/hoodie.jpg',
          highlight: 'Best Seller',
          slug: 'signature-hoodie'
        }
      ]
    };

    component['handleSiteGenerated'](site);
    fixture.detectChanges();

    expect(siteState.site()).toEqual(site);
    expect(siteState.wizardOpen()).toBeFalse();
  });
});


