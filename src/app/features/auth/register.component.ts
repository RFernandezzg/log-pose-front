import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RegisterRequest } from '../../core/auth.models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <section class="mx-auto max-w-md rounded-[3rem] border border-white/5 bg-[#1d2269] p-10 shadow-2xl shadow-black/40 backdrop-blur-xl relative overflow-hidden">
      <div class="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#857752]/10 blur-3xl"></div>

      <div class="relative space-y-2">
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-[#857752]">{{ 'AUTH.REGISTER.WELCOME' | translate }}</p>
        <h1 class="text-4xl font-black text-white tracking-tight">{{ 'AUTH.REGISTER.TITLE' | translate }}</h1>
        <p class="text-xs text-slate-400 font-medium leading-relaxed">{{ 'AUTH.REGISTER.SUBTITLE' | translate }}</p>
      </div>

      <form class="mt-10 space-y-6 relative" [formGroup]="form" (ngSubmit)="submit()">
        <div class="space-y-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.REGISTER.USERNAME' | translate }}</label>
          <input formControlName="username" class="w-full rounded-2xl border border-white/5 bg-[#0b0d2a]/50 px-5 py-4 text-white outline-none ring-0 focus:border-[#857752]/50 transition-all" placeholder="{{ 'AUTH.REGISTER.USERNAME_PLACEHOLDER' | translate }}" />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.REGISTER.EMAIL' | translate }}</label>
          <input formControlName="email" type="email" class="w-full rounded-2xl border border-white/5 bg-[#0b0d2a]/50 px-5 py-4 text-white outline-none ring-0 focus:border-[#857752]/50 transition-all" placeholder="{{ 'AUTH.REGISTER.EMAIL_PLACEHOLDER' | translate }}" />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.REGISTER.PASSWORD' | translate }}</label>
          <input formControlName="password" type="password" class="w-full rounded-2xl border border-white/5 bg-[#0b0d2a]/50 px-5 py-4 text-white outline-none ring-0 placeholder:text-slate-600 focus:border-[#857752]/50 transition-all" placeholder="••••••••" />
        </div>

        <div *ngIf="error" class="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-200 animate-in fade-in slide-in-from-top-2">{{ error }}</div>

        <button type="submit" [disabled]="form.invalid || loading" 
          class="group relative w-full overflow-hidden rounded-2xl bg-[#857752] px-6 py-4 font-black text-white shadow-xl shadow-[#857752]/20 transition-all hover:bg-[#a3946b] active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
          <span class="relative z-10">{{ loading ? ('AUTH.REGISTER.LOADING' | translate) : ('AUTH.REGISTER.BUTTON' | translate) }}</span>
        </button>
      </form>

      <div class="mt-10 pt-8 border-t border-white/5 text-center">
        <p class="text-xs text-slate-400 font-medium">
          {{ 'AUTH.REGISTER.ALREADY_ACCOUNT' | translate }}
          <a routerLink="/auth/login" [queryParams]="{ returnUrl: returnUrl }" class="font-black text-[#857752] hover:text-[#a3946b] ml-1 transition-colors">{{ 'AUTH.REGISTER.BACK_TO_LOGIN' | translate }}</a>
        </p>
      </div>
    </section>
  `
})
export class RegisterComponent {
  loading = false;
  error = '';

  form = this.fb.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  returnUrl = '/';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const request = this.form.getRawValue() as RegisterRequest;

    this.auth.register(request).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: (err) => {
        this.error = err?.error?.message ?? 'No se pudo crear la cuenta';
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }
}