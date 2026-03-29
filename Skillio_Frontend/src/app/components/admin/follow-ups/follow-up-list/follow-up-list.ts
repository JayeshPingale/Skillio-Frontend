import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FollowUpResponse } from '../../../../core/models/follow-up.model';
import { FollowUpService } from '../../../../core/services/followup/follow-up.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-follow-up-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './follow-up-list.html',
  styleUrls: ['./follow-up-list.css']
})
export class FollowUpList implements OnInit {
  private followUpService = inject(FollowUpService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  public themeService = inject(ThemeService);
 private authService = inject(AuthService);
 private route = inject(ActivatedRoute);
  followUps = signal<FollowUpResponse[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedStatus = signal('ALL');
  selectedType = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');
  public Math = Math;
  currentPage = signal(1);
  itemsPerPage = signal(7);

  followUpStatuses = ['ALL', 'SCHEDULED', 'COMPLETED', 'MISSED'];
  followUpTypes = ['ALL', 'CALL', 'EMAIL', 'VISIT', 'WHATSAPP'];

  filteredFollowUps = computed(() => {
    let filtered = this.followUps();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(f =>
        f.leadName.toLowerCase().includes(term) ||
        f.notes.toLowerCase().includes(term) ||
        f.createdByUserName.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter(f => f.status === this.selectedStatus());
    }

    if (this.selectedType() !== 'ALL') {
      filtered = filtered.filter(f => f.followUpType === this.selectedType());
    }

    return filtered;
  });

  stats = computed(() => {
    const all = this.followUps();
    const today = new Date().toISOString().split('T')[0];

    return {
      total: all.length,
      scheduled: all.filter(f => f.status === 'SCHEDULED').length,
      completed: all.filter(f => f.status === 'COMPLETED').length,
      dueToday: all.filter(f =>
        f.followUpDate === today && f.status === 'SCHEDULED'
      ).length,
      overdue: all.filter(f =>
        f.followUpDate < today && f.status === 'SCHEDULED'
      ).length
    };
  });

  totalItems = computed(() => this.filteredFollowUps().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  paginatedFollowUps = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredFollowUps().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadFollowUps();
  }

  loadFollowUps(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    const isSalesExec = this.authService.isSalesExecutive();
    const followUps$ = isSalesExec
      ? this.followUpService.getMyFollowUps() // ✅ Sales: sirf assigned leads ke follow-ups
      : this.followUpService.getAllFollowUps(); // ✅ Admin: sab follow-ups

    followUps$.subscribe({
      next: (data) => {
        this.followUps.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading follow-ups:', error);
        this.isLoading.set(false);
        this.confirmationService.confirm({
          title: 'Load Failed',
          message: 'Failed to load follow-ups.',
          type: 'danger',
          confirmText: 'OK',
          cancelText: 'Close'
        });
      }
    });
  }

navigateToCreate(): void {
  this.router.navigate(['create'], { relativeTo: this.route });
}

navigateToEdit(id: number): void {
  this.router.navigate(['edit', id], { relativeTo: this.route });
}

  markAsCompleted(id: number, leadName: string): void {
    this.confirmationService.confirm({
      title: 'Mark as Completed',
      message: `Mark follow-up for "${leadName}" as completed?`,
      type: 'success',
      confirmText: 'Mark Completed',
      cancelText: 'Cancel'
    }).then(confirmed => {
      if (!confirmed) return;

      this.followUpService.markFollowUpCompleted(id).subscribe({
        next: () => {
          this.loadFollowUps();
          this.confirmationService.confirm({
            title: 'Updated',
            message: 'Follow-up marked as completed.',
            type: 'success',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        },
        error: (error) => {
          console.error('Error marking follow-up:', error);
          this.confirmationService.confirm({
            title: 'Update Failed',
            message: 'Failed to mark follow-up as completed.',
            type: 'danger',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        }
      });
    });
  }

  deleteFollowUp(id: number, leadName: string): void {
    this.confirmationService.confirm({
      title: 'Delete Follow-up',
      message: `Delete follow-up for "${leadName}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }).then(confirmed => {
      if (!confirmed) return;

      this.followUpService.deleteFollowUp(id).subscribe({
        next: () => {
          this.loadFollowUps();
          this.confirmationService.confirm({
            title: 'Deleted',
            message: 'Follow-up deleted successfully.',
            type: 'success',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        },
        error: (error) => {
          console.error('Error deleting follow-up:', error);
          this.confirmationService.confirm({
            title: 'Delete Failed',
            message: 'Failed to delete follow-up.',
            type: 'danger',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        }
      });
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  updateSelectedStatus(value: string): void {
    this.selectedStatus.set(value);
    this.currentPage.set(1);
  }

  updateSelectedType(value: string): void {
    this.selectedType.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changeItemsPerPage(value: string): void {
    this.itemsPerPage.set(Number(value));
    this.currentPage.set(1);
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'SCHEDULED': 'status-scheduled',
      'COMPLETED': 'status-completed',
      'MISSED': 'status-missed'
    };
    return classes[status] || 'status-scheduled';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'SCHEDULED': 'schedule',
      'COMPLETED': 'check_circle',
      'MISSED': 'cancel'
    };
    return icons[status] || 'schedule';
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

  getTypeClass(type: string): string {
    return `type-${type.toLowerCase()}`;
  }

  isOverdue(date: string, status: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date < today && status === 'SCHEDULED';
  }

  isDueToday(date: string, status: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date === today && status === 'SCHEDULED';
  }
}
