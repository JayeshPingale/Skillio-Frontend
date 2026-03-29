import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BatchService, CreateBatchRequest } from '../../../../core/services/batches/batch.service';
import { CourseService, CourseResponse } from '../../../../core/services/courses/course.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-batch-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './batch-create.html',
  styleUrls: ['./batch-create.css']
})
export class BatchCreate implements OnInit {
  private fb = inject(FormBuilder);
  private batchService = inject(BatchService);
  private courseService = inject(CourseService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService); // ✅ Inject

  batchForm!: FormGroup;
  courses = signal<CourseResponse[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.initForm();
    this.loadDropdownData();
  }

  initForm(): void {
    this.batchForm = this.fb.group({
      batchCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      batchName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      courseId: [null, [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      timing: ['', [Validators.required]],
      modeOfClass: ['', [Validators.required]],
      instructor: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  loadDropdownData(): void {
    this.isLoading.set(true);

    this.courseService.getActiveCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load courses');
        this.isLoading.set(false);
        console.error('Error loading courses:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return;
    }

    // Validate dates
    const startDate = new Date(this.batchForm.value.startDate);
    const endDate = new Date(this.batchForm.value.endDate);
    
    if (endDate <= startDate) {
      this.errorMessage.set('End date must be after start date');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const createRequest: CreateBatchRequest = {
      batchCode: this.batchForm.value.batchCode,
      batchName: this.batchForm.value.batchName,
      courseId: this.batchForm.value.courseId,
      startDate: this.batchForm.value.startDate,
      endDate: this.batchForm.value.endDate,
      timing: this.batchForm.value.timing,
      modeOfClass: this.batchForm.value.modeOfClass,
      instructor: this.batchForm.value.instructor,
      description: this.batchForm.value.description
    };

    this.batchService.createBatch(createRequest).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/admin-dashboard/batches']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        const validationErrors = error.error?.validationErrors;
        if (validationErrors && Array.isArray(validationErrors)) {
          this.errorMessage.set(validationErrors.join(', '));
        } else {
          this.errorMessage.set(error.error?.message || 'Failed to create batch. Please try again.');
        }
        console.error('Create batch error:', error);
      }
    });
  }

  // ✅ Cancel with Confirmation Dialog
  async cancel(): Promise<void> {
    const hasChanges = this.batchForm.dirty;

    if (hasChanges) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to leave? All your changes will be lost.',
        confirmText: 'Discard',
        cancelText: 'Continue',
        type: 'warning',
        icon: 'warning'
      });

      if (confirmed) {
        this.router.navigate(['/admin-dashboard/batches']);
      }
    } else {
      this.router.navigate(['/admin-dashboard/batches']);
    }
  }

  // Getters
  get batchCode() {
    return this.batchForm.get('batchCode');
  }

  get batchName() {
    return this.batchForm.get('batchName');
  }

  get courseId() {
    return this.batchForm.get('courseId');
  }

  get startDate() {
    return this.batchForm.get('startDate');
  }

  get endDate() {
    return this.batchForm.get('endDate');
  }

  get timing() {
    return this.batchForm.get('timing');
  }

  get modeOfClass() {
    return this.batchForm.get('modeOfClass');
  }

  get instructor() {
    return this.batchForm.get('instructor');
  }

  get description() {
    return this.batchForm.get('description');
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
