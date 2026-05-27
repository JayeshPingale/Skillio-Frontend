import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { StudentFeesResponse, StudentFeesService } from '../../../../core/services/student-fees/student-fees.service';
import { CreatePaymentInstallmentDTO, PaymentInstallmentDTO, PaymentInstallmentService, UpdatePaymentInstallmentDTO } from '../../../../core/services/payments-Installment/payment-installment-service';

@Component({
  selector: 'app-payment-installment-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './payment-installment-manage.html',
  styleUrls: ['./payment-installment-manage.css']
})
export class PaymentInstallmentManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private installmentService = inject(PaymentInstallmentService);
  private studentFeesService = inject(StudentFeesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  installmentForm!: FormGroup;
  studentFees = signal<StudentFeesResponse[]>([]);
  selectedFees = signal<StudentFeesResponse | null>(null);
  isEditMode = signal(false);
  installmentId = signal<number | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  statusOptions = ['PENDING', 'PAID', 'OVERDUE'];

  ngOnInit(): void {
    this.checkEditMode();
    this.initializeForm();
    this.loadStudentFees();
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.installmentId.set(Number(id));
      this.loadInstallmentData(Number(id));
    }
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.installmentForm = this.fb.group({
      feesId: [{ value: '', disabled: this.isEditMode() }, [Validators.required]],
      installmentNumber: [{ value: 1, disabled: this.isEditMode() }, [Validators.required, Validators.min(1)]],
      installmentAmount: [0, [Validators.required, Validators.min(1)]],
      dueDate: [today, [Validators.required]],
      paymentStatus: ['PENDING', [Validators.required]]
    });

    // Listen to fees selection (only in create mode)
    if (!this.isEditMode()) {
      this.installmentForm.get('feesId')?.valueChanges.subscribe((feesId) => {
        this.onFeesSelected(feesId);
      });
    }
  }

  private loadStudentFees(): void {
    this.isLoading.set(true);
    
    this.studentFeesService.getAllStudentFees().subscribe({
      next: (data) => {
        // Filter only fees that are not fully completed
        const unpaidFees = data.filter(f => f.paymentStatus !== 'COMPLETED');
        this.studentFees.set(unpaidFees);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading student fees:', error);
        this.errorMessage.set('Failed to load student fees');
        this.isLoading.set(false);
      }
    });
  }

  private loadInstallmentData(id: number): void {
    this.isLoading.set(true);

    this.installmentService.getInstallmentById(id).subscribe({
      next: (data: PaymentInstallmentDTO) => {
        this.installmentForm.patchValue({
          feesId: data.feesId,
          installmentNumber: data.installmentNumber,
          installmentAmount: data.installmentAmount,
          dueDate: data.dueDate,
          paymentStatus: data.paymentStatus
        });
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading installment:', error);
        this.errorMessage.set('Failed to load installment data');
        this.isLoading.set(false);
      }
    });
  }

  private onFeesSelected(feesId: number): void {
    const fees = this.studentFees().find(f => f.feesId === Number(feesId));
    
    if (fees) {
      this.selectedFees.set(fees);
      // Suggest amount based on balance
      const suggestedAmount = fees.balanceAmount;
      this.installmentForm.patchValue({
        installmentAmount: suggestedAmount
      });
    } else {
      this.selectedFees.set(null);
    }
  }

  onSubmit(): void {
    if (this.installmentForm.invalid) {
      this.installmentForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    if (this.isEditMode()) {
      this.updateInstallment();
    } else {
      this.createInstallment();
    }
  }

  private createInstallment(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request: CreatePaymentInstallmentDTO = {
      feesId: Number(this.installmentForm.get('feesId')?.value),
      installmentNumber: Number(this.installmentForm.get('installmentNumber')?.value),
      installmentAmount: Number(this.installmentForm.get('installmentAmount')?.value),
      dueDate: this.installmentForm.get('dueDate')?.value
    };

    this.installmentService.createInstallment(request).subscribe({
      next: (response: PaymentInstallmentDTO) => {
        console.log('Installment created:', response);
        this.successMessage.set('Installment created successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/payment-installments']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error creating installment:', error);
        this.errorMessage.set(
          error.error?.message || 'Failed to create installment. Please try again.'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  private updateInstallment(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request: UpdatePaymentInstallmentDTO = {
      installmentAmount: Number(this.installmentForm.get('installmentAmount')?.value),
      dueDate: this.installmentForm.get('dueDate')?.value,
      paymentStatus: this.installmentForm.get('paymentStatus')?.value
    };

    this.installmentService.updateInstallment(this.installmentId()!, request).subscribe({
      next: (response: PaymentInstallmentDTO) => {
        console.log('Installment updated:', response);
        this.successMessage.set('Installment updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/payment-installments']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error updating installment:', error);
        this.errorMessage.set(
          error.error?.message || 'Failed to update installment. Please try again.'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/payment-installments']);
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'PENDING': 'status-pending',
      'PAID': 'status-paid',
      'OVERDUE': 'status-overdue'
    };
    return classes[status] || 'status-pending';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'PENDING': 'pending',
      'PAID': 'check_circle',
      'OVERDUE': 'error'
    };
    return icons[status] || 'pending';
  }
}
