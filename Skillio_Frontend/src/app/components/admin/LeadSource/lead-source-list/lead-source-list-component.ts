import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadSourceService, LeadSourceResponse } from '../../../../core/services/leadSource/lead-source.service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-lead-source-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './lead-source-list-component.html',
  styleUrls: ['./lead-source-list-component.css']
})
export class LeadSourceListComponent implements OnInit {
  private leadSourceService = inject(LeadSourceService);
  private confirmationService = inject(ConfirmationService);

  leadSources = signal<LeadSourceResponse[]>([]);
  filteredLeadSources = signal<LeadSourceResponse[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  filterStatus = signal<'all' | 'active' | 'inactive'>('all');

  ngOnInit(): void {
    this.loadLeadSources();
  }

  loadLeadSources(): void {
    this.isLoading.set(true);
    this.leadSourceService.getAllLeadSources().subscribe({
      next: (sources) => {
        this.leadSources.set(sources);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading lead sources:', error);
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.leadSources();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(source =>
        source.name.toLowerCase().includes(term) ||
        source.channel.toLowerCase().includes(term) ||
        source.description.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus() === 'active') {
      filtered = filtered.filter(source => source.isActive);
    } else if (this.filterStatus() === 'inactive') {
      filtered = filtered.filter(source => !source.isActive);
    }

    this.filteredLeadSources.set(filtered);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.applyFilters();
  }

  onFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.filterStatus.set(status);
    this.applyFilters();
  }

  getActiveCount(): number {
    return this.leadSources().filter(s => s.isActive).length;
  }

  getInactiveCount(): number {
    return this.leadSources().filter(s => !s.isActive).length;
  }

  toggleStatus(source: LeadSourceResponse): void {
    this.confirmationService.confirm({
      title: source.isActive ? 'Deactivate Source' : 'Activate Source',
      message: `Are you sure you want to ${source.isActive ? 'deactivate' : 'activate'} "${source.name}"?`,
      type: 'warning',
      confirmText: source.isActive ? 'Deactivate' : 'Activate',
      cancelText: 'Cancel'
    }).then(confirmed => {
      if (!confirmed) return;

      this.leadSourceService.toggleLeadSourceStatus(source.sourceId).subscribe({
        next: () => {
          this.loadLeadSources();
          this.confirmationService.confirm({
            title: 'Status Updated',
            message: `"${source.name}" status updated successfully.`,
            type: 'success',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        },
        error: (error) => {
          console.error('Error toggling status:', error);
          this.confirmationService.confirm({
            title: 'Failed',
            message: 'Failed to toggle status. Please try again.',
            type: 'danger',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        }
      });
    });
  }

  deleteLeadSource(source: LeadSourceResponse): void {
    this.confirmationService.confirm({
      title: 'Delete Lead Source',
      message: `Are you sure you want to delete "${source.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }).then(confirmed => {
      if (!confirmed) return;

      this.leadSourceService.deleteLeadSource(source.sourceId).subscribe({
        next: () => {
          this.loadLeadSources();
          this.confirmationService.confirm({
            title: 'Deleted',
            message: `"${source.name}" deleted successfully.`,
            type: 'success',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        },
        error: (error) => {
          console.error('Error deleting lead source:', error);
          this.confirmationService.confirm({
            title: 'Delete Failed',
            message: 'Failed to delete lead source. Please try again.',
            type: 'danger',
            confirmText: 'OK',
            cancelText: 'Close'
          });
        }
      });
    });
  }

  getChannelBadgeClass(channel: string): string {
    const channelMap: { [key: string]: string } = {
      'SOCIAL_MEDIA': 'badge-purple',
      'ORGANIC': 'badge-green',
      'PAID_ADS': 'badge-blue',
      'REFERRAL': 'badge-orange',
      'COLD_CALLING': 'badge-red'
    };
    return channelMap[channel] || 'badge-gray';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
