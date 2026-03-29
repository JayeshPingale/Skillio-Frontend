import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RoleResponse, RoleService } from '../../../../core/services/role/role.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './role-list.html',
  styleUrls: ['./role-list.css']
})
export class RoleList implements OnInit {
  private roleService = inject(RoleService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  roles = signal<RoleResponse[]>([]);
  filteredRoles = signal<RoleResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.filteredRoles.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load roles. Please try again.');
        this.isLoading.set(false);
        console.error('Error loading roles:', error);
      }
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.filterRoles();
  }

  filterRoles(): void {
    let filtered = this.roles();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(role => 
        role.roleName.toLowerCase().includes(term) ||
        role.description.toLowerCase().includes(term)
      );
    }

    this.filteredRoles.set(filtered);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin-dashboard/roles/create']);
  }

  navigateToEdit(roleId: number): void {
    this.router.navigate(['/admin-dashboard/roles/edit', roleId]);
  }

  navigateToAssignPermissions(roleId: number): void {
    this.router.navigate(['/admin-dashboard/roles', roleId, 'assign-permissions']);
  }

async deleteRole(roleId: number, roleName: string): Promise<void> {
  const confirmed = await this.confirmationService.confirm({
    title: 'Delete Role',
    message: `Delete "${roleName}"? Users with this role will lose their permissions.`,
    confirmText: 'Delete Role',
    cancelText: 'Cancel',
    type: 'danger',
    icon: 'admin_panel_settings'
  });

  if (confirmed) {
    this.roleService.deleteRole(roleId).subscribe({
      next: () => {
        this.successMessage.set(`Role "${roleName}" deleted successfully!`);
        this.loadRoles();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.errorMessage.set('Failed to delete role. It may be assigned to users.');
        console.error('Delete error:', error);
      }
    });
  }
}


  // ✅ Updated method with Material Icons
  getRoleIcon(roleName: string): string {
    const name = roleName.toUpperCase();
    
    if (name.includes('ADMIN')) return 'admin_panel_settings';  // 👑 Crown icon
    if (name.includes('SALES') || name.includes('EXECUTIVE')) return 'business_center';  // 💼 Briefcase
    if (name.includes('MANAGER')) return 'analytics';  // 📊 Chart/Analytics
    if (name.includes('USER')) return 'person';  // 👤 Person
    if (name.includes('INSTRUCTOR')) return 'support_agent';  // Support headset
    if (name.includes('DEVELOPER')) return 'code';  // Code brackets
    
    return 'shield';  // Default icon
  }
}
