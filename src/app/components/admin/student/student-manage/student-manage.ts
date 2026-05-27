import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import {
  CreateStudentRequest,
  StudentResponse,
  StudentService,
  UpdateStudentRequest
} from '../../../../core/services/student/student-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

function ageRangeValidator(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const dob = new Date(value);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age < min || age > max
      ? { ageRange: { min, max, actual: age } }
      : null;
  };
}

@Component({
  selector: 'app-student-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './student-manage.html',
  styleUrls: ['./student-manage.css']
})
export class StudentManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private studentService = inject(StudentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmationService = inject(ConfirmationService);
  public themeService = inject(ThemeService);
 private authService = inject(AuthService); // ADD

  studentForm!: FormGroup;
  studentId = signal<number | null>(null);
  currentStudent = signal<StudentResponse | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  isEditMode = signal(false);
  isSalesExec = signal(false); 
  minDob!: string;
  maxDob!: string;

  ngOnInit(): void {
    
    this.isSalesExec.set(this.authService.isSalesExecutive()); // ADD
    this.initializeForm();
    this.setDobLimits();
    this.checkEditMode();
  }

  private setDobLimits(): void {
    const today = new Date();

    const max = new Date(
      today.getFullYear() - 15,
      today.getMonth(),
      today.getDate()
    );
    const min = new Date(
      today.getFullYear() - 70,
      today.getMonth(),
      today.getDate()
    );

    const toIso = (d: Date) => d.toISOString().split('T')[0];

    this.maxDob = toIso(max);
    this.minDob = toIso(min);
  }

  private initializeForm(): void {
    this.studentForm = this.fb.group({
      fullName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(100)]
      ],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]{10}$/)]
      ],
      alternateContact: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]{10}$/)]
      ],
      address: [
        '',
        [Validators.required, Validators.minLength(10), Validators.maxLength(500)]
      ],
      dateOfBirth: [
        '',
        [Validators.required, ageRangeValidator(15, 70)]
      ]
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.studentId.set(Number(id));
      this.loadStudentDetails();
    }
  }

  private loadStudentDetails(): void {
    this.isLoading.set(true);

    this.studentService.getStudentById(this.studentId()!).subscribe({
      next: (student) => {
        this.currentStudent.set(student);
        this.populateForm(student);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading student:', error);
        this.isLoading.set(false);
        this.confirmationService.confirm({
          title: 'Load Failed',
          message: 'Failed to load student details.',
          type: 'danger',
          confirmText: 'Back to List',
          cancelText: 'Close'
        }).then(() => this.navigateToStudentsList());
      }
    });
  }

  private populateForm(student: StudentResponse): void {
    this.studentForm.patchValue({
      fullName: student.fullName,
      email: student.email,
      contactNumber: student.contactNumber,
      alternateContact: student.alternateContact,
      address: student.address,
      dateOfBirth: student.dateOfBirth
    });
  }

  onSubmit(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      this.confirmationService.confirm({
        title: 'Validation Error',
        message: 'Please fill all required fields correctly.',
        type: 'warning',
        confirmText: 'OK',
        cancelText: 'Close'
      });
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    if (this.isEditMode()) {
      this.updateStudent();
    } else {
      this.createStudent();
    }
  }

  private createStudent(): void {
    const request: CreateStudentRequest = this.studentForm.value;

    this.studentService.createStudent(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Student Created',
          message: 'Student created successfully.',
          type: 'success',
          confirmText: 'Go to List',
          cancelText: 'Stay'
        }).then(confirmed => {
          if (confirmed) {
            this.router.navigate(['/admin-dashboard/students']);
          } else {
            this.studentForm.reset();
          }
        });
      },
      error: (error) => {
        console.error('Error creating student:', error);
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Create Failed',
          message: error.error?.message || 'Failed to create student.',
          type: 'danger',
          confirmText: 'OK',
          cancelText: 'Close'
        });
      }
    });
  }

  private updateStudent(): void {
    const request: UpdateStudentRequest = this.studentForm.value;

    this.studentService.updateStudent(this.studentId()!, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Student Updated',
          message: 'Student updated successfully.',
          type: 'success',
          confirmText: 'Go to Students List',
          cancelText: 'Stay Here'
        }).then(confirmed => {
          if (confirmed) {
            this.navigateToStudentsList();
          }
        });
      },
      error: (error) => {
        console.error('Error updating student:', error);
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Update Failed',
          message: error.error?.message || 'Failed to update student. Please try again.',
          type: 'danger',
          confirmText: 'OK',
          cancelText: 'Close'
        });
      }
    });
  }

  // ✅ Dynamic cancel navigation
  cancel(): void {
    this.navigateToStudentsList();
  }

  // ✅ Helper method for dynamic navigation
  private navigateToStudentsList(): void {
    const basePath = this.isSalesExec() ? '/sales-dashboard' : '/admin-dashboard';
    this.router.navigate([`${basePath}/students`]);
  }



  calculateAge(dateOfBirth?: string | null): number {
    if (!dateOfBirth) return 0;

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
