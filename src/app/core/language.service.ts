import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'logpose_lang';

  constructor(private translate: TranslateService) {
    const savedLang = localStorage.getItem(this.LANG_KEY) || 'es';
    this.translate.use(savedLang);
  }

  setLanguage(lang: 'es' | 'en'): void {
    this.translate.use(lang);
    localStorage.setItem(this.LANG_KEY, lang);
  }

  getCurrentLang(): string {
    return this.translate.currentLang || 'es';
  }
}
