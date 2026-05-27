import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { CommissionDTO, CommissionService, CreateCommissionRequest, UpdateCommissionRequest } from '../../../../core/services/commission/commission-service';
import { EnrollmentResponse, EnrollmentService } from '../../../../core/services/enrollment/enrollment.service';
import { UserResponse, UserService } from '../../../../core/services/users/user.service';
import { LeadService, LeadResponse } from '../../../../core/services/lead/lead.service'; // ✅ ADD
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

// ✅ Extended Enrollment interface
interface EnrichedEnrollment extends EnrollmentResponse {
  leadSalesExecutiveId?: number;
  leadSalesExecutiveName?: string;
}

@Component({
  selector: 'app-commission-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './commission-manage.html',
  styleUrls: ['./commission-manage.css']
})
export class CommissionManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private commissionService = inject(CommissionService);
  private enrollmentService = inject(EnrollmentService);
  private userService = inject(UserService);
  private leadService = inject(LeadService); // ✅ ADD
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  commissionForm!: FormGroup;
  
  allEnrollments = signal<EnrichedEnrollment[]>([]); // ✅ Use enriched type
  allLeads = signal<LeadResponse[]>([]); // ✅ Store all leads
  salesExecutives = signal<UserResponse[]>([]);
  selectedEnrollment = signal<EnrichedEnrollment | null>(null);
  
  isEditMode = signal(false);
  commissionId = signal<number | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // ✅ Computed: Filter enrollments by selected Sales Executive
  // ✅ SIMPLIFIED: Show all enrollments for selected sales exec
// ✅ FIXED: Sales Executive ke lead se matched enrollments filter karo
filteredEnrollments = computed(() => {
  const salesExecId = Number(this.commissionForm?.get('salesExecutiveId')?.value);

  if (!salesExecId) return [];

  const allEnrollments = this.allEnrollments();
  const allLeads = this.allLeads();

  // Us Sales Executive ke saare CONVERTED leads nikalo
  const salesExecLeads = allLeads.filter(lead =>
    lead.salesExecutiveId === salesExecId &&
    lead.status === 'CONVERTED' &&
    lead.convertedStudentId != null
  );

  console.log(`🔍 Sales Exec ${salesExecId} ke CONVERTED leads:`, salesExecLeads.length);

  // Un leads ke convertedStudentId ke basis pe enrollments filter karo
  const eligibleStudentIds = salesExecLeads.map(lead => lead.convertedStudentId);

  const filtered = allEnrollments.filter(e =>
    e.status === 'ACTIVE' &&
    eligibleStudentIds.includes(e.studentId)
  );

  console.log(`✅ Filtered Enrollments for Sales Exec ${salesExecId}:`, filtered.length);
  return filtered;
});


  ngOnInit(): void {
    this.checkEditMode();
    this.initializeForm();
    this.loadSalesExecutives();
    this.loadData(); // ✅ Load both enrollments and leads
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.commissionId.set(Number(id));
      this.loadCommissionData(Number(id));
    }
  }

  private initializeForm(): void {
    this.commissionForm = this.fb.group({
      salesExecutiveId: [{ value: '', disabled: this.isEditMode() }, [Validators.required]],
      enrollmentId: [{ value: '', disabled: this.isEditMode() }, [Validators.required]],
      totalCourseFees: [{ value: '', disabled: true }, [Validators.required, Validators.min(0.01)]],
      discountAmount: [{ value: 0, disabled: true }],
      commissionPercentage: [10.00, [Validators.required, Validators.min(0), Validators.max(100)]],
      remarks: ['', [Validators.maxLength(500)]]
    });

    if (!this.isEditMode()) {
      // When Sales Executive changes, reset enrollment
      this.commissionForm.get('salesExecutiveId')?.valueChanges.subscribe(salesExecId => {
        console.log('🔥 Sales Executive changed:', salesExecId);
        this.commissionForm.patchValue({ 
          enrollmentId: '',
          totalCourseFees: 0,
          discountAmount: 0
        });
        this.selectedEnrollment.set(null);
      });

      // When Enrollment is selected
      this.commissionForm.get('enrollmentId')?.valueChanges.subscribe(enrollmentId => {
        this.onEnrollmentSelected(enrollmentId);
      });
    }

    // Auto-calculate on changes
    this.commissionForm.get('discountAmount')?.valueChanges.subscribe(() => {
      this.calculateEligibleAmount();
    });
    this.commissionForm.get('totalCourseFees')?.valueChanges.subscribe(() => {
      this.calculateEligibleAmount();
    });
    this.commissionForm.get('commissionPercentage')?.valueChanges.subscribe(() => {
      this.calculateEligibleAmount();
    });
  }

