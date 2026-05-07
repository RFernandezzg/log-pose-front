import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/auth.interceptor';
import { ErrorInterceptor } from './core/error.interceptor';
import { CardsService } from './features/cards/cards.service';

function preloadCardsFactory(cardsService: CardsService): () => void {
  return () => {
    cardsService.preloadAllCards().subscribe({
      error: () => {
        // Silent fail: the cards page still handles its own loading state.
      }
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json'
      }),
      defaultLanguage: 'es'
    }),
    { provide: APP_INITIALIZER, useFactory: preloadCardsFactory, deps: [CardsService], multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ]
};
