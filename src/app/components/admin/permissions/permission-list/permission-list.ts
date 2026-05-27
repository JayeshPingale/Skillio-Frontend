import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { PermissionResponse, PermissionService } from '../../../../core/services/permission/permission.service';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './permission-list.html',
  styleUrls: ['./permission-list.css']
})
export class PermissionListComponent implements OnInit {
  private permissionService = inject(PermissionService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  permissions = signal<PermissionResponse[]>([]);
  filteredPermissions = signal<PermissionResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  selectedModule = signal('ALL');

  modules: string[] = [];

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.permissionService.getAllPermissions().subscribe({
      next: (data) => {
        this.permissions.set(data);
        this.filteredPermissions.set(data);
        this.extractModules(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load permissions. Please try again.');
        this.isLoading.set(false);
        console.error('Error loading permissions:', error);
      }
    });
  }

  extractModules(permissions: PermissionResponse[]): void {
    const uniqueModules = [...new Set(permissions.map(p => p.module))];
    this.modules = ['ALL', ...uniqueModules.sort()];
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.filterPermissions();
  }

  updateSelectedModule(value: string): void {
    this.selectedModule.set(value);
    this.filterPermissions();
  }

  filterPermissions(): void {
    let filtered = this.permissions();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(permission => 
        permission.permissionName.toLowerCase().includes(term) ||
        permission.description.toLowerCase().includes(term) ||
        permission.module.toLowerCase().includes(term)
      );
    }

    if (this.selectedModule() !== 'ALL') {
      filtered = filtered.filter(permission => permission.module === this.selectedModule());
    }

    this.filteredPermissions.set(filtered);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin-dashboard/permissions/create']);
  }

async deletePermission(permissionId: number, permissionName: string): Promise<void> {
  const confirmed = await this.confirmationService.confirm({
    title: 'Delete Permission',
    message: `Delete "${permissionName}"? This will affect all roles using this permission.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'warning',
    icon: 'lock'
  });

  if (confirmed) {
    this.permissionService.deletePermission(permissionId).subscribe({
      next: () => {
        this.successMessage.set(`Permission "${permissionName}" deleted successfully!`);
        this.loadPermissions();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.errorMessage.set('Failed to delete permission. It may be assigned to roles.');
        console.error('Delete error:', error);
      }
    });
  }
}


  getPermissionsByModule() {
    const grouped = new Map<string, PermissionResponse[]>();
    
    this.filteredPermissions().forEach(permission => {
      if (!grouped.has(permission.module)) {
        grouped.set(permission.module, []);
      }
      grouped.get(permission.module)?.push(permission);
    });

    return Array.from(grouped.entries()).map(([module, perms]) => ({
      module,
      permissions: perms,
      count: perms.length
    }));
  }

  // ✅ ONLY THIS METHOD NEEDS UPDATE - Material Symbols Icons
  getModuleIcon(module: string): string {
    const moduleUpper = module.toUpperCase();
    
    // Icon mapping for Material Symbols
    const icons: { [key: string]: string } = {
      'USER': 'person',
      'ROLE': 'admin_panel_settings',
      'LEAD': 'target',
      'LEAD_SOURCE': 'location_on',
      'LEAD_STATUS_HISTORY': 'history',
      'COURSE': 'school',
      'BATCH': 'groups',
      'STUDENT': 'school',
      'STUDENT_FEE': 'receipt_long',
      'ENROLLMENT': 'assignment',
      'PAYMENT': 'payments',
      'PAYMENT_INSTALLMENT': 'calendar_month',
      'COMMISSION': 'paid',
      'COMMISSION_PAYMENT': 'account_balance_wallet',
      'TARGET': 'track_changes',
      'INVOICE': 'receipt',
      'AUDIT_LOG': 'policy',
      'REPORT': 'analytics',
      'PERMISSION': 'lock',
      'DASHBOARD': 'dashboard',
      'SALES': 'business_center',
      'FOLLOW': 'assignment_turned_in'
    };
    
    // Find matching icon
    for (const key in icons) {
      if (moduleUpper.includes(key)) {
        return icons[key];
      }
    }
    
    return 'extension';  // Default icon
  }

  getTotalStats() {
    return {
      total: this.permissions().length,
      modules: new Set(this.permissions().map(p => p.module)).size
    };
  }
}
