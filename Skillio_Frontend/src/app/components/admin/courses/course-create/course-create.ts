import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CourseService } from '../../../../core/services/courses/course.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-course-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './course-create.html',
  styleUrls: ['./course-create.css']
})
export class CourseCreate implements OnInit {
  private fb = inject(FormBuilder);
  private courseService = inject(CourseService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService); // ✅ Inject

  courseForm!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');

  // Course suggestions
  courseSuggestions = [
    { name: 'Java Full Stack Development', duration: '6 Months', totalFees: 50000, icon: 'code' },
    { name: 'Python Full Stack', duration: '5 Months', totalFees: 45000, icon: 'memory' },
    { name: 'MERN Stack Development', duration: '6 Months', totalFees: 48000, icon: 'web' },
    { name: 'Data Science & ML', duration: '8 Months', totalFees: 60000, icon: 'analytics' },
    { name: 'DevOps Engineering', duration: '4 Months', totalFees: 40000, icon: 'cloud' }
  ];

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.courseForm = this.fb.group({
      courseName: ['', [Validators.required, Validators.minLength(3)]],
       courseDescription: ['', [Validators.required, Validators.minLength(10)]], 
      duration: ['', [Validators.required]],
      totalFees: [null, [Validators.required, Validators.min(0)]]
    });
  }

useSuggestion(suggestion: any): void {
  this.courseForm.patchValue({
    courseName: suggestion.name,
    courseDescription: suggestion.name,  // ✅ Frontend field
    duration: suggestion.duration,
    totalFees: suggestion.totalFees
  });
}


  onSubmit(): void {
  if (this.courseForm.invalid) {
    this.courseForm.markAllAsTouched();
    return;
  }

  // ✅ Frontend: courseDescription → Backend: description
  const formValue = this.courseForm.value;
  const payload: any = {
    courseName: formValue.courseName,
    description: formValue.courseDescription,  // ✅ Mapping
    duration: formValue.duration,
    totalFees: parseFloat(formValue.totalFees || 0).toFixed(2)  // ✅ BigDecimal fix
  };

  this.isSubmitting.set(true);
  this.errorMessage.set('');

  this.courseService.createCourse(payload).subscribe({
    next: (response) => {
      this.isSubmitting.set(false);
      this.router.navigate(['/admin-dashboard/courses']);
    },
    error: (error) => {
      this.isSubmitting.set(false);
      this.errorMessage.set(error.error?.message || 'Failed to create course. Please try again.');
      console.error('Create course error:', error);
    }
  });
}



  // ✅ Updated cancel with Confirmation Dialog
  async cancel(): Promise<void> {
    // Check if form has any values
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

  get courseName() {
    return this.courseForm.get('courseName');
  }

  get courseDescription() {
    return this.courseForm.get('courseDescription');
  }

  get duration() {
    return this.courseForm.get('duration');
  }

  get totalFees() {
    return this.courseForm.get('totalFees');
  }
}
