import { Injectable, signal } from '@angular/core';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string; // Material Symbol icon name
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  isVisible = signal(false);
  config = signal<ConfirmationConfig>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    icon: 'warning'
  });

  private resolveFunction?: (value: boolean) => void;

  confirm(config: ConfirmationConfig): Promise<boolean> {
    this.config.set({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'warning',
      ...config
    });
    this.isVisible.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolveFunction = resolve;
    });
  }

  handleConfirm(): void {
    this.isVisible.set(false);
    if (this.resolveFunction) {
      this.resolveFunction(true);
    }
  }

  handleCancel(): void {
    this.isVisible.set(false);
    if (this.resolveFunction) {
      this.resolveFunction(false);
    }
  }
}
