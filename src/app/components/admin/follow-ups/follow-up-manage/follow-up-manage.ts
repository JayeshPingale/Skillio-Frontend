import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule, NavigationEnd } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeadResponse, LeadService } from '../../../../core/services/lead/lead.service';
import { FollowUpRequest, UpdateFollowUpRequest, FollowUpResponse } from '../../../../core/models/follow-up.model';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { FollowUpService } from '../../../../core/services/followup/follow-up.service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-follow-up-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './follow-up-manage.html',
  styleUrls: ['./follow-up-manage.css']
})
export class FollowUpManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private followUpService = inject(FollowUpService);
  private leadService = inject(LeadService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmationService = inject(ConfirmationService);
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);
  followUpForm!: FormGroup;
  followUpId = signal<number | null>(null);
  currentFollowUp = signal<FollowUpResponse | null>(null);
  leads = signal<LeadResponse[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  isEditMode = signal(false);
  
  preSelectedLeadId = signal<number | null>(null);
  preSelectedLeadName = signal<string>('');
  isLeadLocked = signal(false);

  followUpTypes = ['CALL', 'EMAIL', 'VISIT', 'WHATSAPP'];
  followUpStatuses = ['SCHEDULED', 'COMPLETED', 'MISSED'];

  get todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get tomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  private getFollowUpsListRoute(): string {
    return this.authService.isSalesExecutive() ? '/sales-dashboard/follow-ups' : '/admin-dashboard/follow-ups';
  }

  ngOnInit(): void {
    console.log('✅ Component Init Started');
    
    this.initializeForm();
    this.checkEditMode();
    this.loadLeads();
    
    // ✅ SOLUTION 1: Wait for NavigationEnd event
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        console.log('🔄 Navigation ended, checking query params...');
        this.loadQueryParams();
      });
    
    // ✅ SOLUTION 2: Also try immediate load with delay
    setTimeout(() => {
      console.log('⏰ Delayed query param check...');
      this.loadQueryParams();
    }, 100);
    
    // ✅ SOLUTION 3: Subscribe to queryParams observable
    this.route.queryParams.subscribe(params => {
      console.log('📡 QueryParams subscription fired:', params);
      if (params && Object.keys(params).length > 0) {
        this.loadQueryParams();
      }
    });
  }

  private loadQueryParams(): void {
    const params = this.route.snapshot.queryParams;
    console.log('🔍 Loading Query Params:', params);
    
    if (params && params['leadId'] && !this.isEditMode()) {
      const leadId = Number(params['leadId']);
      const leadName = decodeURIComponent(params['leadName'] || 'Selected Lead');
      
      console.log('✅ Setting lead:', leadId, leadName);
      
      // Prevent duplicate setting
      if (this.preSelectedLeadId() === leadId) {
        console.log('⚠️ Lead already set, skipping...');
        return;
      }
      
      this.preSelectedLeadId.set(leadId);
      this.preSelectedLeadName.set(leadName);
      this.isLeadLocked.set(true);
      
      this.followUpForm.patchValue({ leadId: leadId });
      
      console.log('✅ Form value after patch:', this.followUpForm.value);
      
      this.successMessage.set(`Creating follow-up for: ${leadName}`);
      setTimeout(() => this.successMessage.set(''), 3000);
    } else {
      console.log('❌ No valid leadId in params or edit mode:', {
        hasParams: !!params,
        hasLeadId: !!params?.['leadId'],
        isEditMode: this.isEditMode(),
        params: params
      });
    }
  }

  private initializeForm(): void {
    this.followUpForm = this.fb.group({
      leadId: ['', [Validators.required]],
      followUpDate: [this.todayDate, [Validators.required]],
      followUpType: ['CALL', [Validators.required]],
      notes: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      nextFollowUpDate: [this.tomorrowDate, [Validators.required]],
      status: ['SCHEDULED', [Validators.required]]
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.followUpId.set(Number(id));
      this.isLeadLocked.set(false);
      this.loadFollowUpDetails();
    } else {
      this.isEditMode.set(false);
    }
  }

  private loadFollowUpDetails(): void {
    this.isLoading.set(true);

    this.followUpService.getFollowUpById(this.followUpId()!).subscribe({
      next: (followUp) => {
        this.currentFollowUp.set(followUp);
        this.populateForm(followUp);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading follow-up:', error);
        this.isLoading.set(false);
        this.confirmationService.confirm({
          title: 'Load Failed',
          message: 'Failed to load follow-up details.',
          type: 'danger',
          confirmText: 'Back to List',
          cancelText: 'Close'
        }).then(() => this.router.navigate([this.getFollowUpsListRoute()]));
      }
    });
  }

private loadLeads(): void {
  const isSalesExec = this.authService.isSalesExecutive();
  const leads$ = isSalesExec
    ? this.leadService.getMyLeads() // ✅ Sales: sirf assigned leads
    : this.leadService.getAllLeads(); // ✅ Admin: sab leads

  leads$.subscribe({
    next: (data) => {
      const activeLeads = data.filter(l =>
        l.status !== 'CONVERTED' && l.status !== 'LOST'
      );
      this.leads.set(activeLeads);
      console.log('✅ Loaded leads:', activeLeads.length);
    },
    error: (error) => {
      console.error('❌ Error loading leads:', error);
      this.confirmationService.confirm({
        title: 'Load Failed',
        message: 'Failed to load leads list.',
        type: 'danger',
        confirmText: 'OK',
        cancelText: 'Close'
      });
    }
  });}
  private populateForm(followUp: FollowUpResponse): void {
    this.followUpForm.patchValue({
      leadId: followUp.leadId,
      followUpDate: followUp.followUpDate,
      followUpType: followUp.followUpType,
      notes: followUp.notes,
      nextFollowUpDate: followUp.nextFollowUpDate,
      status: followUp.status
    });
  }

  unlockLead(): void {
    this.isLeadLocked.set(false);
    this.preSelectedLeadId.set(null);
    this.preSelectedLeadName.set('');
    this.followUpForm.patchValue({ leadId: '' });
  }

  getLeadDetails(): string {
    if (this.preSelectedLeadId()) {
      const lead = this.leads().find(l => l.leadId === this.preSelectedLeadId());
      if (lead) {
        return `${lead.fullName} - ${lead.courseInterested}`;
      }
      return this.preSelectedLeadName();
    }
    return '';
  }

  onSubmit(): void {
    if (this.followUpForm.invalid) {
      this.followUpForm.markAllAsTouched();
      this.confirmationService.confirm({
        title: 'Validation Error',
        message: 'Please fill all required fields correctly.',
        type: 'warning',
        confirmText: 'OK',
        cancelText: 'Close'
      });
      return;
    }

    const formValue = this.followUpForm.value;

    if (formValue.nextFollowUpDate <= formValue.followUpDate) {
      this.confirmationService.confirm({
        title: 'Invalid Dates',
        message: 'Next follow-up date must be after follow-up date.',
        type: 'warning',
        confirmText: 'OK',
        cancelText: 'Close'
      });
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    if (this.isEditMode()) {
      this.updateFollowUp(formValue);
    } else {
      this.createFollowUp(formValue);
    }
  }

// ✅ REPLACE cancel() method
cancel(): void {
  if (this.isEditMode()) {
    // Edit: /follow-ups/edit/5 → ../.. → /follow-ups
    this.router.navigate(['../..'], { relativeTo: this.route });
  } else {
    // Create: /follow-ups/create → .. → /follow-ups
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}

// ✅ UPDATE createFollowUp() success handler
private createFollowUp(formValue: any): void {
  const request: FollowUpRequest = {
    leadId: Number(formValue.leadId),
    followUpDate: formValue.followUpDate,
    followUpType: formValue.followUpType,
    notes: formValue.notes,
    nextFollowUpDate: formValue.nextFollowUpDate
  };

  this.followUpService.createFollowUp(request).subscribe({
    next: () => {
      this.isSubmitting.set(false);
      this.confirmationService.confirm({
        title: 'Follow-up Created',
        message: 'Follow-up scheduled successfully.',
        type: 'success',
        confirmText: 'Go to List',
        cancelText: 'Stay'
      }).then(confirmed => {
        if (confirmed) {
          // ✅ Same as cancel logic
          this.router.navigate(['..'], { relativeTo: this.route });
        } else {
          this.followUpForm.patchValue({
            followUpDate: this.todayDate,
            followUpType: 'CALL',
            notes: '',
            nextFollowUpDate: this.tomorrowDate,
            status: 'SCHEDULED',
            leadId: this.isLeadLocked() ? this.preSelectedLeadId() : ''
          });
        }
      });
    },
    error: (error) => {
      console.error('❌ Error creating follow-up:', error);
      this.isSubmitting.set(false);
      this.confirmationService.confirm({
        title: 'Create Failed',
        message: error.error?.message || 'Failed to create follow-up. Please try again.',
        type: 'danger',
        confirmText: 'OK',
        cancelText: 'Close'
      });
    }
  });
}

// ✅ UPDATE updateFollowUp() success handler
private updateFollowUp(formValue: any): void {
  const request: UpdateFollowUpRequest = {
    followUpDate: formValue.followUpDate,
    followUpType: formValue.followUpType,
    notes: formValue.notes,
    nextFollowUpDate: formValue.nextFollowUpDate,
    status: formValue.status
  };

  this.followUpService.updateFollowUp(this.followUpId()!, request).subscribe({
    next: () => {
      this.isSubmitting.set(false);
      this.confirmationService.confirm({
        title: 'Follow-up Updated',
        message: 'Follow-up updated successfully.',
        type: 'success',
        confirmText: 'Go to List',
        cancelText: 'Stay'
      }).then(confirmed => {
        if (confirmed) {
          // ✅ Same as cancel logic for edit
          this.router.navigate(['../..'], { relativeTo: this.route });
        }
      });
    },
    error: (error) => {
      console.error('❌ Error updating follow-up:', error);
      this.isSubmitting.set(false);
      this.confirmationService.confirm({
        title: 'Update Failed',
        message: error.error?.message || 'Failed to update follow-up. Please try again.',
        type: 'danger',
        confirmText: 'OK',
        cancelText: 'Close'
      });
    }
  });
}


  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'CALL': 'phone',
      'EMAIL': 'email',
      'VISIT': 'location_on',
      'WHATSAPP': 'chat'
    };
    return icons[type] || 'phone';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'SCHEDULED': 'schedule',
      'COMPLETED': 'check_circle',
      'MISSED': 'cancel'
    };
    return icons[status] || 'schedule';
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'SCHEDULED': 'status-scheduled',
      'COMPLETED': 'status-completed',
      'MISSED': 'status-missed'
    };
    return classes[status] || 'status-scheduled';
  }
}