// ✅ Load both enrollments and leads together
private loadData(): void {
  this.isLoading.set(true);
  this.errorMessage.set('');
  
  forkJoin({
    enrollments: this.enrollmentService.getAllEnrollments(),
    leads: this.leadService.getAllLeads()
  }).subscribe({
    next: (data) => {
      console.log('✅ Enrollments loaded:', data.enrollments.length);
      console.log('✅ Leads loaded:', data.leads.length);
      
      // Store leads
      this.allLeads.set(data.leads);
      
      // ✅ Enrich enrollments with lead's sales executive info
      const enrichedEnrollments: EnrichedEnrollment[] = data.enrollments.map(enrollment => {
        // Find the CONVERTED lead for this student
        const relatedLead = data.leads.find(lead => 
          lead.status === 'CONVERTED' && 
          lead.convertedStudentId === enrollment.studentId
        );
        
        if (relatedLead && relatedLead.salesExecutiveId) { // ✅ Check if salesExecutiveId exists
          console.log(`✅ Found Lead ID ${relatedLead.leadId} for Student ${enrollment.studentName} (Sales Exec: ${relatedLead.salesExecutiveName})`);
          
          return {
            ...enrollment,
            leadSalesExecutiveId: relatedLead.salesExecutiveId,
            leadSalesExecutiveName: relatedLead.salesExecutiveName
          };
        } else {
          // No lead or lead has no sales executive
          return {
            ...enrollment,
            leadSalesExecutiveId: undefined,
            leadSalesExecutiveName: 'Manual Enrollment'
          };
        }
      });
      
      console.log('🔥 Enriched Enrollments:', enrichedEnrollments);
      this.allEnrollments.set(enrichedEnrollments);
      this.isLoading.set(false);
    },
    error: (error: any) => {
      console.error('❌ Error loading data:', error);
      this.errorMessage.set('Failed to load enrollments and leads');
      this.isLoading.set(false);
    }
  });
}



  private loadSalesExecutives(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        console.log('✅ Users loaded:', data);
        const salesExecs = data.filter(u =>
          u.isActive &&
        
          (u.roleName?.toLowerCase().includes('sales') ||
           u.roleName?.toLowerCase().includes('executive'))
        );
        console.log('✅ Sales Executives:', salesExecs.length);
        this.salesExecutives.set(salesExecs);
      },
      error: (error: any) => {
        console.error('❌ Error loading users:', error);
        this.errorMessage.set('Failed to load sales executives');
      }
    });
  }

  private loadCommissionData(id: number): void {
    this.isLoading.set(true);
    this.commissionService.getCommissionById(id).subscribe({
      next: (data: CommissionDTO) => {
        console.log('✅ Commission loaded:', data);
        
        // Load the enrollment to get discount info
        this.enrollmentService.getEnrollmentById(data.enrollmentId).subscribe({
          next: (enrollment) => {
            console.log('✅ Enrollment loaded for edit:', enrollment);
            this.selectedEnrollment.set(enrollment);

            // Calculate discount
            let discountAmount = enrollment.discountAmount || 0;
            if (!discountAmount && enrollment.discountPercentage && enrollment.discountPercentage > 0) {
              discountAmount = (enrollment.totalCourseFees * enrollment.discountPercentage) / 100;
            }

            // Populate form
            this.commissionForm.patchValue({
              salesExecutiveId: data.salesExecutiveId,
              enrollmentId: data.enrollmentId,
              totalCourseFees: enrollment.totalCourseFees,
              discountAmount: discountAmount,
              commissionPercentage: data.commissionPercentage,
              remarks: data.remarks
            });

            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('❌ Error loading enrollment:', err);
            this.errorMessage.set('Failed to load enrollment details');
            this.isLoading.set(false);
          }
        });
      },
      error: (error: any) => {
        console.error('❌ Error loading commission:', error);
        this.errorMessage.set('Failed to load commission data');
        this.isLoading.set(false);
      }
    });
  }

  private onEnrollmentSelected(enrollmentId: number): void {
    const enrollment = this.filteredEnrollments().find(e => e.enrollmentId === Number(enrollmentId));
    
    if (enrollment) {
      this.selectedEnrollment.set(enrollment);

      // Calculate discount amount
      let discountAmount = enrollment.discountAmount || 0;
      if (!discountAmount && enrollment.discountPercentage && enrollment.discountPercentage > 0) {
        discountAmount = (enrollment.totalCourseFees * enrollment.discountPercentage) / 100;
      }

      console.log('🔥 ENROLLMENT SELECTED:', {
        enrollmentId: enrollment.enrollmentId,
        studentName: enrollment.studentName,
        totalFees: enrollment.totalCourseFees,
        discountPercentage: enrollment.discountPercentage,
        discountAmount: discountAmount,
        finalAmount: enrollment.totalCourseFees - discountAmount,
        leadSalesExec: enrollment.leadSalesExecutiveName
      });

      this.commissionForm.patchValue({
        totalCourseFees: enrollment.totalCourseFees || 0,
        discountAmount: discountAmount
      }, { emitEvent: true });
    } else {
      this.selectedEnrollment.set(null);
    }
  }

  private calculateEligibleAmount(): void {
    const totalFees = Number(this.commissionForm.get('totalCourseFees')?.value) || 0;
    const discount = Number(this.commissionForm.get('discountAmount')?.value) || 0;
    const percentage = Number(this.commissionForm.get('commissionPercentage')?.value) || 10;

    const discountedFees = totalFees - discount;
    const eligibleAmount = (discountedFees * percentage) / 100;

    console.log('💰 Calculated eligible amount:', {
      totalFees,
      discount,
      discountedFees,
      percentage,
      eligibleAmount
    });
  }

  calculatedDiscountAmount(): number {
    const enrollment = this.selectedEnrollment();
    if (!enrollment) return 0;

    let discount = enrollment.discountAmount || 0;
    if (!discount && enrollment.discountPercentage && enrollment.discountPercentage > 0) {
      discount = (enrollment.totalCourseFees * enrollment.discountPercentage) / 100;
    }

    return discount;
  }

  get discountedAmount(): number {
    const totalFees = Number(this.commissionForm.get('totalCourseFees')?.value) || 0;
    const discount = Number(this.commissionForm.get('discountAmount')?.value) || 0;
    return totalFees - discount;
  }

  get calculatedEligibleAmount(): number {
    const percentage = Number(this.commissionForm.get('commissionPercentage')?.value) || 10;
    return (this.discountedAmount * percentage) / 100;
  }

  async onSubmit(): Promise<void> {
    if (this.commissionForm.invalid) {
      console.error('❌ Form is invalid', this.commissionForm.value);
      this.commissionForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: this.isEditMode() ? 'Update Commission' : 'Create Commission',
      message: this.isEditMode()
        ? 'Are you sure you want to update this commission record?'
        : 'Are you sure you want to create this commission record?',
      confirmText: this.isEditMode() ? 'Update' : 'Create',
      cancelText: 'Cancel',
      type: 'info',
      icon: this.isEditMode() ? 'edit' : 'add_circle'
    });

    if (confirmed) {
      if (this.isEditMode()) {
        this.updateCommission();
      } else {
        this.createCommission();
      }
    }
  }

  private createCommission(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formData = this.commissionForm.getRawValue();

    const request: CreateCommissionRequest = {
      enrollmentId: Number(formData.enrollmentId),
      salesExecutiveId: Number(formData.salesExecutiveId),
      totalCourseFees: this.discountedAmount,
      commissionPercentage: Number(formData.commissionPercentage) || 10.00,
      remarks: formData.remarks || null
    };

    console.log('📤 Creating commission:', request);

    this.commissionService.createCommission(request).subscribe({
      next: (response: CommissionDTO) => {
        console.log('✅ Commission created:', response);
        this.successMessage.set('Commission created successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/commissions']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('❌ Error creating commission:', error);
        if (error.error && error.error.errors) {
          const errors = Object.values(error.error.errors).join(', ');
          this.errorMessage.set(`Validation failed: ${errors}`);
        } else if (error.error && error.error.message) {
          this.errorMessage.set(`Error: ${error.error.message}`);
        } else {
          this.errorMessage.set('Failed to create commission. Please try again.');
        }
        this.isSubmitting.set(false);
      }
    });
  }

  private updateCommission(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request: UpdateCommissionRequest = {
      totalCourseFees: this.discountedAmount,
      commissionPercentage: Number(this.commissionForm.get('commissionPercentage')?.value),
      remarks: this.commissionForm.get('remarks')?.value
    };

    console.log('📤 Updating commission:', request);

    this.commissionService.updateCommission(this.commissionId()!, request).subscribe({
      next: (response: CommissionDTO) => {
        console.log('✅ Commission updated:', response);
        this.successMessage.set('Commission updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/commissions']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('❌ Error updating commission:', error);
        this.errorMessage.set(error.error?.message || 'Failed to update commission. Please try again.');
        this.isSubmitting.set(false);
      }
    });
  }

  async cancel(): Promise<void> {
    if (this.commissionForm.dirty) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Discard Changes',
        message: 'You have unsaved changes. Are you sure you want to leave without saving?',
        confirmText: 'Discard',
        cancelText: 'Stay',
        type: 'warning',
        icon: 'warning'
      });

      if (confirmed) {
        this.router.navigate(['/admin-dashboard/commissions']);
      }
    } else {
      this.router.navigate(['/admin-dashboard/commissions']);
    }
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toFixed(2);
  }
}
