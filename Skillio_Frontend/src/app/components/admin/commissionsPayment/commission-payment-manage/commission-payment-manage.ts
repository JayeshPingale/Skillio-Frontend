// src/app/components/admin/commission-payments/commission-payment-manage/commission-payment-manage.ts

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import {
  CommissionPaymentDTO,
  CommissionPaymentService,
  CreateCommissionPaymentDTO,
  UpdateCommissionPaymentDTO
} from '../../../../core/services/commissionPayment/commissionpayment.service';
import { CommissionDTO, CommissionService } from '../../../../core/services/commission/commission-service';

@Component({
  selector: 'app-commission-payment-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './commission-payment-manage.html',
  styleUrls: ['./commission-payment-manage.css']
})
export class CommissionPaymentManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private commissionPaymentService = inject(CommissionPaymentService);
  private commissionService = inject(CommissionService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  paymentForm!: FormGroup;
  eligibleCommissions = signal<CommissionDTO[]>([]);
  selectedCommission = signal<CommissionDTO | null>(null);
  
  isEditMode = signal(false);
  paymentId = signal<number | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  paymentModes = ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'UPI'];

  ngOnInit(): void {
    this.checkEditMode();
    this.initializeForm();
    if (!this.isEditMode()) {
      this.loadEligibleCommissions();
    }
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.paymentId.set(Number(id));
      this.loadPaymentData(Number(id));
    }
  }

  private initializeForm(): void {
    this.paymentForm = this.fb.group({
      commissionId: [{ value: '', disabled: this.isEditMode() }, [Validators.required]],
      amountPaid: [{ value: 0, disabled: true }], // ✅ Read-only, auto-populated
      paymentDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
      paymentMode: ['BANK_TRANSFER', [Validators.required]],
      transactionId: ['', [Validators.maxLength(100)]],
      remarks: ['', [Validators.maxLength(500)]]
    });

    // ✅ Listen to commission selection (only in create mode)
    if (!this.isEditMode()) {
      this.paymentForm.get('commissionId')?.valueChanges.subscribe((commissionId) => {
        this.onCommissionSelected(commissionId);
      });
    }
  }

  // ✅ Load ONLY ELIGIBLE/APPROVED Commissions
  private loadEligibleCommissions(): void {
    this.isLoading.set(true);
    
    this.commissionService.getCommissionsByStatus('ELIGIBLE').subscribe({
      next: (data) => {
        console.log('✅ Eligible commissions loaded:', data);
        
        // ✅ Additional filter: Only show commissions with eligibleAmount > 0
        const validCommissions = data.filter(c => c.eligibleAmount && c.eligibleAmount > 0);
        
        this.eligibleCommissions.set(validCommissions);
        this.isLoading.set(false);
        
        if (validCommissions.length === 0) {
          this.errorMessage.set('No eligible commissions found. All commissions have been paid or are pending approval.');
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading eligible commissions:', error);
        this.errorMessage.set('Failed to load eligible commissions');
        this.isLoading.set(false);
      }
    });
  }

  private loadPaymentData(id: number): void {
    this.isLoading.set(true);
    
    this.commissionPaymentService.getCommissionPaymentById(id).subscribe({
      next: (data: CommissionPaymentDTO) => {
        console.log('✅ Payment loaded:', data);
        
        // ✅ Load associated commission info
        this.commissionService.getCommissionById(data.commissionId).subscribe({
          next: (commission) => {
            this.selectedCommission.set(commission);
          }
        });
        
        this.paymentForm.patchValue({
          commissionId: data.commissionId,
          amountPaid: data.amountPaid,
          paymentDate: data.paymentDate,
          paymentMode: data.paymentMode,
          transactionId: data.transactionId,
          remarks: data.remarks
        });
        
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error loading payment:', error);
        this.errorMessage.set('Failed to load payment data');
        this.isLoading.set(false);
      }
    });
  }

  private onCommissionSelected(commissionId: number): void {
    const commission = this.eligibleCommissions().find(c => c.commissionId === Number(commissionId));
    
    if (commission) {
      console.log('✅ Commission selected:', commission);
      this.selectedCommission.set(commission);
      
      // ✅ Auto-populate amountPaid with eligibleAmount
      this.paymentForm.patchValue({
        amountPaid: commission.eligibleAmount
      }, { emitEvent: false });
    } else {
      this.selectedCommission.set(null);
      this.paymentForm.patchValue({ amountPaid: 0 }, { emitEvent: false });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.paymentForm.invalid) {
      console.error('❌ Form is invalid', this.paymentForm.value);
      this.paymentForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: this.isEditMode() ? 'Update Commission Payment' : 'Record Commission Payment',
      message: this.isEditMode()
        ? 'Are you sure you want to update this commission payment?'
        : `Are you sure you want to record this payment? The commission will be marked as PAID.`,
      confirmText: this.isEditMode() ? 'Update' : 'Pay Now',
      cancelText: 'Cancel',
      type: 'info',
      icon: this.isEditMode() ? 'edit' : 'payments'
    });

    if (confirmed) {
      if (this.isEditMode()) {
        this.updatePayment();
      } else {
        this.createPayment();
      }
    }
  }

  private createPayment(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formData = this.paymentForm.getRawValue(); // ✅ Get all values including disabled fields

    const request: CreateCommissionPaymentDTO = {
      commissionId: Number(formData.commissionId),
      amountPaid: Number(formData.amountPaid),
      paymentDate: formData.paymentDate,
      paymentMode: formData.paymentMode,
      transactionId: formData.transactionId || undefined,
      remarks: formData.remarks || undefined
    };

    console.log('📤 Creating commission payment:', request);

    this.commissionPaymentService.payCommission(request).subscribe({
      next: (response: CommissionPaymentDTO) => {
        console.log('✅ Commission payment created:', response);
        this.successMessage.set('Commission payment recorded successfully!');
        
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/commission-payments']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('❌ Error creating payment:', error);
        
        if (error.error && error.error.errors) {
          const errors = Object.values(error.error.errors).join(', ');
          this.errorMessage.set(`Validation failed: ${errors}`);
        } else if (error.error && error.error.message) {
          this.errorMessage.set(`Error: ${error.error.message}`);
        } else {
          this.errorMessage.set('Failed to record commission payment. Please try again.');
        }
        
        this.isSubmitting.set(false);
      }
    });
  }

  private updatePayment(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request: UpdateCommissionPaymentDTO = {
      paymentDate: this.paymentForm.get('paymentDate')?.value,
      transactionId: this.paymentForm.get('transactionId')?.value || undefined,
      remarks: this.paymentForm.get('remarks')?.value || undefined
    };

    console.log('📤 Updating commission payment:', request);

    this.commissionPaymentService.updateCommissionPayment(this.paymentId()!, request).subscribe({
      next: (response: CommissionPaymentDTO) => {
        console.log('✅ Commission payment updated:', response);
        this.successMessage.set('Commission payment updated successfully!');
        
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/commission-payments']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('❌ Error updating payment:', error);
        this.errorMessage.set(
          error.error?.message || 'Failed to update commission payment. Please try again.'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  async cancel(): Promise<void> {
    if (this.paymentForm.dirty) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Discard Changes',
        message: 'You have unsaved changes. Are you sure you want to leave without saving?',
        confirmText: 'Discard',
        cancelText: 'Stay',
        type: 'warning',
        icon: 'warning'
      });

      if (confirmed) {
        this.router.navigate(['/admin-dashboard/commission-payments']);
      }
    } else {
      this.router.navigate(['/admin-dashboard/commission-payments']);
    }
  }

  getPaymentModeClass(mode: string): string {
    const classes: { [key: string]: string } = {
      'BANK_TRANSFER': 'mode-bank',
      'CASH': 'mode-cash',
      'CHEQUE': 'mode-cheque',
      'UPI': 'mode-upi'
    };
    return classes[mode] || 'mode-bank';
  }

  getPaymentModeIcon(mode: string): string {
    const icons: { [key: string]: string } = {
      'BANK_TRANSFER': 'account_balance',
      'CASH': 'payments',
      'CHEQUE': 'receipt',
      'UPI': 'qr_code_2'
    };
    return icons[mode] || 'account_balance';
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toFixed(2);
  }
}
