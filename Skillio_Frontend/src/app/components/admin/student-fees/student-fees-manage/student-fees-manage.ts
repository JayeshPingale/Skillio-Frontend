import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CreateStudentFeesRequest,
  StudentFeesResponse,
  StudentFeesService,
  UpdateStudentFeesRequest,
} from '../../../../core/services/student-fees/student-fees.service';
import {
  EnrollmentResponse,
  EnrollmentService,
} from '../../../../core/services/enrollment/enrollment.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-student-fees-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './student-fees-manage.html',
  styleUrls: ['./student-fees-manage.css'],
})
export class StudentFeesManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private studentFeesService = inject(StudentFeesService);
  private enrollmentService = inject(EnrollmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);

  feesForm!: FormGroup;
  feesId = signal<number | null>(null);
  currentFees = signal<StudentFeesResponse | null>(null);
  enrollments = signal<EnrollmentResponse[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  isEditMode = signal(false);

  paymentStatuses = ['PENDING', 'PARTIAL', 'COMPLETED'];

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
    this.loadEnrollments();
  }

  private getStudentFeesListRoute(): string {
    return this.authService.isSalesExecutive() ? '/sales-dashboard/student-fees' : '/admin-dashboard/student-fees';
  }

  private initializeForm(): void {
    this.feesForm = this.fb.group({
      enrollmentId: ['', [Validators.required]],
      totalFees: [0, [Validators.required, Validators.min(0)]],
      amountPaid: [0, [Validators.required, Validators.min(0)]],
      paymentStatus: ['PENDING', [Validators.required]],
      dueDate: ['', [Validators.required]],
      remarks: ['', [Validators.maxLength(500)]],
    });

    // Auto-calc payment status
    this.feesForm.get('amountPaid')?.valueChanges.subscribe(() => {
      this.autoCalculatePaymentStatus();
    });

    this.feesForm.get('totalFees')?.valueChanges.subscribe(() => {
      this.autoCalculatePaymentStatus();
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // Edit mode
      this.isEditMode.set(true);
      this.feesId.set(Number(id));
      this.loadFeesDetails();
    } else {
      // Create mode - default due date +30 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      this.feesForm.patchValue({
        dueDate: futureDate.toISOString().split('T')[0],
      });
    }
  }

  private loadFeesDetails(): void {
    this.isLoading.set(true);

    this.studentFeesService.getStudentFeesById(this.feesId()!).subscribe({
      next: (fees) => {
        this.currentFees.set(fees);
        this.populateForm(fees);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading fees:', error);
        this.errorMessage.set('Failed to load fees details');
        this.isLoading.set(false);
      },
    });
  }

  private loadEnrollments(): void {
    const enrollments$ = this.authService.isSalesExecutive()
      ? this.enrollmentService.getMyEnrollments()
      : this.enrollmentService.getAllEnrollments();

    enrollments$.subscribe({
      next: (data) => {
        // ✅ Filter only ACTIVE enrollments based on `status`
        const activeEnrollments = data.filter((e) => e.status === 'ACTIVE');
        this.enrollments.set(activeEnrollments);
      },
      error: (error) => {
        console.error('Error loading enrollments:', error);
      },
    });
  }

  private populateForm(fees: StudentFeesResponse): void {
    this.feesForm.patchValue({
      enrollmentId: fees.enrollmentId,
      totalFees: fees.totalFees,
      amountPaid: fees.paidAmount,
      paymentStatus: fees.paymentStatus,
      dueDate: fees.dueDate,
      remarks: fees.remarks,
    });
  }

  private autoCalculatePaymentStatus(): void {
    const totalFees = this.feesForm.get('totalFees')?.value || 0;
    const amountPaid = this.feesForm.get('amountPaid')?.value || 0;

    if (amountPaid === 0) {
      this.feesForm.patchValue(
        { paymentStatus: 'PENDING' },
        { emitEvent: false },
      );
    } else if (amountPaid >= totalFees) {
      this.feesForm.patchValue(
        { paymentStatus: 'COMPLETED' },
        { emitEvent: false },
      );
    } else if (amountPaid > 0 && amountPaid < totalFees) {
      this.feesForm.patchValue(
        { paymentStatus: 'PARTIAL' },
        { emitEvent: false },
      );
    }
  }

  onSubmit(): void {
    if (this.feesForm.invalid) {
      this.feesForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    const totalFees = this.feesForm.get('totalFees')?.value;
    const amountPaid = this.feesForm.get('amountPaid')?.value;

    if (amountPaid > totalFees) {
      this.errorMessage.set('Amount paid cannot exceed total fees');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    if (this.isEditMode()) {
      this.updateFees();
    } else {
      this.createFees();
    }
  }

  private createFees(): void {
    const request: CreateStudentFeesRequest = {
      enrollmentId: Number(this.feesForm.get('enrollmentId')?.value),
      totalFees: Number(this.feesForm.get('totalFees')?.value),
      amountPaid: Number(this.feesForm.get('amountPaid')?.value),
      paymentStatus: this.feesForm.get('paymentStatus')?.value,
      dueDate: this.feesForm.get('dueDate')?.value,
      remarks: this.feesForm.get('remarks')?.value || '',
    };

    this.studentFeesService.createStudentFees(request).subscribe({
      next: (response) => {
        console.log('Fees created:', response);
        this.successMessage.set('Fees record created successfully!');
        this.isSubmitting.set(false);
        setTimeout(() => {
          this.router.navigate([this.getStudentFeesListRoute()]);
        }, 1500);
      },
      error: (error) => {
        console.error('Error creating fees:', error);
        this.errorMessage.set(
          error.error?.message ||
            'Failed to create fees record. Please try again.',
        );
        this.isSubmitting.set(false);
      },
    });
  }

 private updateFees(): void {
  const request: UpdateStudentFeesRequest = {
    totalFees: Number(this.feesForm.get('totalFees')?.value),
    paidAmount: Number(this.feesForm.get('amountPaid')?.value),  // ✅ This sends to backend
    paymentStatus: this.feesForm.get('paymentStatus')?.value,
    dueDate: this.feesForm.get('dueDate')?.value,
    remarks: this.feesForm.get('remarks')?.value || '',
  };

  this.studentFeesService.updateStudentFees(this.feesId()!, request).subscribe({
    next: (response) => {
      console.log('Fees updated:', response);
      this.successMessage.set('Fees record updated successfully!');
      this.isSubmitting.set(false);
      setTimeout(() => {
        this.router.navigate([this.getStudentFeesListRoute()]);
      }, 1500);
    },
    error: (error) => {
      console.error('Error updating fees:', error);
      this.errorMessage.set(
        error.error?.message ||
          'Failed to update fees record. Please try again.',
      );
      this.isSubmitting.set(false);
    },
  });
}


  cancel(): void {
    this.router.navigate([this.getStudentFeesListRoute()]);
  }

  calculateBalance(): number {
    const totalFees = this.feesForm.get('totalFees')?.value || 0;
    const amountPaid = this.feesForm.get('amountPaid')?.value || 0;
    return totalFees - amountPaid;
  }

  calculatePercentagePaid(): number {
    const totalFees = this.feesForm.get('totalFees')?.value || 0;
    const amountPaid = this.feesForm.get('amountPaid')?.value || 0;
    if (totalFees === 0) return 0;
    return Math.round((amountPaid / totalFees) * 100);
  }

  getPaymentStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      PENDING: 'pending',
      PARTIAL: 'payments',
      COMPLETED: 'check_circle',
    };
    return icons[status] || 'pending';
  }

  getPaymentStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      PENDING: 'payment-pending',
      PARTIAL: 'payment-partial',
      COMPLETED: 'payment-completed',
    };
    return classes[status] || 'payment-pending';
  }
}
