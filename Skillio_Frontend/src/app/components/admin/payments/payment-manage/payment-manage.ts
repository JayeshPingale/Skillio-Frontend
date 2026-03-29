import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
// ✅ UPDATED IMPORT - Use PaymentDTO instead of PaymentResponse
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { CreatePaymentRequest, PaymentDTO, PaymentService } from '../../../../core/services/payments/payment-service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-payment-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './payment-manage.html',
  styleUrls: ['./payment-manage.css']
})
export class PaymentManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private paymentService = inject(PaymentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);

  paymentForm!: FormGroup;
  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  
  // Query params from Student Fees page
  feesId = signal<number | null>(null);
  studentName = signal<string>('');
  balanceAmount = signal<number>(0);
  
  // ✅ Payment History - Use PaymentDTO
  paymentHistory = signal<PaymentDTO[]>([]);
  isLoadingHistory = signal(false);

  paymentModes = ['CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE'];

  ngOnInit(): void {
    console.log('🚀 PaymentManageComponent Initialized');
    
    // Initialize form
    this.initializeForm();
    
    // Get query params from Student Fees page
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query Params Received:', params);
      
      if (params['feesId']) {
        this.feesId.set(+params['feesId']);
        this.studentName.set(params['studentName'] || 'Unknown Student');
        this.balanceAmount.set(+params['balanceAmount'] || 0);
        
        // Pre-fill form with balance amount
        this.paymentForm.patchValue({
          feesId: this.feesId(),
          amount: this.balanceAmount()
        });
        
        // Load payment history for this fees
        this.loadPaymentHistory(this.feesId()!);
      }
    });
  }

  initializeForm(): void {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    this.paymentForm = this.fb.group({
      feesId: [null, [Validators.required]],
      amount: [null, [Validators.required, Validators.min(1)]],
      paymentMode: ['CASH', [Validators.required]],
      paymentDate: [today, [Validators.required]],
      transactionId: [''], // Optional
      remarks: [''] // Optional
    });
    
    console.log('✅ Payment Form Initialized with values:', this.paymentForm.value);
  }

  loadPaymentHistory(feesId: number): void {
    console.log('🔍 Loading Payment History for Fees ID:', feesId);
    this.isLoadingHistory.set(true);
    
    this.paymentService.getPaymentsByStudentFees(feesId).subscribe({
      next: (data) => {
        console.log('✅ Payment History Loaded:', data);
        this.paymentHistory.set(data);
        this.isLoadingHistory.set(false);
      },
      error: (error) => {
        console.error('❌ Error Loading Payment History:', error);
        this.errorMessage.set('Failed to load payment history');
        this.isLoadingHistory.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      console.warn('⚠️ Form Invalid:', this.paymentForm.value);
      this.errorMessage.set('Please fill all required fields');
      Object.keys(this.paymentForm.controls).forEach(key => {
        this.paymentForm.get(key)?.markAsTouched();
      });
      return;
    }

    console.log('💳 Submitting Payment:', this.paymentForm.value);
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const paymentRequest: CreatePaymentRequest = this.paymentForm.value;

    this.paymentService.createPayment(paymentRequest).subscribe({
      next: (response) => {
        console.log('✅ Payment Created Successfully:', response);
        this.successMessage.set(`Payment recorded successfully! Receipt: ${response.receiptNumber}`);
        this.isLoading.set(false);
        
        // Reload payment history to show new payment
        this.loadPaymentHistory(this.feesId()!);
        
        // Calculate new balance
        const newBalance = this.balanceAmount() - response.amount;
        this.balanceAmount.set(newBalance);
        
        // Reset form but keep feesId and paymentMode
        this.paymentForm.reset({
          feesId: this.feesId(),
          paymentMode: 'CASH',
          paymentDate: new Date().toISOString().split('T')[0],
          amount: newBalance > 0 ? newBalance : null // Auto-fill remaining balance
        });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage.set('');
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Payment Creation Failed:', error);
        this.errorMessage.set(error.error?.message || 'Failed to record payment. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  cancel(): void {
    // Navigate back to student fees list
    const defaultReturnUrl = this.authService.isSalesExecutive()
      ? '/sales-dashboard/student-fees'
      : '/admin-dashboard/student-fees';
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || defaultReturnUrl;
    this.router.navigate([returnUrl]);
  }

  calculateTotalPaid(): number {
    return this.paymentHistory().reduce((sum, payment) => sum + payment.amount, 0);
  }

  getPaymentStatusBadge(status: string): string {
    const badges: { [key: string]: string } = {
      'SUCCESS': 'badge-success',
      'PENDING': 'badge-pending',
      'FAILED': 'badge-failed'
    };
    return badges[status] || 'badge-pending';
  }

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
}
