import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BatchResponse, BatchService } from '../../../../core/services/batches/batch.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './batch-list.html',
  styleUrls: ['./batch-list.css']
})
export class BatchListComponent implements OnInit {
  private batchService = inject(BatchService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService); // ✅ Inject

  batches = signal<BatchResponse[]>([]);
  filteredBatches = signal<BatchResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  selectedFilter = signal('ALL');

  filterOptions = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.batchService.getAllBatches().subscribe({
      next: (data) => {
        this.batches.set(data);
        this.filteredBatches.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load batches. Please try again.');
        this.isLoading.set(false);
        console.error('Error loading batches:', error);
      }
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.filterBatches();
  }

  updateSelectedFilter(value: string): void {
    this.selectedFilter.set(value);
    this.filterBatches();
  }

  filterBatches(): void {
    let filtered = this.batches();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(batch => 
        batch.batchName.toLowerCase().includes(term) ||
        batch.courseName.toLowerCase().includes(term) ||
        batch.instructor.toLowerCase().includes(term) ||
        batch.batchCode.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.selectedFilter() !== 'ALL') {
      filtered = filtered.filter(batch => batch.status === this.selectedFilter());
    }

    this.filteredBatches.set(filtered);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin-dashboard/batches/create']);
  }

  navigateToEdit(batchId: number): void {
    this.router.navigate(['/admin-dashboard/batches/edit', batchId]);
  }

  // ✅ Updated Delete with Confirmation Dialog
  async deleteBatch(batchId: number, batchName: string, batchCode: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Batch?',
      message: `Are you sure you want to delete batch "${batchName}" (${batchCode})? This action cannot be undone. Students enrolled in this batch may be affected.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'delete'
    });

    if (confirmed) {
      this.batchService.deleteBatch(batchId).subscribe({
        next: () => {
          this.successMessage.set(`Batch "${batchName}" deleted successfully!`);
          this.loadBatches();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          const errorMsg = error.error?.message || 'Failed to delete batch. It may have active enrollments.';
          this.errorMessage.set(errorMsg);
          setTimeout(() => this.errorMessage.set(''), 5000);
          console.error('Delete error:', error);
        }
      });
    }
  }

  getBatchStats() {
    return {
      total: this.batches().length,
      upcoming: this.batches().filter(b => b.status === 'UPCOMING').length,
      ongoing: this.batches().filter(b => b.status === 'ONGOING').length,
      completed: this.batches().filter(b => b.status === 'COMPLETED').length
    };
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'UPCOMING': 'schedule',
      'ONGOING': 'play_circle',
      'COMPLETED': 'check_circle',
      'CANCELLED': 'cancel'
    };
    return icons[status] || 'help';
  }
}
