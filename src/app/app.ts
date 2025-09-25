import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AccountModalComponent } from './components/account-modal/account-modal.component';
import { GeneratedSite } from './models/site.model';
import { SiteStateService } from './state/site-state.service';
import { SetupWizardComponent } from './wizard/setup-wizard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SetupWizardComponent, AccountModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private readonly siteState = inject(SiteStateService);
  private readonly router = inject(Router);

  protected readonly wizardOpen = this.siteState.wizardOpen;
  protected readonly currentSite = this.siteState.site;
  protected readonly accountModalOpen = this.siteState.accountModalOpen;

  protected handleSiteGenerated(site: GeneratedSite): void {
    this.siteState.setSite(site);
    this.siteState.closeWizard();
    void this.router.navigateByUrl('/');
  }

  protected handleWizardCancelled(): void {
    this.siteState.closeWizard();
  }
}
