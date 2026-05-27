// src/app/components/admin/commission-payments/commission-payment-list/commission-payment-list.ts

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { CommissionPaymentService, CommissionPaymentDTO } from '../../../../core/services/commissionPayment/commissionpayment.service';
import { CommissionDTO, CommissionService } from '../../../../core/services/commission/commission-service';

@Component({
  selector: 'app-commission-payment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './commission-payment-list.html',
  styleUrls: ['./commission-payment-list.css']
})
export class CommissionPaymentListComponent implements OnInit {
  private commissionPaymentService = inject(CommissionPaymentService);
  private commissionService = inject(CommissionService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  payments = signal<CommissionPaymentDTO[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedPaymentMode = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');

  paymentModeOptions = ['ALL', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'UPI'];

  // Filtered payments
  filteredPayments = computed(() => {
    let filtered = this.payments();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p =>
        p.salesExecutiveName.toLowerCase().includes(term) ||
        p.paidByUserName.toLowerCase().includes(term) ||
        p.transactionId?.toLowerCase().includes(term)
      );
    }

    // Payment mode filter
    if (this.selectedPaymentMode() !== 'ALL') {
      filtered = filtered.filter(p => p.paymentMode === this.selectedPaymentMode());
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  // Stats
  stats = computed(() => {
    const all = this.payments();
    const bankTransfer = all.filter(p => p.paymentMode === 'BANK_TRANSFER');
    const cash = all.filter(p => p.paymentMode === 'CASH');
    const cheque = all.filter(p => p.paymentMode === 'CHEQUE');
    const upi = all.filter(p => p.paymentMode === 'UPI');
    
    return {
      total: all.length,
      totalAmount: all.reduce((sum, p) => sum + p.amountPaid, 0),
      bankTransfer: bankTransfer.length,
      bankTransferAmount: bankTransfer.reduce((sum, p) => sum + p.amountPaid, 0),
      cash: cash.length,
      cashAmount: cash.reduce((sum, p) => sum + p.amountPaid, 0),
      cheque: cheque.length,
      chequeAmount: cheque.reduce((sum, p) => sum + p.amountPaid, 0),
      upi: upi.length,
      upiAmount: upi.reduce((sum, p) => sum + p.amountPaid, 0)
    };
  });

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      paymentRecords: this.commissionPaymentService.getAllCommissionPayments(),
      paidCommissions: this.commissionService.getCommissionsByStatus('PAID')
    }).subscribe({
      next: ({ paymentRecords, paidCommissions }) => {
        this.payments.set(this.mergePaymentSources(paymentRecords, paidCommissions));
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading commission payments:', error);
        this.errorMessage.set('Failed to load commission payments');
        this.isLoading.set(false);
      }
    });
  }

  private mergePaymentSources(
    paymentRecords: CommissionPaymentDTO[],
    paidCommissions: CommissionDTO[]
  ): CommissionPaymentDTO[] {
    const paymentsByCommissionId = new Map(
      paymentRecords.map(payment => [payment.commissionId, payment])
    );

    const fallbackPayments = paidCommissions
      .filter(commission => !paymentsByCommissionId.has(commission.commissionId))
      .map((commission): CommissionPaymentDTO => ({
        commissionPaymentId: -commission.commissionId,
        commissionId: commission.commissionId,
        salesExecutiveId: commission.salesExecutiveId,
        salesExecutiveName: commission.salesExecutiveName,
        salesExecutiveEmail: '',
        amountPaid: commission.eligibleAmount || 0,
        paymentMode: 'STATUS_UPDATE',
        paymentDate: commission.paidDate || commission.updatedAt,
        transactionId: '',
        paidByUserId: 0,
        paidByUserName: 'System / Legacy',
        remarks: commission.adminComments || commission.remarks || 'Marked as paid from commission status',
        createdAt: commission.updatedAt || commission.createdAt,
        updatedAt: commission.updatedAt
      }));

    return [...paymentRecords, ...fallbackPayments];
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin-dashboard/commission-payments/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/admin-dashboard/commission-payments/edit', id]);
  }

  deletePayment(id: number, salesExecutiveName: string): void {
    if (confirm(`Delete commission payment for "${salesExecutiveName}"? This will revert the commission to ELIGIBLE status.`)) {
      this.commissionPaymentService.deleteCommissionPayment(id).subscribe({
        next: () => {
          this.successMessage.set('Commission payment deleted successfully!');
          this.loadPayments();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error: any) => {
          console.error('Error deleting payment:', error);
          this.errorMessage.set('Failed to delete commission payment');
        }
      });
    }
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updatePaymentMode(value: string): void {
    this.selectedPaymentMode.set(value);
  }

  getPaymentModeClass(mode: string): string {
    const classes: { [key: string]: string } = {
      'BANK_TRANSFER': 'mode-bank',
      'CASH': 'mode-cash',
      'CHEQUE': 'mode-cheque',
      'UPI': 'mode-upi',
      'STATUS_UPDATE': 'mode-status-update'
    };
    return classes[mode] || 'mode-bank';
  }

  getPaymentModeIcon(mode: string): string {
    const icons: { [key: string]: string } = {
      'BANK_TRANSFER': 'account_balance',
      'CASH': 'payments',
      'CHEQUE': 'receipt',
      'UPI': 'qr_code_2',
      'STATUS_UPDATE': 'published_with_changes'
    };
    return icons[mode] || 'account_balance';
  }

  isSyntheticPayment(payment: CommissionPaymentDTO): boolean {
    return payment.commissionPaymentId < 0;
  }
}
