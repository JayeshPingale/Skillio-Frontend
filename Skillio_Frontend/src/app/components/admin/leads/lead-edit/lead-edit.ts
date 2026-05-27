import { Component, OnInit, signal, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  LeadResponse,
  LeadService,
  UpdateLeadRequest,
} from '../../../../core/services/lead/lead.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import {
  LeadSourceResponse,
  LeadSourceService,
} from '../../../../core/services/leadSource/lead-source.service';
import { UserResponse, UserService } from '../../../../core/services/users/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lead-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './lead-edit.html',
  styleUrls: ['./lead-edit.css'],
})
export class LeadEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leadService = inject(LeadService);
  private leadSourceService = inject(LeadSourceService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  leadForm!: FormGroup;
  currentLead = signal<LeadResponse | null>(null);
  leadSources = signal<LeadSourceResponse[]>([]);
  salesUsers = signal<UserResponse[]>([]);
  leadId = signal<number>(0);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // leadStatuses = [
  //   { value: 'NEW', label: 'New', icon: '🆕' },
  //   { value: 'CONTACTED', label: 'Contacted', icon: '📞' },
  //   { value: 'INTERESTED', label: 'Interested', icon: '⭐' },
  //   { value: 'QUALIFIED', label: 'Qualified', icon: '✨' },
  //   { value: 'NEGOTIATION', label: 'Negotiation', icon: '💬' },
  //   { value: 'CONVERTED', label: 'Converted', icon: '✅' },
  //   { value: 'LOST', label: 'Lost', icon: '❌' }
  // ];

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.leadForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.email]],
      courseInterested: ['', [Validators.required]],
      collegeName: [''],
      qualification: [''],
      experience: [''],
      interestLevel: ['MEDIUM'],
      sourceId: [null, [Validators.required]], // ✅ Changed from leadSourceId
      comments: [''],
    });
  }

  loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid lead ID');
      return;
    }

    this.leadId.set(Number(id));
    this.isLoading.set(true);

    Promise.all([
      this.loadLeadDetails(),
      this.loadLeadSources(),
    ])
      .then(() => {
        this.populateForm(); // ✅ Move here after data loads
        this.isLoading.set(false);
      })
      .catch((error) => {
        this.errorMessage.set('Failed to load lead details');
        this.isLoading.set(false);
        console.error('Error loading data:', error);
      });
  }

  loadLeadDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.leadService.getLeadById(this.leadId()).subscribe({
        next: (lead) => {
          this.currentLead.set(lead);
          resolve();
        },
        error: reject,
      });
    });
  }

  loadLeadSources(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.leadSourceService.getAllLeadSources().subscribe({
        next: (sources) => {
          this.leadSources.set(sources);
          resolve();
        },
        error: reject,
      });
    });
  }

  loadSalesUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          const salesUsers = users.filter(
            (u) => u.roleName === 'ROLE_SALES_EXECUTIVE' || u.roleName === 'ROLE_ADMIN',
          );
          this.salesUsers.set(salesUsers);

          // Populate form after users are loaded
          this.populateForm();
          resolve();
        },
        error: reject,
      });
    });
  }

  // populateForm(): void {
  //   const lead = this.currentLead();
  //   if (!lead) return;

  //   // ✅ Find source by sourceId (backend sends sourceId, not sourceName)
  //   const source = this.leadSources().find((s) => s.sourceId === lead.sourceId);

  //   // Find assignedToUserId by userId
  //   const assignedUser = this.salesUsers().find((u) => u.userId === lead.assignedToUserId);

  //   this.leadForm.patchValue({
  //     fullName: lead.fullName,
  //     contactNumber: lead.contactNumber,
  //     email: lead.email || '',
  //     courseInterested: lead.courseInterested,
  //     collegeName: lead.collegeName || '',
  //     qualification: lead.qualification || '',
  //     experience: lead.experience || '',
  //     interestLevel: lead.interestLevel || 'MEDIUM',
  //     sourceId: source?.sourceId || null, // ✅ Changed from leadSourceId
  //     comments: lead.comments || '',
  //   });
  // }

  populateForm(): void {
  const lead = this.currentLead();
  if (!lead) return;

  // ✅ No need to find sales user - just populate lead data
  const source = this.leadSources().find(s => s.sourceId === lead.sourceId);

  this.leadForm.patchValue({
    fullName: lead.fullName,
    contactNumber: lead.contactNumber,
    email: lead.email || '',
    courseInterested: lead.courseInterested,
    collegeName: lead.collegeName || '',
    qualification: lead.qualification || '',
    experience: lead.experience || '',
    interestLevel: lead.interestLevel || 'MEDIUM',
    sourceId: source?.sourceId || null,
    comments: lead.comments || ''
  });
}

  // onSubmit(): void {
  //   if (this.leadForm.invalid) {
  //     this.leadForm.markAllAsTouched();
  //     return;
  //   }

  //   this.isSubmitting.set(true);
  //   this.errorMessage.set('');

  //   const formValue = this.leadForm.value;

  //   // Remove empty optional fields
  //   if (!formValue.email) delete formValue.email;
  //   if (!formValue.collegeName) delete formValue.collegeName;
  //   if (!formValue.qualification) delete formValue.qualification;
  //   if (!formValue.experience) delete formValue.experience;
  //   if (!formValue.comments) delete formValue.comments;

  //   const updateRequest: UpdateLeadRequest = formValue;

  //   this.leadService.updateLead(this.leadId(), updateRequest).subscribe({
  //     next: (response) => {
  //       this.isSubmitting.set(false);
  //       this.successMessage.set('Lead updated successfully!');
  //       setTimeout(() => {
  //         this.router.navigate(['/admin-dashboard/leads']);
  //       }, 1500);
  //     },
  //     error: (error) => {
  //       this.isSubmitting.set(false);
  //       this.errorMessage.set(error.error?.message || 'Failed to update lead. Please try again.');
  //       console.error('Update lead error:', error);
  //     },
  //   });
  // }
onSubmit(): void {
  if (this.leadForm.invalid) {
    this.leadForm.markAllAsTouched();
    return;
  }

  this.isSubmitting.set(true);
  this.errorMessage.set('');

  const formValue = this.leadForm.value;

  if (!formValue.email) delete formValue.email;
  if (!formValue.collegeName) delete formValue.collegeName;
  if (!formValue.qualification) delete formValue.qualification;
  if (!formValue.experience) delete formValue.experience;
  if (!formValue.comments) delete formValue.comments;

  const updateRequest: UpdateLeadRequest = formValue;

  this.leadService.updateLead(this.leadId(), updateRequest).subscribe({
    next: (response) => {
      this.isSubmitting.set(false);
      this.successMessage.set('Lead updated successfully!');
      setTimeout(() => {
        this.router.navigate(['../..'], { relativeTo: this.route }); // ✅ 2 levels up
      }, 1500);
    },
    error: (error) => {
      this.isSubmitting.set(false);
      this.errorMessage.set(error.error?.message || 'Failed to update lead. Please try again.');
      console.error('Update lead error:', error);
    },
  });
}

cancel(): void {
  this.router.navigate(['../..'], { relativeTo: this.route }); // ✅ 2 levels up
}


  // Form getters
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
    // ✅ Changed from leadSourceId
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
