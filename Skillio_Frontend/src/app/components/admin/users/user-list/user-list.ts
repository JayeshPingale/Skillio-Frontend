import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserResponse, UserService } from '../../../../core/services/users/user.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.css'],
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  public authService = inject(AuthService);
  users = signal<UserResponse[]>([]);
  filteredUsers = signal<UserResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  selectedRole = signal('ALL');
  public Math = Math;
  currentPage = signal(1);
  itemsPerPage = signal(7);
  totalItems = computed(() => this.filteredUsers().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredUsers().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.filteredUsers.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load users. Please try again.');
        this.isLoading.set(false);
        console.error('Error loading users:', error);
      },
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    this.filterUsers();
  }

  updateSelectedRole(value: string): void {
    this.selectedRole.set(value);
    this.currentPage.set(1);
    this.filterUsers();
  }

  filterUsers(): void {
    let filtered = this.users();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.contactNumber.includes(term)
      );
    }

    if (this.selectedRole() !== 'ALL') {
      filtered = filtered.filter((user) => user.roleName === this.selectedRole());
    }

    this.filteredUsers.set(filtered);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin-dashboard/users/create']);
  }

  navigateToEdit(userId: number): void {
    this.router.navigate(['/admin-dashboard/users/edit', userId]);
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

async deleteUser(userId: number, userName: string): Promise<void> {
  const confirmed = await this.confirmationService.confirm({
    title: 'Delete User',
    message: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger',
    icon: 'delete'
  });

  if (confirmed) {
    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.successMessage.set(`${userName} deleted successfully!`);
        this.loadUsers();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.errorMessage.set('Failed to delete user. Please try again.');
        console.error('Delete error:', error);
      }
    });
  }
}


  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'role-admin';
      case 'ROLE_SALES_EXECUTIVE':
        return 'role-sales';
      case 'ROLE_MANAGER':
        return 'role-manager';
      default:
        return 'role-default';
    }
  }
}
