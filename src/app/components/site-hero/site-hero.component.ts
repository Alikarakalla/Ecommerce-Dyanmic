import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { GeneratedSite } from '../../models/site.model';

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
}
