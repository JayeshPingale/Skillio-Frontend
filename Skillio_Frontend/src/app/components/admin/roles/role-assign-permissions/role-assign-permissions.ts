import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { RoleResponse, RoleService } from '../../../../core/services/role/role.service';
import { PermissionService, PermissionResponse } from '../../../../core/services/permission/permission.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { AssignPermissionToRoleRequest, RolePermissionResponse } from '../../../../core/services/role/role.service';
import { FormsModule } from '@angular/forms';

interface PermissionGroup {
  module: string;
  permissions: PermissionResponse[];
  selectedCount: number;
  totalCount: number;
}

@Component({
  selector: 'app-role-assign-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './role-assign-permissions.html',
  styleUrls: ['./role-assign-permissions.css']
})
export class RoleAssignPermissions implements OnInit {
  private roleService = inject(RoleService);
  private permissionService = inject(PermissionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  currentRole = signal<RoleResponse | null>(null);
  roleId = signal<number>(0);
  allPermissions = signal<PermissionResponse[]>([]);
  assignedPermissions = signal<RolePermissionResponse[]>([]);
  permissionGroups = signal<PermissionGroup[]>([]);
  selectedPermissionIds = signal<Set<number>>(new Set());
  
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid role ID');
      return;
    }

    this.roleId.set(Number(id));
    this.isLoading.set(true);

    Promise.all([
      this.loadRoleDetails(),
      this.loadAllPermissions(),
      this.loadAssignedPermissions()
    ]).then(() => {
      this.groupPermissionsByModule();
      this.isLoading.set(false);
    }).catch(error => {
      this.errorMessage.set('Failed to load data');
      this.isLoading.set(false);
      console.error('Error loading data:', error);
    });
  }

  loadRoleDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roleService.getRoleById(this.roleId()).subscribe({
        next: (role) => {
          this.currentRole.set(role);
          resolve();
        },
        error: reject
      });
    });
  }

  loadAllPermissions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.permissionService.getAllPermissions().subscribe({
        next: (permissions) => {
          this.allPermissions.set(permissions);
          resolve();
        },
        error: reject
      });
    });
  }

  loadAssignedPermissions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roleService.getPermissionsForRole(this.roleId()).subscribe({
        next: (permissions) => {
          this.assignedPermissions.set(permissions);
          const ids = new Set(permissions.map(p => p.permissionId));
          this.selectedPermissionIds.set(ids);
          resolve();
        },
        error: reject
      });
    });
  }

  groupPermissionsByModule(): void {
    const groups = new Map<string, PermissionResponse[]>();
    
    this.allPermissions().forEach(permission => {
      if (!groups.has(permission.module)) {
        groups.set(permission.module, []);
      }
      groups.get(permission.module)?.push(permission);
    });

    const permissionGroups: PermissionGroup[] = Array.from(groups.entries()).map(([module, permissions]) => {
      const selectedCount = permissions.filter(p => 
        this.selectedPermissionIds().has(p.permissionId)
      ).length;
      
      return {
        module,
        permissions,
        selectedCount,
        totalCount: permissions.length
      };
    });

    this.permissionGroups.set(permissionGroups);
  }

  togglePermission(permissionId: number): void {
    const selected = new Set(this.selectedPermissionIds());
    
    if (selected.has(permissionId)) {
      selected.delete(permissionId);
    } else {
      selected.add(permissionId);
    }
    
    this.selectedPermissionIds.set(selected);
    this.updateGroupCounts();
  }

  toggleModule(module: string): void {
    const group = this.permissionGroups().find(g => g.module === module);
    if (!group) return;

    const selected = new Set(this.selectedPermissionIds());
    const allSelected = group.selectedCount === group.totalCount;

    group.permissions.forEach(p => {
      if (allSelected) {
        selected.delete(p.permissionId);
      } else {
        selected.add(p.permissionId);
      }
    });

    this.selectedPermissionIds.set(selected);
    this.updateGroupCounts();
  }

  updateGroupCounts(): void {
    const updated = this.permissionGroups().map(group => ({
      ...group,
      selectedCount: group.permissions.filter(p => 
        this.selectedPermissionIds().has(p.permissionId)
      ).length
    }));
    this.permissionGroups.set(updated);
  }

  selectAll(): void {
    const allIds = new Set(this.allPermissions().map(p => p.permissionId));
    this.selectedPermissionIds.set(allIds);
    this.updateGroupCounts();
  }

  clearAll(): void {
    this.selectedPermissionIds.set(new Set());
    this.updateGroupCounts();
  }

  // ✅ FIXED - Convert permissionIds to permissionNames
  onSubmit(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const selectedIds = Array.from(this.selectedPermissionIds());
    
    // Convert permission IDs to permission names
    const permissionNames = this.allPermissions()
      .filter(p => selectedIds.includes(p.permissionId))
      .map(p => p.permissionName);

    const request: AssignPermissionToRoleRequest = {
      roleName: this.currentRole()?.roleName || '',
      permissionNames: permissionNames
    };

    this.roleService.assignPermissions(request).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Permissions assigned successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/roles']);
        }, 2000);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to assign permissions. Please try again.');
        console.error('Assign permissions error:', error);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/roles']);
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.selectedPermissionIds().has(permissionId);
  }

  isModuleFullySelected(module: string): boolean {
    const group = this.permissionGroups().find(g => g.module === module);
    return group ? group.selectedCount === group.totalCount : false;
  }

  isModulePartiallySelected(module: string): boolean {
    const group = this.permissionGroups().find(g => g.module === module);
    return group ? group.selectedCount > 0 && group.selectedCount < group.totalCount : false;
  }

  // ✅ Material Symbols Icons
  trackByModule(_: number, group: PermissionGroup): string {
    return group.module;
  }

  trackByPermission(_: number, permission: PermissionResponse): number {
    return permission.permissionId;
  }

  getRoleIcon(roleName: string): string {
    const name = roleName?.toUpperCase() || '';
    if (name.includes('ADMIN')) return 'admin_panel_settings';
    if (name.includes('SALES')) return 'business_center';
    if (name.includes('MANAGER')) return 'analytics';
    return 'shield';
  }

  getModuleIcon(module: string): string {
    const icons: { [key: string]: string } = {
      'USER': 'person',
      'ROLE': 'admin_panel_settings',
      'PERMISSION': 'lock',
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
      'FOLLOW_UP': 'call',
      'COMMISSION': 'paid',
      'COMMISSION_PAYMENT': 'account_balance_wallet',
      'TARGET': 'track_changes',
      'INVOICE': 'receipt',
      'AUDIT_LOG': 'policy',
      'REPORT': 'analytics'
    };
    return icons[module.toUpperCase()] || 'extension';
  }
}
