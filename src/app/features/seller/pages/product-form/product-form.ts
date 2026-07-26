import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UiService } from '../../../../shared/services/ui.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-form',
  standalone: false,
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = this.productService.categories;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    category: ['', Validators.required],
    description: ['', Validators.required],
    imageUrl: [
      `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}/assets/products/default-lucide.svg`,
      [Validators.required],
    ],
  });

  productId: string | null = null;
  imagePreview = '';
  selectedFile: File | null = null;

  async ngOnInit(): Promise<void> {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (!this.productId) {
      return;
    }

    const product = await this.productService.getProductSnapshot(this.productId);
    if (!product) {
      return;
    }

    this.form.patchValue({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
    });
    this.imagePreview = product.imageUrl;
  }

  onImagePathChange(path: string): void {
    this.imagePreview = path.trim();
    this.selectedFile = null;
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = String(reader.result ?? '');
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const uid = await this.authService.getCurrentUidAsync(8000);
    if (!uid) {
      this.ui.toast('Please login again to continue');
      return;
    }

    this.ui.setLoading(true);
    try {
      // if a file is selected upload it first
      if (this.selectedFile) {
        const uploaded = await this.productService.uploadImage(this.selectedFile);
        this.form.get('imageUrl')?.setValue(uploaded);
      }

      if (this.productId) {
        await this.productService.updateProduct(this.productId, this.form.getRawValue(), uid);
        this.ui.toast('Product updated');
      } else {
        await this.productService.addProduct(
          {
            ...this.form.getRawValue(),
            sellerId: uid,
          },
        );
        this.ui.toast('Product added');
      }

      await this.router.navigate(['/seller/dashboard']);
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Save failed');
    } finally {
      this.ui.setLoading(false);
    }
  }

  async deleteProduct(): Promise<void> {
    if (!this.productId) {
      return;
    }

    const shouldDelete = window.confirm('Delete this product? This action cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    this.ui.setLoading(true);
    try {
      await this.productService.deleteProduct(this.productId);
      this.ui.toast('Product deleted');
      await this.router.navigate(['/seller/dashboard']);
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Delete failed');
    } finally {
      this.ui.setLoading(false);
    }
  }
}
