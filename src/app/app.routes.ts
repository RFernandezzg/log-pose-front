import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { ProfileComponent } from './features/auth/profile.component';
import { DecksComponent } from './features/decks/decks.component';
import { DeckBuilderComponent } from './features/decks/builder/deck-builder.component';
import { DeckViewComponent } from './features/decks/deck-view.component';
import { DecksExploreComponent } from './features/decks/decks-explore.component';
import { CardsComponent } from './features/cards/cards.component';
import { CardDetailComponent } from './features/cards/card-detail.component';
import { LeadersComponent } from './features/cards/leaders.component';
import { HomeComponent } from './features/home/home.component';
import { ShopComponent } from './features/shop/shop.component';
import { EventListComponent } from './features/events/event-list.component';
import { authGuard } from './core/auth.guard';
import { guestGuard } from './core/guest.guard';

export const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'shop', component: ShopComponent },
	{ path: 'events', component: EventListComponent },
	{ path: 'cards', component: CardsComponent },
	{ path: 'cards/leaders', component: LeadersComponent },
	{ path: 'cards/:id', component: CardDetailComponent },
	{ path: 'auth/login', component: LoginComponent, canActivate: [guestGuard] },
	{ path: 'auth/register', component: RegisterComponent, canActivate: [guestGuard] },
	{ path: 'decks/explore', component: DecksExploreComponent },
	{ path: 'decks', component: DecksComponent, canActivate: [authGuard] },
	{ path: 'decks/build', component: DeckBuilderComponent },
	{ path: 'decks/view/:id', component: DeckViewComponent },
	{ path: 'decks/edit/:id', component: DeckBuilderComponent, canActivate: [authGuard] },
	{ path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: '' }
];
