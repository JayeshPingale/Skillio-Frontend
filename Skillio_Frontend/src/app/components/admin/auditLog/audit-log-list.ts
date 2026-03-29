// src/app/components/admin/audit-logs/audit-log-list.ts

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme/theme-service';
import { AuditLogService, AuditLogDTO } from '../../../core/services/Audit-log/audit-log.service';
@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-log-list.html',
  styleUrls: ['./audit-log-list.css']
})
export class AuditLogListComponent implements OnInit {
  private auditLogService = inject(AuditLogService);
  public themeService = inject(ThemeService);

  auditLogs = signal<AuditLogDTO[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  // Filters
  searchTerm = signal('');
  selectedEntityType = signal('ALL');
  selectedAction = signal('ALL');
  startDate = signal('');
  endDate = signal('');

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(7);

  // Modal
  showDetailsModal = signal(false);
  selectedLog = signal<AuditLogDTO | null>(null);

  entityTypes = [
    'ALL', 'Lead', 'Student', 'Enrollment', 'Payment', 
    'PaymentInstallment', 'Commission', 'CommissionPayment',
    'Target', 'Batch', 'Course', 'User', 'Role'
  ];

  actionTypes = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'UPDATE_ACHIEVEMENT', 'MARK_COMPLETED'];

  // Filtered audit logs
  filteredLogs = computed(() => {
    let filtered = this.auditLogs();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(log =>
        log.performedByUserName.toLowerCase().includes(term) ||
        log.performedByUserEmail.toLowerCase().includes(term) ||
        log.entityType.toLowerCase().includes(term) ||
        log.entityId.toString().includes(term)
      );
    }

    // Entity type filter
    if (this.selectedEntityType() !== 'ALL') {
      filtered = filtered.filter(log => log.entityType === this.selectedEntityType());
    }

    // Action filter
    if (this.selectedAction() !== 'ALL') {
      filtered = filtered.filter(log => log.action === this.selectedAction());
    }

    // Date range filter
    if (this.startDate()) {
      const start = new Date(this.startDate()).getTime();
      filtered = filtered.filter(log => new Date(log.performedAt).getTime() >= start);
    }

    if (this.endDate()) {
      const end = new Date(this.endDate()).getTime();
      filtered = filtered.filter(log => new Date(log.performedAt).getTime() <= end);
    }

    // Sort by latest first
    return filtered.sort((a, b) => 
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
  });

  // Paginated logs
  paginatedLogs = computed(() => {
    const filtered = this.filteredLogs();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    const endIndex = startIndex + this.itemsPerPage();
    return filtered.slice(startIndex, endIndex);
  });

  // Total pages
  totalPages = computed(() => {
    return Math.ceil(this.filteredLogs().length / this.itemsPerPage());
  });

  // Stats
  stats = computed(() => {
    const all = this.auditLogs();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: all.length,
      today: all.filter(log => new Date(log.performedAt) >= today).length,
      creates: all.filter(log => log.action === 'CREATE').length,
      updates: all.filter(log => log.action === 'UPDATE').length,
      deletes: all.filter(log => log.action === 'DELETE').length
    };
  });

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auditLogService.getAllAuditLogs().subscribe({
      next: (data) => {
        this.auditLogs.set(data);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading audit logs:', error);
        this.errorMessage.set('Failed to load audit logs');
        this.isLoading.set(false);
      }
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  updateEntityType(value: string): void {
    this.selectedEntityType.set(value);
    this.currentPage.set(1);
  }

  updateAction(value: string): void {
    this.selectedAction.set(value);
    this.currentPage.set(1);
  }

  updateStartDate(value: string): void {
    this.startDate.set(value);
    this.currentPage.set(1);
  }

  updateEndDate(value: string): void {
    this.endDate.set(value);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedEntityType.set('ALL');
    this.selectedAction.set('ALL');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
  }

  viewDetails(log: AuditLogDTO): void {
    this.selectedLog.set(log);
    this.showDetailsModal.set(true);
  }

  closeModal(): void {
    this.showDetailsModal.set(false);
    this.selectedLog.set(null);
  }

  getActionClass(action: string): string {
    const classes: { [key: string]: string } = {
      'CREATE': 'action-create',
      'UPDATE': 'action-update',
      'DELETE': 'action-delete',
      'UPDATE_ACHIEVEMENT': 'action-achievement',
      'MARK_COMPLETED': 'action-completed'
    };
    return classes[action] || 'action-other';
  }

  getActionIcon(action: string): string {
    const icons: { [key: string]: string } = {
      'CREATE': 'add_circle',
      'UPDATE': 'edit',
      'DELETE': 'delete',
      'UPDATE_ACHIEVEMENT': 'task_alt',
      'MARK_COMPLETED': 'check_circle'
    };
    return icons[action] || 'info';
  }

  formatJson(jsonString: string | null): string {
    if (!jsonString) return 'N/A';
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  getPaginationRange(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        range.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) range.push(i);
        range.push(-1); // Ellipsis
        range.push(total);
      } else if (current >= total - 3) {
        range.push(1);
        range.push(-1);
        for (let i = total - 4; i <= total; i++) range.push(i);
      } else {
        range.push(1);
        range.push(-1);
        for (let i = current - 1; i <= current + 1; i++) range.push(i);
        range.push(-1);
        range.push(total);
      }
    }

    return range;
  }
}
