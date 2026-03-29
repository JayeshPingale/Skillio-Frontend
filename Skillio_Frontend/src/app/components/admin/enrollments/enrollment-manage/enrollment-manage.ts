import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import {
  CreateEnrollmentFromLeadRequest,
  EnrollmentResponse,
  EnrollmentService,
  UpdateEnrollmentRequest
} from '../../../../core/services/enrollment/enrollment.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import {
  BatchResponse,
  BatchService
} from '../../../../core/services/batches/batch.service';
import {
  StudentResponse,
  StudentService
} from '../../../../core/services/student/student-service';
import { LeadResponse, LeadService } from '../../../../core/services/lead/lead.service';
import { CourseResponse, CourseService } from '../../../../core/services/courses/course.service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-enrollment-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './enrollment-manage.html',
  styleUrls: ['./enrollment-manage.css']
})
export class EnrollmentManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private enrollmentService = inject(EnrollmentService);
  private studentService = inject(StudentService);
  private batchService = inject(BatchService);
  private leadService = inject(LeadService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  private courseService = inject(CourseService);
  private authService = inject(AuthService); // ✅ ADD
  enrollmentForm!: FormGroup;
  enrollmentId = signal<number | null>(null);
  currentEnrollment = signal<EnrollmentResponse | null>(null);
isAdmin = signal(false);
  isSalesExec = signal(false);
  courses = signal<CourseResponse[]>([]);
  students = signal<StudentResponse[]>([]);
  batches = signal<BatchResponse[]>([]);
  leads = signal<LeadResponse[]>([]);

  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  isEditMode = signal(false);

  leadIdFromRoute: number | null = null;

  statusOptions: Array<'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'> = [
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD'
  ];

  // Discount type toggle
  discountType = signal<'PERCENTAGE' | 'AMOUNT' | null>(null);

  ngOnInit(): void {
    // ✅ ADD: Set user role
    this.isAdmin.set(this.authService.isAdmin());
    this.isSalesExec.set(this.authService.isSalesExecutive());

    const leadIdParam = this.route.snapshot.queryParamMap.get('leadId');
    this.leadIdFromRoute = leadIdParam ? Number(leadIdParam) : null;
    
    this.initializeForm();
    this.checkEditMode();
    this.loadLeads();
    this.loadStudents();
    this.loadBatches();
    this.loadCourses();
    this.handleBatchChangeForCourse();
    this.setupDiscountWatchers();
  }

  private loadCourses(): void {
    this.courseService.getAllCourses().subscribe({
      next: (data) => this.courses.set(data),
      error: (err) => console.error('Error loading courses:', err)
    });
  }

  private initializeForm(): void {
    this.enrollmentForm = this.fb.group({
      leadId: [this.leadIdFromRoute || null],
      studentId: [null],
      batchId: ['', [Validators.required]],
      courseId: ['', [Validators.required]],
      enrollmentDate: ['', [Validators.required]],
      totalCourseFees: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', [Validators.required]],
      
      // Discount fields
      discountPercentage: [null, [Validators.min(0), Validators.max(50)]],
      discountAmount: [null, [Validators.min(0), Validators.max(25000)]],
      discountReason: [''],
      
      remarks: ['']
    }, {
      validators: [this.discountValidator()]
    });
  }

  // Custom validator for discount
  private discountValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const percentage = control.get('discountPercentage')?.value;
      const amount = control.get('discountAmount')?.value;
      const reason = control.get('discountReason')?.value;
      const totalFees = control.get('totalCourseFees')?.value;

      const hasDiscount = (percentage && percentage > 0) || (amount && amount > 0);

      if (hasDiscount) {
        // Reason mandatory
        if (!reason || reason.trim() === '') {
          return { discountReasonRequired: true };
        }

        // Check amount doesn't exceed total fees
        if (amount && amount > totalFees) {
          return { discountExceedsFees: true };
        }
      }

      return null;
    };
  }

  private setupDiscountWatchers(): void {
    // When percentage is entered, clear amount
    this.enrollmentForm.get('discountPercentage')?.valueChanges.subscribe(val => {
      if (val && val > 0) {
        this.discountType.set('PERCENTAGE');
        this.enrollmentForm.patchValue({ discountAmount: null }, { emitEvent: false });
      } else if (!val || val === 0) {
        const amount = this.enrollmentForm.get('discountAmount')?.value;
        if (!amount || amount === 0) {
          this.discountType.set(null);
        }
      }
    });

    // When amount is entered, clear percentage
    this.enrollmentForm.get('discountAmount')?.valueChanges.subscribe(val => {
      if (val && val > 0) {
        this.discountType.set('AMOUNT');
        this.enrollmentForm.patchValue({ discountPercentage: null }, { emitEvent: false });
      } else if (!val || val === 0) {
        const percentage = this.enrollmentForm.get('discountPercentage')?.value;
        if (!percentage || percentage === 0) {
          this.discountType.set(null);
        }
      }
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.enrollmentId.set(Number(id));
      this.loadEnrollmentDetails();
    } else {
      const today = new Date().toISOString().split('T')[0];
      this.enrollmentForm.patchValue({
        enrollmentDate: today
      });
    }
  }

  private loadEnrollmentDetails(): void {
    this.isLoading.set(true);

    this.enrollmentService.getEnrollmentById(this.enrollmentId()!).subscribe({
      next: (enrollment) => {
        this.currentEnrollment.set(enrollment);
        this.populateForm(enrollment);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading enrollment:', error);
        this.errorMessage.set('Failed to load enrollment details');
        this.isLoading.set(false);
      }
    });
  }

private loadLeads(): void {
  if (this.isSalesExec()) {
    // ✅ Sales Executive: sirf apne assigned leads
    this.leadService.getMyLeads().subscribe({
      next: (data) => {
        // Sirf non-converted leads dikhao
        const nonConverted = data.filter(l => l.status !== 'CONVERTED' && l.status !== 'LOST');
        this.leads.set(nonConverted);
        console.log('✅ My leads loaded:', nonConverted.length);
      },
      error: (error) => console.error('Error loading my leads:', error)
    });
  } else {
    // ✅ Admin: saare non-converted leads
    this.leadService.getNonConvertedLeads().subscribe({
      next: (data) => {
        this.leads.set(data);
        console.log('✅ All non-converted leads loaded:', data.length);
      },
      error: (error) => console.error('Error loading non-converted leads:', error)
    });
  }
}



  private loadStudents(): void {
    this.studentService.getAllStudents().subscribe({
      next: (data) => this.students.set(data),
      error: (error) => console.error('Error loading students:', error)
    });
  }

  private loadBatches(): void {
    this.batchService.getAllBatches().subscribe({
      next: (data) => this.batches.set(data),
      error: (error) => console.error('Error loading batches:', error)
    });
  }

  private handleBatchChangeForCourse(): void {
    const batchCtrl = this.enrollmentForm.get('batchId');
    if (!batchCtrl) return;

    batchCtrl.valueChanges.subscribe((batchId) => {
      if (!batchId) {
        this.enrollmentForm.patchValue(
          { courseId: '', totalCourseFees: 0 },
          { emitEvent: false }
        );
        return;
      }

      const batch = this.batches().find((b) => b.batchId === Number(batchId));
      if (!batch) {
        this.enrollmentForm.patchValue(
          { courseId: '', totalCourseFees: 0 },
          { emitEvent: false }
        );
        return;
      }

      const courseId = (batch as any).courseId;
      if (!courseId) {
        this.enrollmentForm.patchValue(
          { courseId: '', totalCourseFees: 0 },
          { emitEvent: false }
        );
        return;
      }

      this.enrollmentForm.patchValue(
        { courseId: courseId },
        { emitEvent: false }
      );

      const localCourse = this.courses().find(c => c.courseId === courseId);
      if (localCourse) {
        this.enrollmentForm.patchValue(
          { totalCourseFees: localCourse.totalFees },
          { emitEvent: false }
        );
        return;
      }

      this.courseService.getCourseById(courseId).subscribe({
        next: (course) => {
          this.enrollmentForm.patchValue(
            { totalCourseFees: course.totalFees },
            { emitEvent: false }
          );
        },
        error: (err) => {
          console.error('Error loading course for batch:', err);
          this.enrollmentForm.patchValue(
            { totalCourseFees: 0 },
            { emitEvent: false }
          );
        }
      });
    });
  }

  private populateForm(enrollment: EnrollmentResponse): void {
    this.enrollmentForm.patchValue({
      studentId: enrollment.studentId,
      batchId: enrollment.batchId,
      courseId: enrollment.courseId,
      enrollmentDate: enrollment.enrollmentDate,
      totalCourseFees: enrollment.totalCourseFees,
      status: enrollment.status,
      discountPercentage: enrollment.discountPercentage,
      discountAmount: enrollment.discountAmount,
      discountReason: enrollment.discountReason,
      remarks: enrollment.remarks
    });

    // Set discount type based on loaded data
    if (enrollment.discountPercentage && enrollment.discountPercentage > 0) {
      this.discountType.set('PERCENTAGE');
    } else if (enrollment.discountAmount && enrollment.discountAmount > 0) {
      this.discountType.set('AMOUNT');
    }
  }

  onSubmit(): void {
    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      
      if (this.enrollmentForm.hasError('discountReasonRequired')) {
        this.errorMessage.set('Discount reason is required when discount is applied');
      } else if (this.enrollmentForm.hasError('discountExceedsFees')) {
        this.errorMessage.set('Discount amount cannot exceed total course fees');
      } else {
        this.errorMessage.set('Please fill all required fields correctly');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    if (this.isEditMode()) {
      this.updateEnrollment();
    } else {
      this.createEnrollmentFromLead();
    }
  }

  // private createEnrollmentFromLead(): void {
  //   const formValue = this.enrollmentForm.value;
  //   const leadId = formValue.leadId || this.leadIdFromRoute;

  //   if (!leadId) {
  //     this.showError('Validation Error', 'Please select a lead');
  //     this.isSubmitting.set(false);
  //     return;
  //   }

  //   const request: CreateEnrollmentFromLeadRequest = {
  //     leadId: leadId,
  //     batchId: Number(formValue.batchId),
  //     courseId: Number(formValue.courseId),
  //     enrollmentDate: formValue.enrollmentDate,
  //     totalCourseFees: Number(formValue.totalCourseFees),
  //     discountPercentage: formValue.discountPercentage || null,
  //     discountAmount: formValue.discountAmount || null,
  //     discountReason: formValue.discountReason || null,
  //     remarks: formValue.remarks
  //   };

  //   this.enrollmentService.convertLeadAndEnroll(request).subscribe({
  //     next: (res) => {
  //       this.isSubmitting.set(false);

  //       this.confirmationService.confirm({
  //         title: 'Enrollment Created',
  //         message: 'Enrollment created successfully. Redirecting to student information.',
  //         type: 'success',
  //         confirmText: 'OK',
  //         cancelText: 'Stay'
  //       }).then((confirmed) => {
  //         if (confirmed) {
  //           this.router.navigate(['/admin-dashboard/students/edit', res.studentId]);
  //         }
  //       });
  //     },
  //     error: (error) => {
  //       console.error('Error converting lead / creating enrollment:', error);
  //       this.isSubmitting.set(false);

  //       this.showError(
  //         'Enrollment Failed',
  //         error.error?.message ||
  //           'Failed to convert lead and create enrollment. Please try again.'
  //       );
  //     }
  //   });
  // }
  private createEnrollmentFromLead(): void {
    const formValue = this.enrollmentForm.value;
    const leadId = formValue.leadId || this.leadIdFromRoute;

    if (!leadId) {
      this.showError('Validation Error', 'Please select a lead');
      this.isSubmitting.set(false);
      return;
    }

    const request: CreateEnrollmentFromLeadRequest = {
      leadId: leadId,
      batchId: Number(formValue.batchId),
      courseId: Number(formValue.courseId),
      enrollmentDate: formValue.enrollmentDate,
      totalCourseFees: Number(formValue.totalCourseFees),
      discountPercentage: formValue.discountPercentage || null,
      discountAmount: formValue.discountAmount || null,
      discountReason: formValue.discountReason || null,
      remarks: formValue.remarks
    };

    this.enrollmentService.convertLeadAndEnroll(request).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Enrollment Created',
          message: 'Enrollment created successfully. Do you want to update student information?',
          type: 'success',
          confirmText: 'Update Student',
          cancelText: 'View Enrollments'
        }).then((confirmed) => {
          if (confirmed) {
            // ✅ Dynamic navigation based on role
            const basePath = this.isSalesExec() ? '/sales-dashboard' : '/admin-dashboard';
            this.router.navigate([`${basePath}/students/edit`, res.studentId]);
          } else {
            this.navigateToEnrollmentsList();
          }
        });
      },
      error: (error: any) => {
        console.error('Error converting lead & creating enrollment:', error);
        this.isSubmitting.set(false);
        this.showError(
          'Enrollment Failed',
          error.error?.message || 'Failed to convert lead and create enrollment. Please try again.'
        );
      }
    });
  }

  // private updateEnrollment(): void {
  //   const formValue = this.enrollmentForm.value;

  //   const request: UpdateEnrollmentRequest = {
  //     totalCourseFees: Number(formValue.totalCourseFees),
  //     status: formValue.status,
  //     discountPercentage: formValue.discountPercentage || null,
  //     discountAmount: formValue.discountAmount || null,
  //     discountReason: formValue.discountReason || null,
  //     remarks: formValue.remarks
  //   };

  //   this.enrollmentService.updateEnrollment(this.enrollmentId()!, request).subscribe({
  //     next: () => {
  //       this.isSubmitting.set(false);

  //       this.confirmationService.confirm({
  //         title: 'Enrollment Updated',
  //         message: 'Enrollment updated successfully.',
  //         type: 'success',
  //         confirmText: 'Back to List',
  //         cancelText: 'Stay'
  //       }).then((confirmed) => {
  //         if (confirmed) {
  //           this.router.navigate(['/admin-dashboard/enrollments']);
  //         }
  //       });
  //     },
  //     error: (error) => {
  //       console.error('Error updating enrollment:', error);
  //       this.isSubmitting.set(false);

  //       this.showError(
  //         'Update Failed',
  //         error.error?.message || 'Failed to update enrollment. Please try again.'
  //       );
  //     }
  //   });
  // }

  //  private updateEnrollment(): void {
  //   const formValue = this.enrollmentForm.value;

  //   const request: UpdateEnrollmentRequest = {
  //     totalCourseFees: Number(formValue.totalCourseFees),
  //     status: formValue.status,
  //     discountPercentage: formValue.discountPercentage || null,
  //     discountAmount: formValue.discountAmount || null,
  //     discountReason: formValue.discountReason || null,
  //     remarks: formValue.remarks
  //   };

  //   this.enrollmentService.updateEnrollment(this.enrollmentId()!, request).subscribe({
  //     next: () => {
  //       this.isSubmitting.set(false);
  //       this.confirmationService.confirm({
  //         title: 'Enrollment Updated',
  //         message: 'Enrollment updated successfully.',
  //         type: 'success',
  //         confirmText: 'Back to List',
  //         cancelText: 'Stay'
  //       }).then((confirmed) => {
  //         if (confirmed) {
  //           // ✅ CHANGED: Relative navigation
  //           this.router.navigate(['../..'], { relativeTo: this.route });
  //         }
  //       });
  //     },
  //     error: (error) => {
  //       console.error('Error updating enrollment:', error);
  //       this.isSubmitting.set(false);
  //       this.showError(
  //         'Update Failed',
  //         error.error?.message || 'Failed to update enrollment. Please try again.'
  //       );
  //     }
  //   });
  // }
  private updateEnrollment(): void {
    const formValue = this.enrollmentForm.value;

    const request: UpdateEnrollmentRequest = {
      totalCourseFees: Number(formValue.totalCourseFees),
      status: formValue.status,
      discountPercentage: formValue.discountPercentage || null,
      discountAmount: formValue.discountAmount || null,
      discountReason: formValue.discountReason || null,
      remarks: formValue.remarks
    };

    this.enrollmentService.updateEnrollment(this.enrollmentId()!, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Enrollment Updated',
          message: 'Enrollment updated successfully.',
          type: 'success',
          confirmText: 'Back to List',
          cancelText: 'Stay'
        }).then((confirmed) => {
          if (confirmed) {
            this.navigateToEnrollmentsList();
          }
        });
      },
      error: (error: any) => {
        console.error('Error updating enrollment:', error);
        this.isSubmitting.set(false);
        this.showError(
          'Update Failed',
          error.error?.message || 'Failed to update enrollment. Please try again.'
        );
      }
    });
  }

  // ✅ Dynamic cancel navigation
  cancel(): void {
    this.navigateToEnrollmentsList();
  }

  // ✅ Helper method for dynamic navigation
  private navigateToEnrollmentsList(): void {
    const basePath = this.isSalesExec() ? '/sales-dashboard' : '/admin-dashboard';
    this.router.navigate([`${basePath}/enrollments`]);
  }

  getEnrollmentStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      ACTIVE: 'status-active',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
      ON_HOLD: 'status-onhold'
    };
    return classes[status] || 'status-active';
  }

  getEnrollmentStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      ACTIVE: 'check_circle',
      COMPLETED: 'task_alt',
      CANCELLED: 'cancel',
      ON_HOLD: 'pause_circle'
    };
    return icons[status] || 'check_circle';
  }

  getStudentName(studentId: number): string {
    const student = this.students().find((s) => s.studentId === studentId);
    return student?.fullName || 'Unknown Student';
  }

  getBatchName(batchId: number): string {
    const batch = this.batches().find((b) => b.batchId === batchId);
    return batch?.batchName || 'Unknown Batch';
  }

  private showError(title: string, message: string): void {
    this.confirmationService.confirm({
      title,
      message,
      type: 'danger',
      confirmText: 'OK',
      cancelText: 'Close'
    });
  }
}
