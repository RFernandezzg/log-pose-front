import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthSessionService } from './core/auth-session.service';
import { AuthService } from './core/auth.service';
import { LanguageService } from './core/language.service';

import { ModalComponent } from './shared/components/modal/modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, RouterModule, TranslateModule, ModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
  showLangDropdown = false;
  mobileMenuOpen = false;

  constructor(
    public session: AuthSessionService,
    private auth: AuthService,
    public router: Router,
    public langService: LanguageService
  ) { }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  setLanguage(lang: 'es' | 'en'): void {
    this.langService.setLanguage(lang);
    this.showLangDropdown = false;
    this.mobileMenuOpen = false;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
