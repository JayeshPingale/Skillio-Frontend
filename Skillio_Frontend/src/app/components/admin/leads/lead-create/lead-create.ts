import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LeadService } from '../../../../core/services/lead/lead.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import {
  LeadSourceResponse,
  LeadSourceService,
} from '../../../../core/services/leadSource/lead-source.service';
import { UserResponse, UserService } from '../../../../core/services/users/user.service';
import { CourseResponse, CourseService } from '../../../../core/services/courses/course.service';

@Component({
  selector: 'app-lead-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './lead-create.html',
  styleUrls: ['./lead-create.css'],
})
export class LeadCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leadService = inject(LeadService);
  private leadSourceService = inject(LeadSourceService);
  private userService = inject(UserService);
  private courseService = inject(CourseService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private route = inject(ActivatedRoute);

  leadForm!: FormGroup;
  leadSources = signal<LeadSourceResponse[]>([]);
  salesUsers = signal<UserResponse[]>([]);
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.initForm();
    this.loadDropdownData();
  }

  initForm(): void {
    this.leadForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.email]],
      collegeName: [''],
      courseInterested: ['', [Validators.required]],
      qualification: [''],
      experience: [''],
      interestLevel: ['MEDIUM'],
      sourceId: [null, [Validators.required]],
      comments: [''],
    });
  }

  loadDropdownData(): void {
    this.isLoading.set(true);
    Promise.all([
      this.loadLeadSources(),
      this.loadCourses(),
      // ❌ Remove loadSalesUsers() - not needed for lead create form
    ])
      .then(() => {
        this.isLoading.set(false);
      })
      .catch((error) => {
        this.errorMessage.set('Failed to load required data');
        this.isLoading.set(false);
        console.error('Error loading data:', error);
      });
  }

  loadLeadSources(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.leadSourceService.getActiveLeadSources().subscribe({
        next: (sources) => {
          this.leadSources.set(sources);
          resolve();
        },
        error: reject,
      });
    });
  }

  // loadSalesUsers(): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     this.userService.getAllUsers().subscribe({
  //       next: (users) => {
  //         const salesUsers = users.filter(
  //           (u) => u.roleName === 'ROLE_SALES_EXECUTIVE' || u.roleName === 'ROLE_ADMIN'
  //         );
  //         this.salesUsers.set(salesUsers);
  //         resolve();
  //       },
  //       error: reject,
  //     });
  //   });
  // }

  loadCourses(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.courseService.getAllCourses().subscribe({
        next: (courses) => {
          this.courses.set(courses);
          resolve();
        },
        error: reject,
      });
    });
  }

  onSubmit(): void {
    if (this.leadForm.invalid) {
      this.leadForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formValue: any = { ...this.leadForm.value };

    if (!formValue.email) delete formValue.email;
    if (!formValue.collegeName) delete formValue.collegeName;
    if (!formValue.qualification) delete formValue.qualification;
    if (!formValue.experience) delete formValue.experience;

    this.leadService.createLead(formValue).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['..'], { relativeTo: this.route }); // ✅
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to create lead. Please try again.');
        console.error('Create lead error:', error);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route }); // ✅
  }

  get fullName() {
    return this.leadForm.get('fullName');
  }

  get contactNumber() {
    return this.leadForm.get('contactNumber');
  }

  get email() {
    return this.leadForm.get('email');
  }

  get courseInterested() {
    return this.leadForm.get('courseInterested');
  }

  get collegeName() {
    return this.leadForm.get('collegeName');
  }

  get qualification() {
    return this.leadForm.get('qualification');
  }

  get experience() {
    return this.leadForm.get('experience');
  }

  get interestLevel() {
    return this.leadForm.get('interestLevel');
  }

  get sourceId() {
    return this.leadForm.get('sourceId');
  }

  get comments() {
    return this.leadForm.get('comments');
  }

  getStatusIcon(status: string): string {
    const statusMap: { [key: string]: string } = {
      NEW: 'fiber_new',
      CONTACTED: 'call',
      INTERESTED: 'star',
      QUALIFIED: 'verified',
      NEGOTIATION: 'forum',
      CONVERTED: 'check_circle',
      LOST: 'cancel',
    };
    return statusMap[status] || 'label';
  }
}
