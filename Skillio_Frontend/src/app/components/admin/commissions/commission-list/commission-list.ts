import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { CommissionDTO, CommissionService, ApproveCommissionRequest } from '../../../../core/services/commission/commission-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { ConfirmationDialogComponent } from '../../../confirmation-dialog/confirmation-dialog-component/confirmation-dialog-component';

@Component({
  selector: 'app-commission-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmationDialogComponent],
  templateUrl: './commission-list.html',
  styleUrls: ['./commission-list.css']
})
export class CommissionListComponent implements OnInit {

  private commissionService = inject(CommissionService);
  private confirmationService = inject(ConfirmationService);
  public authService = inject(AuthService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  commissions = signal<CommissionDTO[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedStatus = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');

  showApproveModal = signal(false);
  selectedCommission = signal<CommissionDTO | null>(null);
  approveAction = signal<'approve' | 'reject'>('approve');
  adminComments = signal('');
  isSubmitting = signal(false);

  statusOptions = ['ALL', 'PENDING', 'PENDING_APPROVAL', 'APPROVED', 'ELIGIBLE', 'PAID', 'REJECTED'];

  filteredCommissions = computed(() => {
    let filtered = this.commissions();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(c =>
        c.studentName?.toLowerCase().includes(term) ||
        c.courseName?.toLowerCase().includes(term) ||
        c.salesExecutiveName?.toLowerCase().includes(term)
      );
    }
    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter(c => c.status === this.selectedStatus());
    }
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  stats = computed(() => {
    const all = this.commissions();
    return {
      total: all.length,
      pending: all.filter(c => c.status === 'PENDING' || c.status === 'PENDING_APPROVAL').length,
      eligible: all.filter(c => c.status === 'ELIGIBLE').length,
      paid: all.filter(c => c.status === 'PAID').length,
      totalAmount: all.reduce((s, c) => s + (c.eligibleAmount || 0), 0),
      pendingAmount: all.filter(c => c.status === 'PENDING' || c.status === 'PENDING_APPROVAL')
                        .reduce((s, c) => s + (c.eligibleAmount || 0), 0),
      eligibleAmount: all.filter(c => c.status === 'ELIGIBLE')
                         .reduce((s, c) => s + (c.eligibleAmount || 0), 0),
      paidAmount: all.filter(c => c.status === 'PAID')
                     .reduce((s, c) => s + (c.eligibleAmount || 0), 0),
    };
  });

  ngOnInit(): void {
    this.loadCommissions();
  }

  loadCommissions(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    // ✅ FIX: authService.isSalesExecutive() — method call with ()
    const obs = this.authService.isSalesExecutive()
      ? this.commissionService.getMyCommissions()
      : this.commissionService.getAllCommissions();

    obs.subscribe({
      next: (data) => { this.commissions.set(data); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load commissions'); this.isLoading.set(false); }
    });
  }

  navigateToCreate(): void {
    // ✅ FIX: isAdmin() — method call with ()
    const base = this.authService.isAdmin() ? '/admin-dashboard' : '/sales-dashboard';
    this.router.navigate([`${base}/commissions/create`]);
  }

  navigateToEdit(id: number): void {
    // ✅ FIX: isAdmin() — method call with ()
    const base = this.authService.isAdmin() ? '/admin-dashboard' : '/sales-dashboard';
    this.router.navigate([`${base}/commissions/edit`, id]);
  }

  openApproveModal(commission: CommissionDTO, action: 'approve' | 'reject'): void {
    this.selectedCommission.set(commission);
    this.approveAction.set(action);
    this.adminComments.set('');
    this.errorMessage.set('');
    this.showApproveModal.set(true);
  }

  closeApproveModal(): void {
    this.showApproveModal.set(false);
    this.selectedCommission.set(null);
    this.adminComments.set('');
    this.isSubmitting.set(false);
  }

  submitApproveReject(): void {
    const commission = this.selectedCommission();
    if (!commission) return;

    const trimmedComments = this.adminComments().trim();
    if (this.approveAction() === 'reject' && !trimmedComments) {
      this.errorMessage.set('Rejection comment is required');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request: ApproveCommissionRequest = {
      commissionId: commission.commissionId,
      approved: this.approveAction() === 'approve',
    };

    if (trimmedComments) {
      request.comments = trimmedComments;
    }

    this.commissionService.approveOrRejectCommission(request).subscribe({
      next: () => {
        const msg = this.approveAction() === 'approve'
          ? 'Commission approved successfully!'
          : ' Commission rejected.';
        this.successMessage.set(msg);
        this.closeApproveModal();
        this.loadCommissions();
        this.isSubmitting.set(false);
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Action failed');
        this.isSubmitting.set(false);
      }
    });
  }

  async markAsEligible(id: number, name: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Mark as Eligible',
      message: `Mark commission for ${name} as ELIGIBLE for payment?`,
      confirmText: 'Mark Eligible', cancelText: 'Cancel', type: 'info', icon: 'verified'
    });
    if (confirmed) {
      this.commissionService.markAsEligible(id).subscribe({
        next: () => { this.successMessage.set('Marked as eligible!'); this.loadCommissions(); setTimeout(() => this.successMessage.set(''), 3000); },
        error: () => this.errorMessage.set('Failed to update')
      });
    }
  }

  async markAsPaid(id: number, name: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Mark as Paid',
      message: `Mark commission for ${name} as PAID?`,
      confirmText: 'Mark Paid', cancelText: 'Cancel', type: 'success', icon: 'check_circle'
    });
    if (confirmed) {
      this.commissionService.markAsPaid(id).subscribe({
        next: () => { this.successMessage.set('Commission marked as paid!'); this.loadCommissions(); setTimeout(() => this.successMessage.set(''), 3000); },
        error: () => this.errorMessage.set('Failed to update')
      });
    }
  }

  async deleteCommission(id: number, name: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Commission',
      message: `Delete commission for ${name}? This cannot be undone.`,
      confirmText: 'Delete', cancelText: 'Cancel', type: 'danger', icon: 'delete'
    });
    if (confirmed) {
      this.commissionService.deleteCommission(id).subscribe({
        next: () => { this.successMessage.set('Commission deleted!'); this.loadCommissions(); setTimeout(() => this.successMessage.set(''), 3000); },
        error: () => this.errorMessage.set('Failed to delete')
      });
    }
  }

  getStatusClass(status: string): string {
    const map: { [k: string]: string } = {
      'PENDING': 'status-pending',
      'PENDING_APPROVAL': 'status-pending-approval',
      'APPROVED': 'status-approved',
      'ELIGIBLE': 'status-eligible',
      'PAID': 'status-paid',
      'REJECTED': 'status-rejected'
    };
    return map[status] || 'status-pending';
  }

  getStatusIcon(status: string): string {
    const map: { [k: string]: string } = {
      'PENDING': 'pending',
      'PENDING_APPROVAL': 'hourglass_top',
      'APPROVED': 'thumb_up',
      'ELIGIBLE': 'verified',
      'PAID': 'check_circle',
      'REJECTED': 'cancel'
    };
    return map[status] || 'pending';
  }

  updateSearchTerm(value: string): void { this.searchTerm.set(value); }
  updateStatus(value: string): void { this.selectedStatus.set(value); }
}
