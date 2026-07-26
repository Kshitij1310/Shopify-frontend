import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserProfile } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { UiService } from '../../../../shared/services/ui.service';

@Component({
  selector: 'app-customer-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class CustomerProfilePageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly subscriptions = new Subscription();
  private currentUid: string | null = null;
  previewPhotoUrl = '';
  selectedPhotoName = 'No file selected';

  readonly form = this.fb.nonNullable.group({
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.minLength(10), Validators.maxLength(15)]],
    photoURL: [''],
  });

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.profile$.subscribe((profile) => {
        if (!profile) return;

        this.currentUid = profile.uid;
        this.form.patchValue({
          email: profile.email,
          displayName: profile.displayName ?? '',
          phone: profile.phone ?? '',
          photoURL: this.normalizePhotoUrl(profile.photoURL),
        });
        this.previewPhotoUrl = this.normalizePhotoUrl(profile.photoURL);
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private async resolveUid(): Promise<string | null> {
    if (this.currentUid) return this.currentUid;
    const uid = await this.authService.getCurrentUidAsync(8000);
    this.currentUid = uid;
    return uid;
  }

  onPhotoUrlChange(value: string): void {
    this.previewPhotoUrl = this.normalizePhotoUrl(value);
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    const uid = await this.resolveUid();
    if (!uid) {
      this.ui.toast('Please login again');
      target.value = '';
      return;
    }

    this.ui.setLoading(true);
    try {
      const dataUrl = await this.authService.uploadProfilePhoto(uid, file);
      this.form.patchValue({ photoURL: dataUrl });
      this.previewPhotoUrl = dataUrl;
      this.selectedPhotoName = file.name;
      this.ui.toast('Photo ready. Click Save Profile to apply.');
      this.cdr.markForCheck();
    } catch (error: any) {
      if (error?.message === 'image-too-large') {
        this.ui.toast('Image too large. Please use photo up to 350KB.');
      } else if (error?.message === 'invalid-image-type') {
        this.ui.toast('Please select an image file');
      } else {
        this.ui.toast('Could not read selected image');
      }
    } finally {
      this.ui.setLoading(false);
      target.value = '';
    }
  }

  async saveProfile(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const uid = await this.resolveUid();
    if (!uid) {
      this.ui.toast('Please login again');
      return;
    }

    const values = this.form.getRawValue();
    const photoURL = this.normalizePhotoUrl(values.photoURL);

    const updates: Partial<UserProfile> = {
      displayName: values.displayName.trim(),
      phone: values.phone.trim(),
      photoURL,
    };

    this.ui.setLoading(true);
    try {
      await this.authService.updateProfile(uid, updates);
      this.ui.toast('Profile updated ✓');
      this.cdr.markForCheck();
    } catch {
      this.ui.toast('Could not update profile');
    } finally {
      this.ui.setLoading(false);
    }
  }

  private normalizePhotoUrl(url: string | undefined): string {
    const value = (url ?? '').trim();
    if (!value) {
      return 'assets/products/Login.png';
    }

    if (value.startsWith('data:image/')) {
      return value;
    }

    const normalized = value
      .replaceAll('\\', '/')
      .replace(/^\.\//, '')
      .replace(/^\//, '')
      .replace(/^src\//, '');

    return normalized.startsWith('assets/') ? normalized : 'assets/products/Login.png';
  }
}