import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { GeneratedSite } from '../../models/site.model';
import { SiteStateService } from '../../state/site-state.service';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './site-footer.component.html',
  styleUrls: ['./site-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteFooterComponent {
  @Input({ required: true }) site!: GeneratedSite;

  private readonly siteState = inject(SiteStateService);

  protected readonly currentYear = this.siteState.currentYear;
}
