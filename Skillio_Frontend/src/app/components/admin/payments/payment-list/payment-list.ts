import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { PaymentDTO, PaymentService } from '../../../../core/services/payments/payment-service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './payment-list.html',
  styleUrls: ['./payment-list.css']
})
export class PaymentListComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  public authService = inject(AuthService);

  payments = signal<PaymentDTO[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedPaymentMode = signal('ALL');
  selectedStatus = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');
  public Math = Math;
  currentPage = signal(1);
  itemsPerPage = signal(7);
  isSalesExec = computed(() => this.authService.isSalesExecutive());
  isAdmin = computed(() => this.authService.isAdmin());
  paymentModes = ['ALL', 'CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE'];
  paymentStatuses = ['ALL', 'SUCCESS', 'PENDING', 'FAILED'];

  // ✅ Filtered payments with search
  filteredPayments = computed(() => {
    let filtered = this.payments();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p =>
        p.studentName.toLowerCase().includes(term) ||
        p.receiptNumber.toLowerCase().includes(term) ||
        p.studentEmail.toLowerCase().includes(term) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(term))
      );
    }

    // Payment mode filter
    if (this.selectedPaymentMode() !== 'ALL') {
      filtered = filtered.filter(p => p.paymentMode === this.selectedPaymentMode());
    }

    // Status filter
    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter(p => p.status === this.selectedStatus());
    }

    return filtered;
  });

  // ✅ UPDATED Stats with ALL required fields
  stats = computed(() => {
    const all = this.payments();
    const today = new Date().toISOString().split('T')[0]; // Format: "2026-01-03"

    return {
      total: all.length,
      success: all.filter(p => p.status === 'SUCCESS').length,
      pending: all.filter(p => p.status === 'PENDING').length,
      failed: all.filter(p => p.status === 'FAILED').length,
      totalAmount: all.reduce((sum, p) => sum + p.amount, 0),
      
      // ✅ Today's payments
      todayPayments: all.filter(p => p.paymentDate === today).length,
      todayAmount: all
        .filter(p => p.paymentDate === today)
        .reduce((sum, p) => sum + p.amount, 0),
      
      // ✅ Payment mode counts
      cash: all.filter(p => p.paymentMode === 'CASH').length,
      card: all.filter(p => p.paymentMode === 'CARD').length,
      upi: all.filter(p => p.paymentMode === 'UPI').length,
      netbanking: all.filter(p => p.paymentMode === 'NETBANKING').length,
      cheque: all.filter(p => p.paymentMode === 'CHEQUE').length
    };
  });

  totalItems = computed(() => this.filteredPayments().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  paginatedPayments = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredPayments().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    console.log('🔍 Loading Payments...');
    this.isLoading.set(true);
    this.errorMessage.set('');

    const isSalesExec = this.authService.isSalesExecutive();
    const payments$ = isSalesExec
      ? this.paymentService.getMyPayments()  // ✅ Sales Exec - only their payments
      : this.paymentService.getAllPayments(); // ✅ Admin - all payments

    payments$.subscribe({
      next: (data) => {
        console.log('✅ Payments Loaded:', data);
        this.payments.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error Loading Payments:', error);
        this.errorMessage.set('Failed to load payments');
        this.isLoading.set(false);
      }
    });
  }
 // ✅ Navigate with role-aware routing
  navigateToCreate(): void {
    const basePath = this.isSalesExec() ? '/sales-dashboard' : '/admin-dashboard';
    this.router.navigate([`${basePath}/payments/create`]);
  }



  deletePayment(paymentId: number, studentName: string): void {
    if (!this.isAdmin()) {
      alert('Only admins can delete payments');
      return;
    }

    if (confirm(`Delete payment for ${studentName}?`)) {
      console.log('🗑️ Deleting Payment ID:', paymentId);
      this.paymentService.deletePayment(paymentId).subscribe({
        next: () => {
          console.log('✅ Payment Deleted Successfully');
          this.successMessage.set('Payment deleted successfully!');
          this.loadPayments();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('❌ Error Deleting Payment:', error);
          this.errorMessage.set('Failed to delete payment');
        }
      });
    }
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  updatePaymentMode(value: string): void {
    this.selectedPaymentMode.set(value);
    this.currentPage.set(1);
  }

  updateStatus(value: string): void {
    this.selectedStatus.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changeItemsPerPage(value: string): void {
    this.itemsPerPage.set(Number(value));
    this.currentPage.set(1);
  }

  // ✅ Payment Mode Icon Helper
  getPaymentModeIcon(mode: string): string {
    const icons: { [key: string]: string } = {
      'CASH': 'payments',
      'CARD': 'credit_card',
      'UPI': 'qr_code_scanner',
      'NETBANKING': 'account_balance',
      'CHEQUE': 'receipt'
    };
    return icons[mode] || 'payment';
  }

  // ✅ Payment Mode CSS Class Helper
  getPaymentModeClass(mode: string): string {
    const classes: { [key: string]: string } = {
      'CASH': 'mode-cash',
      'CARD': 'mode-card',
      'UPI': 'mode-upi',
      'NETBANKING': 'mode-netbanking',
      'CHEQUE': 'mode-cheque'
    };
    return classes[mode] || 'mode-default';
  }

  // ✅ Payment Status Helpers
  getPaymentStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'SUCCESS': 'payment-success',
      'PENDING': 'payment-pending',
      'FAILED': 'payment-failed'
    };
    return classes[status] || 'payment-pending';
  }

  getPaymentStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'SUCCESS': 'check_circle',
      'PENDING': 'pending',
      'FAILED': 'cancel'
    };
    return icons[status] || 'pending';
  }
}
