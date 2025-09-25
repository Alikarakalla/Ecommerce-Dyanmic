import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { GeneratedSite, HeroTheme } from '../../models/site.model';

@Component({
  selector: 'app-site-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './site-hero.component.html',
  styleUrls: ['./site-hero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHeroComponent {
  @Input({ required: true }) site!: GeneratedSite;
  protected get heroTheme(): HeroTheme {
    return this.site.themes?.hero ?? 'spotlight';
  }

  protected get heroThemeClass(): string {
    return `site-hero--${this.heroTheme}`;
  }

  protected get heroBackground(): string {
    const image = this.site.heroImageUrl;
    const primary = this.site.primaryColor;

    switch (this.heroTheme) {
      case 'split':
        return `linear-gradient(110deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.92) 48%, rgba(15, 23, 42, 0.68) 48%, rgba(15, 23, 42, 0.82) 100%), url(${image})`;
      case 'overlay':
        return `linear-gradient(135deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.28) 55%, rgba(15, 23, 42, 0.15) 100%), url(${image})`;
      default:
        return `linear-gradient(135deg, ${primary} 0%, rgba(15, 23, 42, 0.55) 60%, rgba(15, 23, 42, 0.35) 100%), url(${image})`;
    }
  }

}



