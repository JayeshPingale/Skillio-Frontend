import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CourseResponse, CourseService, UpdateCourseRequest } from '../../../../core/services/courses/course.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-course-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './course-edit.html',
  styleUrls: ['./course-edit.css']
})
export class CourseEdit implements OnInit {
  private fb = inject(FormBuilder);
  private courseService = inject(CourseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);

  courseForm!: FormGroup;
  currentCourse = signal<CourseResponse | null>(null);
  courseId = signal<number>(0);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.initForm();
    this.loadCourseData();
  }

  initForm(): void {
    this.courseForm = this.fb.group({
      courseName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]], // ✅ Fixed
      duration: ['', [Validators.required]],
      totalFees: [null, [Validators.required, Validators.min(100)]], // ✅ Fixed
      isActive: [true]
    });
  }

  loadCourseData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid course ID');
      return;
    }

    this.courseId.set(Number(id));
    this.isLoading.set(true);

    this.courseService.getCourseById(this.courseId()).subscribe({
      next: (course) => {
        this.currentCourse.set(course);
        this.populateForm(course);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load course details');
        this.isLoading.set(false);
        console.error('Error loading course:', error);
      }
    });
  }

  populateForm(course: CourseResponse): void {
    this.courseForm.patchValue({
      courseName: course.courseName,
      description: course.description, // ✅ Fixed
      duration: course.duration,
      totalFees: course.totalFees, // ✅ Fixed
      isActive: course.isActive
    });
  }

  onSubmit(): void {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const updateRequest: UpdateCourseRequest = {
      courseName: this.courseForm.get('courseName')?.value,
      description: this.courseForm.get('description')?.value,
      duration: this.courseForm.get('duration')?.value,
      totalFees: this.courseForm.get('totalFees')?.value,
      isActive: this.courseForm.get('isActive')?.value
    };

    this.courseService.updateCourse(this.courseId(), updateRequest).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Course updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/courses']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        const validationErrors = error.error?.validationErrors;
        if (validationErrors && Array.isArray(validationErrors)) {
          this.errorMessage.set(validationErrors.join(', '));
        } else {
          this.errorMessage.set(error.error?.message || 'Failed to update course. Please try again.');
        }
        console.error('Update course error:', error);
      }
    });
  }

  async cancel(): Promise<void> {
    const hasChanges = this.courseForm.dirty;

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
        this.router.navigate(['/admin-dashboard/courses']);
      }
    } else {
      this.router.navigate(['/admin-dashboard/courses']);
    }
  }

  async toggleActiveStatus(): Promise<void> {
    const currentStatus = this.courseForm.get('isActive')?.value;
    const newStatus = !currentStatus;
    const courseName = this.currentCourse()?.courseName || 'this course';

    const confirmed = await this.confirmationService.confirm({
      title: newStatus ? 'Activate Course' : 'Deactivate Course',
      message: newStatus 
        ? `Are you sure you want to activate "${courseName}"? Students will be able to enroll in this course.`
        : `Are you sure you want to deactivate "${courseName}"? Students will not be able to enroll in this course.`,
      confirmText: newStatus ? 'Activate' : 'Deactivate',
      cancelText: 'Cancel',
      type: newStatus ? 'success' : 'warning',
      icon: newStatus ? 'check_circle' : 'pause_circle'
    });

    if (confirmed) {
      this.courseForm.patchValue({ isActive: newStatus });
    }
  }

  // ✅ Fixed getter names
  get courseName() {
    return this.courseForm.get('courseName');
  }

  get description() {
    return this.courseForm.get('description');
  }

  get duration() {
    return this.courseForm.get('duration');
  }

  get totalFees() {
    return this.courseForm.get('totalFees');
  }

  get isActive() {
    return this.courseForm.get('isActive');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
