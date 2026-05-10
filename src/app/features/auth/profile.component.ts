import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AuthSessionService } from '../../core/auth-session.service';
import { UpdateProfileRequest } from '../../core/auth.models';
import { TranslateModule } from '@ngx-translate/core';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <section class="mx-auto max-w-2xl rounded-[3rem] border border-white/5 bg-[#1d2269] p-10 shadow-2xl shadow-black/40 backdrop-blur-xl relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#857752]/10 blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#857752]/5 blur-3xl"></div>

      <div class="relative space-y-2 mb-10">
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-[#857752]">{{ 'AUTH.PROFILE.TAGLINE' | translate }}</p>
        <h1 class="text-4xl font-black text-white tracking-tight">{{ 'AUTH.PROFILE.TITLE' | translate }}</h1>
        <p class="text-xs text-slate-400 font-medium leading-relaxed">{{ 'AUTH.PROFILE.SUBTITLE' | translate }}</p>
      </div>

      <form class="relative space-y-8" [formGroup]="form" (ngSubmit)="submit()">
        
        <!-- Info Básica -->
        <div class="space-y-6 rounded-2xl bg-[#0b0d2a]/30 p-6 border border-white/5">
          <h2 class="text-xs font-black uppercase tracking-widest text-[#857752] mb-4 border-b border-white/5 pb-2">{{ 'AUTH.PROFILE.BASIC_INFO' | translate }}</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.PROFILE.USERNAME' | translate }}</label>
              <input type="text" [value]="username" disabled class="w-full rounded-2xl border border-white/5 bg-[#0b0d2a]/80 px-5 py-4 text-slate-500 cursor-not-allowed outline-none ring-0" />
              <p class="text-[9px] text-slate-500 ml-2">{{ 'AUTH.PROFILE.USERNAME_HELP' | translate }}</p>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.PROFILE.EMAIL' | translate }}</label>
              <input formControlName="email" type="email" class="w-full rounded-2xl border border-white/5 bg-[#0b0d2a]/50 px-5 py-4 text-white outline-none ring-0 placeholder:text-slate-600 focus:border-[#857752]/50 transition-all" />
            </div>
          </div>

          <div class="space-y-4 border-t border-white/5 pt-6 mt-6">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-[#857752]">{{ 'AUTH.PROFILE.AVATAR' | translate }}</h3>
            <div class="flex items-center gap-6">
              <div class="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#857752]/30 bg-[#0b0d2a] shadow-inner flex-shrink-0">
                <img *ngIf="avatarUrl" [src]="avatarUrl" alt="Avatar" class="h-full w-full object-cover" />
                <div *ngIf="!avatarUrl" class="flex h-full w-full items-center justify-center text-3xl">
                  👤
                </div>
              </div>
              
              <div class="flex-1 space-y-2">
                <div 
                  class="relative rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300"
                  [ngClass]="{'border-[#857752] bg-[#857752]/10': isDragOver, 'border-white/10 bg-[#0b0d2a]/30 hover:border-[#857752]/50': !isDragOver}"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onDrop($event)"
                >
                  <input type="file" id="avatarInput" accept="image/*" class="hidden" (change)="onFileSelected($event)" />
                  <label for="avatarInput" 
                    class="inline-block cursor-pointer rounded-xl bg-[#857752]/10 border border-[#857752]/30 px-4 py-2 text-xs font-bold text-[#857752] hover:bg-[#857752]/20 transition-all mb-2">
                    {{ 'AUTH.PROFILE.SELECT_IMAGE' | translate }}
                  </label>
                  <p class="text-[10px] text-slate-500">{{ 'AUTH.PROFILE.IMAGE_HELP' | translate }}</p>
                </div>
                
                <!-- Avatar Error Message -->
                <div *ngIf="avatarError" class="text-[10px] font-bold text-rose-400 animate-in fade-in slide-in-from-top-1 px-1">
                  ⚠️ {{ avatarError }}
                </div>

                <div *ngIf="selectedFile" class="flex items-center gap-2">
                  <span class="text-[10px] font-medium text-slate-300 truncate max-w-[150px]">{{ selectedFile.name }}</span>
                  <button type="button" (click)="uploadAvatar()" [disabled]="uploading"
                    class="rounded bg-[#857752] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#a3946b] transition-colors disabled:opacity-50">
                    {{ uploading ? ('AUTH.PROFILE.UPLOADING' | translate) : ('AUTH.PROFILE.UPLOAD_BTN' | translate) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Seguridad -->
        <div class="space-y-6 rounded-2xl bg-[#0b0d2a]/30 p-6 border border-white/5">
          <h2 class="text-xs font-black uppercase tracking-widest text-[#857752] mb-4 border-b border-white/5 pb-2">{{ 'AUTH.PROFILE.SECURITY' | translate }}</h2>
          <p class="text-[10px] text-slate-400 mb-4">{{ 'AUTH.PROFILE.SECURITY_HELP' | translate }}</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.PROFILE.CURRENT_PASS' | translate }}</label>
              <input formControlName="currentPassword" type="password" class="w-full rounded-2xl border border-white/5 bg-[#0b0d2a]/50 px-5 py-4 text-white outline-none ring-0 placeholder:text-slate-600 focus:border-[#857752]/50 transition-all" placeholder="••••••••" />
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.PROFILE.NEW_PASS' | translate }}</label>
              <input formControlName="newPassword" type="password" class="w-full rounded-2xl border border-white/5 bg-[#0b0d2a]/50 px-5 py-4 text-white outline-none ring-0 placeholder:text-slate-600 focus:border-[#857752]/50 transition-all" placeholder="••••••••" />
            </div>
          </div>
        </div>

        <!-- Autenticación en 2 Pasos (2FA) -->
        <div class="space-y-6 rounded-2xl bg-[#0b0d2a]/30 p-6 border border-white/5">
          <div class="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <h2 class="text-xs font-black uppercase tracking-widest text-[#857752] mb-1">{{ 'AUTH.PROFILE.2FA_TITLE' | translate }}</h2>
              <p class="text-[10px] text-slate-400">{{ 'AUTH.PROFILE.2FA_SUB' | translate }}</p>
            </div>
            <div *ngIf="isTotpEnabled" class="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              {{ 'AUTH.PROFILE.2FA_ENABLED' | translate }}
            </div>
          </div>
          
          <div *ngIf="!isTotpEnabled && !setupQrCodeUrl" class="text-center py-4">
            <button type="button" (click)="setupTotp()" [disabled]="totpLoading"
              class="rounded-xl bg-[#857752]/10 border border-[#857752]/30 px-6 py-3 text-xs font-bold text-[#857752] hover:bg-[#857752]/20 transition-all">
              {{ totpLoading ? ('AUTH.PROFILE.2FA_SETTING_UP' | translate) : ('AUTH.PROFILE.2FA_ACTIVATE' | translate) }}
            </button>
          </div>

          <div *ngIf="!isTotpEnabled && setupQrCodeUrl" class="space-y-6 animate-in fade-in slide-in-from-top-4">
            <div class="flex flex-col md:flex-row gap-6 items-center bg-[#0b0d2a]/50 p-6 rounded-2xl border border-white/5">
              <div class="bg-white p-2 rounded-xl">
                <!-- Usamos la API de qrserver para generar el QR desde la URL del backend -->
                <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodedQrUrl" alt="QR Code" class="w-[150px] h-[150px]" />
              </div>
              <div class="space-y-4 flex-1">
                <p class="text-xs text-slate-300">{{ 'AUTH.PROFILE.2FA_STEP_1' | translate }}</p>
                <div class="space-y-2">
                  <p class="text-[10px] text-slate-500">{{ 'AUTH.PROFILE.2FA_STEP_2' | translate }}</p>
                  <code class="block w-full rounded-lg bg-black/50 px-4 py-2 text-center font-mono text-xs tracking-widest text-[#857752]">{{ setupSecret }}</code>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{{ 'AUTH.PROFILE.2FA_STEP_3' | translate }}</label>
              <div class="flex gap-4">
                <input type="text" [formControl]="totpCodeCtrl" class="flex-1 rounded-xl border border-[#857752]/30 bg-[#0b0d2a]/80 px-5 py-4 text-white outline-none ring-0 focus:border-[#857752] transition-all text-center tracking-widest text-xl font-mono" placeholder="000000" maxlength="6" />
                <button type="button" (click)="enableTotp()" [disabled]="totpLoading || totpCodeCtrl.invalid"
                  class="rounded-xl bg-[#857752] px-8 py-4 font-black text-white hover:bg-[#a3946b] active:scale-95 transition-all disabled:opacity-50">
                  {{ 'AUTH.PROFILE.2FA_VERIFY' | translate }}
                </button>
              </div>
              <button type="button" (click)="cancelTotpSetup()" class="text-[10px] text-slate-500 hover:text-white transition-colors underline">{{ 'AUTH.PROFILE.2FA_CANCEL' | translate }}</button>
            </div>
          </div>

          <div *ngIf="isTotpEnabled" class="text-center py-4">
            <button type="button" (click)="disableTotp()" [disabled]="totpLoading"
              class="rounded-xl bg-rose-500/10 border border-rose-500/30 px-6 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all">
              {{ totpLoading ? ('AUTH.PROFILE.2FA_DEACTIVATING' | translate) : ('AUTH.PROFILE.2FA_DEACTIVATE' | translate) }}
            </button>
          </div>
        </div>

        <!-- Feedback -->
        <div *ngIf="error" class="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-200 animate-in fade-in slide-in-from-top-2">{{ error }}</div>
        <div *ngIf="success" class="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200 animate-in fade-in slide-in-from-top-2">{{ 'AUTH.PROFILE.SUCCESS_MSG' | translate }}</div>

        <!-- Actions -->
        <div class="flex justify-end pt-4">
          <button type="submit" [disabled]="form.invalid || loading || !form.dirty" 
            class="group relative overflow-hidden rounded-2xl bg-[#857752] px-10 py-4 font-black text-white shadow-xl shadow-[#857752]/20 transition-all hover:bg-[#a3946b] active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
            <span class="relative z-10">{{ loading ? ('AUTH.PROFILE.SAVING' | translate) : ('AUTH.PROFILE.SAVE_BTN' | translate) }}</span>
          </button>
        </div>
      </form>
    </section>
  `
})
export class ProfileComponent implements OnInit, OnDestroy {
  loading = false;
  uploading = false;
  error = '';
  success = false;
  username = '';
  avatarUrl = '';
  selectedFile: File | null = null;
  avatarError = '';
  isDragOver = false;

  isTotpEnabled = false;
  totpLoading = false;
  setupSecret = '';
  setupQrCodeUrl = '';
  encodedQrUrl = '';

  private destroy$ = new Subject<void>();

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    currentPassword: ['', [Validators.minLength(6)]],
    newPassword: ['', [Validators.minLength(6)]]
  });

  totpCodeCtrl = this.fb.control('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private session: AuthSessionService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    const user = this.session.user;
    if (user) {
      this.username = user.username;

      // Load real profile data from backend to ensure isTotpEnabled is up to date
      this.auth.getUserProfile(user.username).pipe(takeUntil(this.destroy$)).subscribe({
        next: (profile) => {
          this.avatarUrl = profile.avatarUrl || '';
          this.isTotpEnabled = profile.isTotpEnabled || false;
          this.form.patchValue({
            email: profile.email
          });

          // Update session if needed
          this.session.updateUser({ ...user, isTotpEnabled: profile.isTotpEnabled } as any);
        },
        error: () => {
          // Fallback to session data if fetch fails
          this.avatarUrl = (user as any).avatarUrl || '';
          this.isTotpEnabled = (user as any).isTotpEnabled || false;
          this.form.patchValue({
            email: user.email
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    // Validaciones
    if (!file.type.startsWith('image/')) {
      this.error = 'El archivo debe ser una imagen.';
      this.selectedFile = null;
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.error = 'El tamaño de la imagen no puede exceder los 2MB.';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.error = '';
    this.avatarError = '';
    this.success = false;
  }

  uploadAvatar(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.error = '';
    this.avatarError = '';
    this.success = false;

    this.auth.uploadAvatar(this.selectedFile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updatedProfile) => {
        this.uploading = false;
        this.selectedFile = null;
        this.avatarUrl = updatedProfile.avatarUrl || '';
        this.success = true;

        // Actualizar sesión
        const currentUser = this.session.user;
        if (currentUser) {
          const newSessionUser = {
            id: updatedProfile.id,
            username: updatedProfile.username,
            email: updatedProfile.email,
            avatarUrl: updatedProfile.avatarUrl
          };
          this.session.updateUser(newSessionUser as any);
        }
      },
      error: (err) => {
        this.uploading = false;
        const msg = err?.error?.message ?? 'Error al subir el avatar.';
        if (msg === 'Ese es tu avatar actual') {
          this.avatarError = msg;
        } else {
          this.error = msg;
        }
      }
    });
  }

  setupTotp(): void {
    this.totpLoading = true;
    this.error = '';
    this.auth.setupTotp().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.setupSecret = res.secret;
        this.setupQrCodeUrl = res.qrCodeUrl;
        this.encodedQrUrl = encodeURIComponent(res.qrCodeUrl);
        this.totpLoading = false;
      },
      error: (err) => {
        this.error = 'No se pudo generar la configuración de 2FA.';
        this.totpLoading = false;
      }
    });
  }

  cancelTotpSetup(): void {
    this.setupSecret = '';
    this.setupQrCodeUrl = '';
    this.totpCodeCtrl.reset();
  }

  enableTotp(): void {
    if (this.totpCodeCtrl.invalid) return;

    this.totpLoading = true;
    this.error = '';

    this.auth.enableTotp({
      secret: this.setupSecret,
      code: Number(this.totpCodeCtrl.value)
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.success = true;
        this.isTotpEnabled = true;
        this.cancelTotpSetup();
        this.totpLoading = false;

        // Actualizar sesión
        const currentUser = this.session.user;
        if (currentUser) {
          this.session.updateUser({ ...currentUser, isTotpEnabled: true } as any);
        }
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Código incorrecto. Inténtalo de nuevo.';
        this.totpLoading = false;
      }
    });
  }

  disableTotp(): void {
    this.modalService.show({
      title: 'Desactivar 2FA',
      message: '¿Estás seguro de que quieres desactivar la autenticación en 2 pasos?',
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        this.totpLoading = true;
        this.error = '';

        this.auth.disableTotp().pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.success = true;
            this.isTotpEnabled = false;
            this.totpLoading = false;

            // Actualizar sesión
            const currentUser = this.session.user;
            if (currentUser) {
              this.session.updateUser({ ...currentUser, isTotpEnabled: false } as any);
            }
          },
          error: (err) => {
            this.error = 'No se pudo desactivar el 2FA.';
            this.totpLoading = false;
          }
        });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = false;

    const values = this.form.getRawValue();
    const request: UpdateProfileRequest = {
      email: values.email || undefined,
      currentPassword: values.currentPassword || undefined,
      newPassword: values.newPassword || undefined
    };

    // Solo enviar contraseñas si ambas están presentes
    if ((request.currentPassword && !request.newPassword) || (!request.currentPassword && request.newPassword)) {
      this.error = 'Para cambiar la contraseña debes rellenar tanto la actual como la nueva.';
      this.loading = false;
      return;
    }

    this.auth.updateProfile(request).subscribe({
      next: (updatedProfile) => {
        this.success = true;
        this.loading = false;

        // Actualizar sesión con nuevos datos básicos
        const currentUser = this.session.user;
        if (currentUser) {
          this.session.updateUser({
            id: updatedProfile.id,
            username: updatedProfile.username,
            email: updatedProfile.email,
            avatarUrl: updatedProfile.avatarUrl
          } as any);
        }

        // Limpiar campos de contraseña y resetear estado dirty
        this.form.patchValue({ currentPassword: '', newPassword: '' });
        this.form.markAsPristine();
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'No se pudo actualizar el perfil.';
        this.loading = false;
      }
    });
  }
}
