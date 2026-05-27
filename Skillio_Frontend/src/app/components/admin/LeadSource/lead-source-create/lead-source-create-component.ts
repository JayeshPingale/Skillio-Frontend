import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LeadSourceService, LeadSourceResponse } from '../../../../core/services/leadSource/lead-source.service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-lead-source-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './lead-source-create-component.html',
  styleUrls: ['./lead-source-create-component.css']
})
export class LeadSourceCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leadSourceService = inject(LeadSourceService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);

  isSubmitting = signal(false);
  errorMessage = signal('');
  leadSources = signal<LeadSourceResponse[]>([]);

  channelOptions = [
    { value: 'SOCIAL_MEDIA', label: 'Social Media', icon: 'share' },
    { value: 'ORGANIC', label: 'Organic', icon: 'eco' },
    { value: 'PAID_ADS', label: 'Paid Ads', icon: 'paid' },
    { value: 'REFERRAL', label: 'Referral', icon: 'person_add' },
    { value: 'COLD_CALLING', label: 'Cold Calling', icon: 'call' }
  ];

  leadSourceForm: FormGroup = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50)
    ]],
    channel: ['', Validators.required],
    description: ['', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(200)
    ]]
  });

  get name() { return this.leadSourceForm.get('name'); }
  get channel() { return this.leadSourceForm.get('channel'); }
  get description() { return this.leadSourceForm.get('description'); }

  ngOnInit(): void {
    this.loadLeadSources();
  }

  loadLeadSources(): void {
    this.leadSourceService.getAllLeadSources().subscribe({
      next: (sources) => {
        this.leadSources.set(sources);
      },
      error: (error) => {
        console.error('Error loading lead sources:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.leadSourceForm.invalid) {
      this.leadSourceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.leadSourceService.createLeadSource(this.leadSourceForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Created',
          message: 'Lead source created successfully.',
          type: 'success',
          confirmText: 'Go to List',
          cancelText: 'Create Another'
        }).then(confirmed => {
          if (confirmed) {
            this.router.navigate(['/admin-dashboard/lead-sources']);
          } else {
            this.leadSourceForm.reset();
          }
        });
      },
      error: (error) => {
        console.error('Error creating lead source:', error);
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Create Failed',
          message: error.error?.message || 'Failed to create lead source. Please try again.',
          type: 'danger',
          confirmText: 'OK',
          cancelText: 'Close'
        });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/lead-sources']);
  }
}
