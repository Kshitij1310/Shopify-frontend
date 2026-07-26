import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { LucideAngularModule } from 'lucide-angular';
import {
  BadgeCheck,
  ArrowDownToLine,
  Check,
  ChevronRight,
  CircleAlert,
  CreditCard,
  FileText,
  Heart,
  HeartPlus,
  Lock,
  Minus,
  LayoutGrid,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trash2,
  Wallet,
  X,
} from 'lucide-angular/src/icons';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatPaginatorModule,
    LucideAngularModule.pick({
      BadgeCheck,
      ArrowDownToLine,
      Check,
      ChevronRight,
      CircleAlert,
      CreditCard,
      FileText,
      Heart,
      HeartPlus,
      Lock,
      Minus,
      LayoutGrid,
      Plus,
      QrCode,
      Search,
      ShoppingBag,
      ShoppingCart,
      Tag,
      Trash2,
      Wallet,
      X,
    }),
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatPaginatorModule,
    LucideAngularModule,
  ],
})
export class SharedModule {}
