import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeadResponse, LeadService } from '../../../../core/services/lead/lead.service';
import { FollowUpService } from '../../../../core/services/followup/follow-up.service';
import { FollowUpRequest } from '../../../../core/models/follow-up.model';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-follow-up-create',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './follow-up-create.html',
  styleUrls: ['./follow-up-create.css']
})
export class FollowUpCreate implements OnInit {
  private fb = inject(FormBuilder);
  private followUpService = inject(FollowUpService);
  private leadService = inject(LeadService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);

  followUpForm!: FormGroup;
  leads = signal<LeadResponse[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  followUpTypes = ['CALL', 'EMAIL', 'VISIT', 'WHATSAPP'];

  ngOnInit(): void {
    this.initializeForm();
    this.loadLeads();
  }

  private getFollowUpsListRoute(): string {
    return this.authService.isSalesExecutive() ? '/sales-dashboard/follow-ups' : '/admin-dashboard/follow-ups';
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    this.followUpForm = this.fb.group({
      leadId: ['', [Validators.required]],
      followUpDate: [today, [Validators.required]],
      followUpType: ['CALL', [Validators.required]],
      notes: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      nextFollowUpDate: [tomorrowStr, [Validators.required]]
    });
  }

  private loadLeads(): void {
    this.isLoading.set(true);
    const leads$ = this.authService.isSalesExecutive()
      ? this.leadService.getMyLeads()
      : this.leadService.getAllLeads();

    leads$.subscribe({
      next: (data) => {
        // Filter only leads that are not converted/lost
        const activeLeads = data.filter(l => 
          l.status !== 'CONVERTED' && l.status !== 'LOST'
        );
        this.leads.set(activeLeads);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading leads:', error);
        this.errorMessage.set('Failed to load leads');
        this.isLoading.set(false);
      }
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

    const request: FollowUpRequest = {
      leadId: Number(formValue.leadId),
      followUpDate: formValue.followUpDate,
      followUpType: formValue.followUpType,
      notes: formValue.notes,
      nextFollowUpDate: formValue.nextFollowUpDate
    };

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.followUpService.createFollowUp(request).subscribe({
      next: (response) => {
        console.log('Follow-up created:', response);
        this.successMessage.set('Follow-up scheduled successfully!');
        setTimeout(() => {
          this.router.navigate([this.getFollowUpsListRoute()]);
        }, 1500);
      },
      error: (error) => {
        console.error('Error creating follow-up:', error);
        this.errorMessage.set(
          error.error?.message || 'Failed to create follow-up. Please try again.'
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
}
