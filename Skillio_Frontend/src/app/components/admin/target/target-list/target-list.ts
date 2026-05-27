import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { TargetService, TargetDTO } from '../../../../core/services/target/target.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';  // ✅ ADD
import { ConfirmationDialogComponent } from '../../../confirmation-dialog/confirmation-dialog-component/confirmation-dialog-component';

@Component({
  selector: 'app-target-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmationDialogComponent],  // ✅ ADD
  templateUrl: './target-list.html',
  styleUrls: ['./target-list.css'],
})
export class TargetListComponent implements OnInit {
  private targetService = inject(TargetService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);  // ✅ ADD

  targets = signal<TargetDTO[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedStatus = signal('ALL');
  selectedPeriod = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');

  isSalesExec = computed(() => this.authService.isSalesExecutive());
  isAdmin = computed(() => this.authService.isAdmin());
  statusOptions = ['ALL', 'ACTIVE', 'ON_TRACK', 'AT_RISK', 'COMPLETED'];
  periodOptions = ['ALL', 'MONTHLY', 'QUARTERLY'];

  // Filtered targets
  filteredTargets = computed(() => {
    let filtered = this.targets();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(
        (t) => t.userName.toLowerCase().includes(term) || t.userEmail.toLowerCase().includes(term),
      );
    }

    // Status filter
    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter((t) => t.status === this.selectedStatus());
    }

    // Period filter
    if (this.selectedPeriod() !== 'ALL') {
      filtered = filtered.filter((t) => t.targetPeriod === this.selectedPeriod());
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  // Stats
  stats = computed(() => {
    const all = this.targets();
    const active = all.filter((t) => t.status === 'ACTIVE');
    const onTrack = all.filter((t) => t.status === 'ON_TRACK');
    const atRisk = all.filter((t) => t.status === 'AT_RISK');
    const completed = all.filter((t) => t.status === 'COMPLETED');

    return {
      total: all.length,
      active: active.length,
      onTrack: onTrack.length,
      atRisk: atRisk.length,
      completed: completed.length,
    };
  });

  ngOnInit(): void {
    this.loadTargets();
  }

  loadTargets(): void {
    console.log('🔍 Loading Targets...');
    this.isLoading.set(true);
    this.errorMessage.set('');

    const isSalesExec = this.authService.isSalesExecutive();
    const targets$ = isSalesExec
      ? this.targetService.getMyTargets()
      : this.targetService.getAllTargets();

    targets$.subscribe({
      next: (data) => {
        console.log('✅ Targets Loaded:', data);
        this.targets.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error Loading Targets:', error);
        this.errorMessage.set('Failed to load targets');
        this.isLoading.set(false);
      }
    });
  }

  navigateToCreate(): void {
    if (!this.isAdmin()) {
      alert('Only admins can create targets');
      return;
    }
    this.router.navigate(['/admin-dashboard/targets/create']);
  }

  navigateToEdit(id: number): void {
    if (!this.isAdmin()) {
      alert('Only admins can edit targets');
      return;
    }
    this.router.navigate(['/admin-dashboard/targets/edit', id]);
  }

  navigateToUpdateAchievement(id: number): void {
    this.router.navigate(['/admin-dashboard/targets/update-achievement', id]);
  }

  // ✅ UPDATED: Use Custom Confirmation Dialog
  async markAsCompleted(id: number, userName: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Mark as Completed?',
      message: `Are you sure you want to mark the target for "${userName}" as completed? This action cannot be undone.`,
      confirmText: 'Mark Complete',
      cancelText: 'Cancel',
      type: 'success',  // ✅ Green success color
      icon: 'check_circle'
    });

    if (confirmed) {
      this.targetService.markAsCompleted(id).subscribe({
        next: () => {
          this.successMessage.set('Target marked as completed successfully!');
          this.loadTargets();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error: any) => {
          console.error('❌ Error marking as completed:', error);
          this.errorMessage.set('Failed to mark target as completed');
          setTimeout(() => this.errorMessage.set(''), 3000);
        },
      });
    }
  }

  // ✅ UPDATED: Use Custom Confirmation Dialog
  async deleteTarget(id: number, userName: string): Promise<void> {
    if (!this.isAdmin()) {
      alert('Only admins can delete targets');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Target?',
      message: `Are you sure you want to delete the target for "${userName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',  // ✅ Red danger color
      icon: 'delete'
    });

    if (confirmed) {
      this.targetService.deleteTarget(id).subscribe({
        next: () => {
          this.successMessage.set('Target deleted successfully!');
          this.loadTargets();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('❌ Error deleting target:', error);
          this.errorMessage.set('Failed to delete target');
          setTimeout(() => this.errorMessage.set(''), 3000);
        }
      });
    }
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updateStatus(value: string): void {
    this.selectedStatus.set(value);
  }

  updatePeriod(value: string): void {
    this.selectedPeriod.set(value);
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      ACTIVE: 'status-active',
      ON_TRACK: 'status-on-track',
      AT_RISK: 'status-at-risk',
      COMPLETED: 'status-completed',
    };
    return classes[status] || 'status-active';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      ACTIVE: 'play_circle',
      ON_TRACK: 'trending_up',
      AT_RISK: 'warning',
      COMPLETED: 'check_circle',
    };
    return icons[status] || 'play_circle';
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 80) return 'progress-success';
    if (percentage >= 50) return 'progress-warning';
    return 'progress-danger';
  }
}
