import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LeadStatusHistoryService, LeadStatusHistoryResponse } from '../../../../core/services/leadStatusHistory/lead-status-history.service';
@Component({
  selector: 'app-lead-status-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lead-status-history-component.html',
  styleUrls: ['./lead-status-history-component.css']
})
export class LeadStatusHistoryComponent implements OnInit {
  private historyService = inject(LeadStatusHistoryService);
  private route = inject(ActivatedRoute);

  history = signal<LeadStatusHistoryResponse[]>([]);
  filteredHistory = signal<LeadStatusHistoryResponse[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  filterStatus = signal<'all' | string>('all');
  viewMode = signal<'all' | 'by-lead' | 'by-user'>('all');
  selectedLeadId = signal<number | null>(null);

  // Unique statuses for filter
  get uniqueStatuses(): string[] {
    const statuses = new Set<string>();
    this.history().forEach(h => {
      statuses.add(h.oldStatus);
      statuses.add(h.newStatus);
    });
    return Array.from(statuses).sort();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['leadId']) {
        this.selectedLeadId.set(+params['leadId']);
        this.viewMode.set('by-lead');
        this.loadHistoryByLead(+params['leadId']);
      } else {
        this.loadAllHistory();
      }
    });
  }

  loadAllHistory(): void {
    this.isLoading.set(true);
    this.historyService.getAllHistory().subscribe({
      next: (data) => {
        this.history.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.isLoading.set(false);
      }
    });
  }

  loadHistoryByLead(leadId: number): void {
    this.isLoading.set(true);
    this.historyService.getHistoryByLead(leadId).subscribe({
      next: (data) => {
        this.history.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading history for lead:', error);
        this.isLoading.set(false);
      }
    });
  }

  loadMyHistory(): void {
    this.isLoading.set(true);
    this.viewMode.set('by-user');
    this.historyService.getMyHistory().subscribe({
      next: (data) => {
        this.history.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading my history:', error);
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.history();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(h =>
        h.leadName.toLowerCase().includes(term) ||
        h.changedByUserName.toLowerCase().includes(term) ||
        h.remarks.toLowerCase().includes(term) ||
        h.oldStatus.toLowerCase().includes(term) ||
        h.newStatus.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus() !== 'all') {
      filtered = filtered.filter(h =>
        h.oldStatus === this.filterStatus() || h.newStatus === this.filterStatus()
      );
    }

    this.filteredHistory.set(filtered);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.applyFilters();
  }

  onFilterChange(status: string): void {
    this.filterStatus.set(status);
    this.applyFilters();
  }

  // ✅ Helper methods for stats
  getUniqueLeadsCount(): number {
    const uniqueLeads = new Set(this.filteredHistory().map(h => h.leadId));
    return uniqueLeads.size;
  }

  getUniqueUsersCount(): number {
    const uniqueUsers = new Set(this.filteredHistory().map(h => h.changedByUserId));
    return uniqueUsers.size;
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'NEW': 'status-new',
      'CONTACTED': 'status-contacted',
      'INTERESTED': 'status-interested',
      'QUALIFIED': 'status-qualified',
      'NEGOTIATION': 'status-negotiation',
      'CONVERTED': 'status-converted',
      'LOST': 'status-lost',
      'FOLLOW_UP': 'status-followup'
    };
    return statusColors[status] || 'status-default';
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return this.formatDateTime(dateString);
  }
}
