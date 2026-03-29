import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeadResponse, LeadService } from '../../../../core/services/lead/lead.service';
import { UpdateFollowUpRequest, FollowUpResponse } from '../../../../core/models/follow-up.model';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { FollowUpService } from '../../../../core/services/followup/follow-up.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';


@Component({
  selector: 'app-follow-up-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './follow-up-edit.html',
  styleUrls: ['./follow-up-edit.css']
})
export class FollowUpEdit implements OnInit {
  private fb = inject(FormBuilder);
  private followUpService = inject(FollowUpService);
  private leadService = inject(LeadService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);

  followUpForm!: FormGroup;
  followUpId = signal<number>(0);
  currentFollowUp = signal<FollowUpResponse | null>(null);
  leads = signal<LeadResponse[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  followUpTypes = ['CALL', 'EMAIL', 'VISIT', 'WHATSAPP'];
  followUpStatuses = ['SCHEDULED', 'COMPLETED', 'MISSED'];

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
  }

  private getFollowUpsListRoute(): string {
    return this.authService.isSalesExecutive() ? '/sales-dashboard/follow-ups' : '/admin-dashboard/follow-ups';
  }

  private initializeForm(): void {
    this.followUpForm = this.fb.group({
      followUpDate: ['', [Validators.required]],
      followUpType: ['CALL', [Validators.required]],
      notes: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      nextFollowUpDate: ['', [Validators.required]],
      status: ['SCHEDULED', [Validators.required]]
    });
  }

  private loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid follow-up ID');
      return;
    }

    this.followUpId.set(Number(id));
    this.isLoading.set(true);

    Promise.all([
      this.loadFollowUpDetails(),
      this.loadLeads()
    ]).then(() => {
      this.isLoading.set(false);
    }).catch(error => {
      this.errorMessage.set('Failed to load data');
      this.isLoading.set(false);
      console.error('Error loading data:', error);
    });
  }

  private loadFollowUpDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.followUpService.getFollowUpById(this.followUpId()).subscribe({
        next: (followUp) => {
          this.currentFollowUp.set(followUp);
          this.populateForm(followUp);
          resolve();
        },
        error: (error) => {
          console.error('Error loading follow-up:', error);
          reject(error);
        }
      });
    });
  }

  private loadLeads(): Promise<void> {
    return new Promise((resolve, reject) => {
      const leads$ = this.authService.isSalesExecutive()
        ? this.leadService.getMyLeads()
        : this.leadService.getAllLeads();

      leads$.subscribe({
        next: (data) => {
          const activeLeads = data.filter(l => 
            l.status !== 'CONVERTED' && l.status !== 'LOST'
          );
          this.leads.set(activeLeads);
          resolve();
        },
        error: (error) => {
          console.error('Error loading leads:', error);
          reject(error);
        }
      });
    });
  }

  private populateForm(followUp: FollowUpResponse): void {
    this.followUpForm.patchValue({
      followUpDate: followUp.followUpDate,
      followUpType: followUp.followUpType,
      notes: followUp.notes,
      nextFollowUpDate: followUp.nextFollowUpDate,
      status: followUp.status
    });
  }

  onSubmit(): void {
    if (this.followUpForm.invalid) {
      this.followUpForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }

    const formValue = this.followUpForm.value;

    // Validate dates
    if (formValue.nextFollowUpDate <= formValue.followUpDate) {
      this.errorMessage.set('Next follow-up date must be after follow-up date');
      return;
    }

    const request: UpdateFollowUpRequest = {
      followUpDate: formValue.followUpDate,
      followUpType: formValue.followUpType,
      notes: formValue.notes,
      nextFollowUpDate: formValue.nextFollowUpDate,
      status: formValue.status
    };

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.followUpService.updateFollowUp(this.followUpId(), request).subscribe({
      next: (response) => {
        console.log('Follow-up updated:', response);
        this.successMessage.set('Follow-up updated successfully!');
        setTimeout(() => {
          this.router.navigate([this.getFollowUpsListRoute()]);
        }, 1500);
      },
      error: (error) => {
        console.error('Error updating follow-up:', error);
        this.errorMessage.set(
          error.error?.message || 'Failed to update follow-up. Please try again.'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate([this.getFollowUpsListRoute()]);
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
