// src/app/shared/components/confirmation-dialog/confirmation-dialog.component.ts
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../core/services/Confirmation Dialog/confirmation.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './confirmation-dialog-component.html',
  styleUrls: ['./confirmation-dialog-component.css'],
  encapsulation: ViewEncapsulation.None 
})
export class ConfirmationDialogComponent {
  confirmationService = inject(ConfirmationService);
  themeService = inject(ThemeService);

  onConfirm(): void {
    this.confirmationService.handleConfirm();
  }

  onCancel(): void {
    this.confirmationService.handleCancel();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  getIcon(): string {
    const config = this.confirmationService.config();
    if (config.icon) return config.icon;

    switch (config.type) {
      case 'danger': return 'delete';
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      case 'info': return 'info';
      default: return 'help';
    }
  }
}
