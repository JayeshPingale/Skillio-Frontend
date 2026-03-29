import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { TargetService, TargetDTO, CreateTargetDTO, UpdateTargetDTO, UpdateTargetAchievementDTO } from '../../../../core/services/target/target.service';
import { UserResponse, UserService } from '../../../../core/services/users/user.service';

@Component({
  selector: 'app-target-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './target-manage.html',
  styleUrls: ['./target-manage.css']
})
export class TargetManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private targetService = inject(TargetService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  targetForm!: FormGroup;
  salesExecutives = signal<UserResponse[]>([]);
  isEditMode = signal(false);
  isAchievementMode = signal(false);
  targetId = signal<number | null>(null);
  currentTarget = signal<TargetDTO | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  pageTitle = computed(() => {
    if (this.isAchievementMode()) return 'Update Achievement';
    return this.isEditMode() ? 'Edit Target' : 'Create Target';
  });

  pageSubtitle = computed(() => {
    if (this.isAchievementMode()) return 'Update achieved values for target';
    return this.isEditMode() ? 'Update target details' : 'Set new target for sales executive';
  });

  ngOnInit(): void {
    this.checkMode();
    this.initializeForm();
    this.loadSalesExecutives();
    
    // ✅ NEW: Setup auto-date calculation on period change
    if (!this.isEditMode() && !this.isAchievementMode()) {
      this.setupPeriodListener();
    }
  }

  private checkMode(): void {
    const path = this.route.snapshot.routeConfig?.path || '';
    const id = this.route.snapshot.paramMap.get('id');
    
    if (path.includes('update-achievement') && id) {
      this.isAchievementMode.set(true);
      this.targetId.set(Number(id));
      this.loadTargetData(Number(id));
    } else if (id) {
      this.isEditMode.set(true);
      this.targetId.set(Number(id));
      this.loadTargetData(Number(id));
    }
  }

  private initializeForm(): void {
    if (this.isAchievementMode()) {
      // Achievement Update Form
      this.targetForm = this.fb.group({
        achievedLeads: [0, [Validators.required, Validators.min(0)]],
        achievedEnrollments: [0, [Validators.required, Validators.min(0)]],
        achievedRevenue: [0, [Validators.required, Validators.min(0)]]
      });
    } else {
      // Create/Edit Target Form
      this.targetForm = this.fb.group({
        userId: [{ value: '', disabled: this.isEditMode() }, [Validators.required]],
        targetPeriod: [{ value: 'MONTHLY', disabled: this.isEditMode() }, [Validators.required]],
        targetLeads: [null, [Validators.required, Validators.min(1)]],
        targetEnrollments: [null, [Validators.required, Validators.min(1)]],
        targetRevenue: [null, [Validators.required, Validators.min(1000)]],
        startDate: [{ value: '', disabled: this.isEditMode() }, [Validators.required]],
        endDate: ['', [Validators.required]],
        remarks: ['', [Validators.maxLength(500)]]
      });

      // Set default dates for create mode
      if (!this.isEditMode()) {
        const today = new Date();
        const todayStr = this.formatDateForInput(today);
        
        // ✅ Calculate initial end date based on default MONTHLY period
        const monthlyEnd = new Date(today);
        monthlyEnd.setMonth(monthlyEnd.getMonth() + 1);
        const monthlyEndStr = this.formatDateForInput(monthlyEnd);
        
        this.targetForm.patchValue({ 
          startDate: todayStr,
          endDate: monthlyEndStr // ✅ Auto-set end date
        });
      }
    }
  }

  // ✅ NEW: Listen to period changes and auto-calculate end date
  private setupPeriodListener(): void {
    this.targetForm.get('targetPeriod')?.valueChanges.subscribe((period: string) => {
      const startDateStr = this.targetForm.get('startDate')?.value;
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        const endDate = this.calculateEndDate(startDate, period);
        this.targetForm.patchValue({ endDate: this.formatDateForInput(endDate) });
      }
    });

    // ✅ NEW: Also listen to startDate changes
    this.targetForm.get('startDate')?.valueChanges.subscribe((startDateStr: string) => {
      if (startDateStr) {
        const period = this.targetForm.get('targetPeriod')?.value || 'MONTHLY';
        const startDate = new Date(startDateStr);
        const endDate = this.calculateEndDate(startDate, period);
        this.targetForm.patchValue({ endDate: this.formatDateForInput(endDate) });
      }
    });
  }

  // ✅ NEW: Calculate end date based on period
  private calculateEndDate(startDate: Date, period: string): Date {
    const endDate = new Date(startDate);
    
    if (period === 'MONTHLY') {
      // Add 1 month
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (period === 'QUARTERLY') {
      // Add 3 months
      endDate.setMonth(endDate.getMonth() + 3);
    }
    
    return endDate;
  }

  // ✅ NEW: Format date for input[type="date"]
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadSalesExecutives(): void {
    if (this.isAchievementMode()) return;

    this.userService.getAllUsers().subscribe({
      next: (users) => {
        // Filter only sales executives
        const executives = users.filter(u => 
          u.roleName?.includes('SALES') || u.roleName?.includes('EXECUTIVE')
        );
        this.salesExecutives.set(executives);
      },
      error: (error: any) => {
        console.error('Error loading sales executives:', error);
        this.errorMessage.set('Failed to load sales executives');
      }
    });
  }

  private loadTargetData(id: number): void {
    this.isLoading.set(true);

    this.targetService.getTargetById(id).subscribe({
      next: (data: TargetDTO) => {
        this.currentTarget.set(data);

        if (this.isAchievementMode()) {
          // Populate achievement form
          this.targetForm.patchValue({
            achievedLeads: data.achievedLeads,
            achievedEnrollments: data.achievedEnrollments,
            achievedRevenue: data.achievedRevenue
          });
        } else {
          // Populate edit form
          this.targetForm.patchValue({
            userId: data.userId,
            targetPeriod: data.targetPeriod,
            targetLeads: data.targetLeads,
            targetEnrollments: data.targetEnrollments,
            targetRevenue: data.targetRevenue,
            startDate: data.startDate,
            endDate: data.endDate,
            remarks: data.remarks
          });
        }

        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading target:', error);
        this.errorMessage.set('Failed to load target data');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.targetForm.invalid) {
      this.targetForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    if (this.isAchievementMode()) {
      this.updateAchievement();
    } else if (this.isEditMode()) {
      this.updateTarget();
    } else {
      this.createTarget();
    }
  }

  private createTarget(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    // Validate dates BEFORE sending
    const startDate = new Date(this.targetForm.get('startDate')?.value);
    const endDate = new Date(this.targetForm.get('endDate')?.value);
    
    if (endDate <= startDate) {
      this.errorMessage.set('End date must be after start date');
      this.isSubmitting.set(false);
      return;
    }

    const request: CreateTargetDTO = {
      userId: Number(this.targetForm.get('userId')?.value),
      targetPeriod: this.targetForm.get('targetPeriod')?.value,
      targetLeads: Number(this.targetForm.get('targetLeads')?.value),
      targetEnrollments: Number(this.targetForm.get('targetEnrollments')?.value),
      targetRevenue: Number(this.targetForm.get('targetRevenue')?.value),
      startDate: this.targetForm.get('startDate')?.value,
      endDate: this.targetForm.get('endDate')?.value,
      remarks: this.targetForm.get('remarks')?.value || undefined
    };

    console.log('📤 Creating target with request:', request);

    this.targetService.createTarget(request).subscribe({
      next: (response: TargetDTO) => {
        console.log('✅ Target created:', response);
        this.successMessage.set('Target created successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/targets']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('❌ Error creating target:', error);
        
        let errorMsg = 'Failed to create target. Please try again.';
        if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg = error.message;
        } else if (typeof error.error === 'string') {
          errorMsg = error.error;
        }
        
        this.errorMessage.set(errorMsg);
        this.isSubmitting.set(false);
      }
    });
  }

  private updateTarget(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const request: UpdateTargetDTO = {
      targetLeads: Number(this.targetForm.get('targetLeads')?.value),
      targetEnrollments: Number(this.targetForm.get('targetEnrollments')?.value),
      targetRevenue: Number(this.targetForm.get('targetRevenue')?.value),
      endDate: this.targetForm.get('endDate')?.value,
      remarks: this.targetForm.get('remarks')?.value || undefined
    };

    this.targetService.updateTarget(this.targetId()!, request).subscribe({
      next: (response: TargetDTO) => {
        console.log('Target updated:', response);
        this.successMessage.set('Target updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/targets']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error updating target:', error);
        
        let errorMsg = 'Failed to update target. Please try again.';
        if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg = error.message;
        } else if (typeof error.error === 'string') {
          errorMsg = error.error;
        }
        
        this.errorMessage.set(errorMsg);
        this.isSubmitting.set(false);
      }
    });
  }

  private updateAchievement(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const request: UpdateTargetAchievementDTO = {
      achievedLeads: Number(this.targetForm.get('achievedLeads')?.value),
      achievedEnrollments: Number(this.targetForm.get('achievedEnrollments')?.value),
      achievedRevenue: Number(this.targetForm.get('achievedRevenue')?.value)
    };

    this.targetService.updateTargetAchievement(this.targetId()!, request).subscribe({
      next: (response: TargetDTO) => {
        console.log('Achievement updated:', response);
        this.successMessage.set('Achievement updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/targets']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error updating achievement:', error);
        
        let errorMsg = 'Failed to update achievement. Please try again.';
        if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg = error.message;
        } else if (typeof error.error === 'string') {
          errorMsg = error.error;
        }
        
        this.errorMessage.set(errorMsg);
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/targets']);
  }

  getProgressPercentage(achieved: number | undefined, target: number | undefined): number {
    if (!target || target === 0) return 0;
    const percentage = ((achieved || 0) / target) * 100;
    return Math.min(percentage, 100);
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 80) return 'progress-success';
    if (percentage >= 50) return 'progress-warning';
    return 'progress-danger';
  }
}
