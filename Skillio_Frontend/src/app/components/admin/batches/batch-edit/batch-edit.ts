import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { BatchResponse, BatchService, UpdateBatchRequest } from '../../../../core/services/batches/batch.service';
import { CourseService, CourseResponse } from '../../../../core/services/courses/course.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-batch-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './batch-edit.html',
  styleUrls: ['./batch-edit.css']
})
export class BatchEdit implements OnInit {
  private fb = inject(FormBuilder);
  private batchService = inject(BatchService);
  private courseService = inject(CourseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService); // ✅ Inject

  batchForm!: FormGroup;
  currentBatch = signal<BatchResponse | null>(null);
  courses = signal<CourseResponse[]>([]);
  batchId = signal<number>(0);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.batchForm = this.fb.group({
      batchName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      timing: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(50)]],
      modeOfClass: ['', [Validators.required]],
      instructor: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid batch ID');
      return;
    }

    this.batchId.set(Number(id));
    this.isLoading.set(true);

    Promise.all([
      this.loadBatchDetails(),
      this.loadCourses()
    ]).then(() => {
      this.isLoading.set(false);
    }).catch(error => {
      this.errorMessage.set('Failed to load batch details');
      this.isLoading.set(false);
      console.error('Error loading data:', error);
    });
  }

  loadBatchDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.batchService.getBatchById(this.batchId()).subscribe({
        next: (batch) => {
          this.currentBatch.set(batch);
          this.populateForm(batch);
          resolve();
        },
        error: reject
      });
    });
  }

  loadCourses(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.courseService.getActiveCourses().subscribe({
        next: (courses) => {
          this.courses.set(courses);
          resolve();
        },
        error: reject
      });
    });
  }

  populateForm(batch: BatchResponse): void {
    this.batchForm.patchValue({
      batchName: batch.batchName,
      startDate: batch.startDate,
      endDate: batch.endDate,
      timing: batch.timing,
      modeOfClass: batch.modeOfClass,
      instructor: batch.instructor,
      description: batch.description
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

    const updateRequest: UpdateBatchRequest = {
      batchName: this.batchForm.value.batchName,
      startDate: this.batchForm.value.startDate,
      endDate: this.batchForm.value.endDate,
      timing: this.batchForm.value.timing,
      modeOfClass: this.batchForm.value.modeOfClass,
      instructor: this.batchForm.value.instructor,
      description: this.batchForm.value.description
    };

    this.batchService.updateBatch(this.batchId(), updateRequest).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Batch updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/batches']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        const validationErrors = error.error?.validationErrors;
        if (validationErrors && Array.isArray(validationErrors)) {
          this.errorMessage.set(validationErrors.join(', '));
        } else {
          this.errorMessage.set(error.error?.message || 'Failed to update batch. Please try again.');
        }
        console.error('Update batch error:', error);
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
        cancelText: 'Continue Editing',
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
  get batchName() {
    return this.batchForm.get('batchName');
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

  getModeIcon(mode: string): string {
    const icons: { [key: string]: string } = {
      'ONLINE': 'wifi',
      'OFFLINE': 'location_on',
      'HYBRID': 'sync_alt'
    };
    return icons[mode] || 'help';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'UPCOMING': 'schedule',
      'ONGOING': 'play_circle',
      'COMPLETED': 'check_circle',
      'CANCELLED': 'cancel'
    };
    return icons[status] || 'help';
  }
}
