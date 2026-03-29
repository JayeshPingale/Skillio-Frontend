import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { LeadSourceService } from '../../../../core/services/leadSource/lead-source.service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-lead-source-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './lead-source-edit.html',
  styleUrls: ['./lead-source-edit.css']
})
export class LeadSourceEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private leadSourceService = inject(LeadSourceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private confirmationService = inject(ConfirmationService);

  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal('');
  sourceId = signal<number>(0);

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
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.sourceId.set(id);
      this.loadLeadSource(id);
    });
  }

  loadLeadSource(id: number): void {
    this.isLoading.set(true);
    this.leadSourceService.getLeadSourceById(id).subscribe({
      next: (source) => {
        this.leadSourceForm.patchValue({
          name: source.name,
          channel: source.channel,
          description: source.description
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading lead source:', error);
        this.isLoading.set(false);
        this.confirmationService.confirm({
          title: 'Load Failed',
          message: 'Failed to load lead source. Please try again.',
          type: 'danger',
          confirmText: 'OK',
          cancelText: 'Close'
        }).then(() => this.router.navigate(['/admin-dashboard/lead-sources']));
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

    this.leadSourceService.updateLeadSource(this.sourceId(), this.leadSourceForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Updated',
          message: 'Lead source updated successfully.',
          type: 'success',
          confirmText: 'Back to List',
          cancelText: 'Stay'
        }).then(confirmed => {
          if (confirmed) {
            this.router.navigate(['/admin-dashboard/lead-sources']);
          }
        });
      },
      error: (error) => {
        console.error('Error updating lead source:', error);
        this.isSubmitting.set(false);
        this.confirmationService.confirm({
          title: 'Update Failed',
          message: error.error?.message || 'Failed to update lead source. Please try again.',
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
