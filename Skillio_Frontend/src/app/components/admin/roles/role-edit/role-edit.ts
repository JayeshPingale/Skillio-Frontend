import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { RoleResponse, RoleService, UpdateRoleRequest } from '../../../../core/services/role/role.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';

@Component({
  selector: 'app-role-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './role-edit.html',
  styleUrls: ['./role-edit.css']
})
export class RoleEdit implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  roleForm!: FormGroup;
  currentRole = signal<RoleResponse | null>(null);
  roleId = signal<number>(0);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.initForm();
    this.loadRoleData();
  }

  initForm(): void {
    this.roleForm = this.fb.group({
      roleName: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.pattern(/^[A-Z_]+$/)
      ]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  loadRoleData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid role ID');
      return;
    }

    this.roleId.set(Number(id));
    this.isLoading.set(true);

    this.roleService.getRoleById(this.roleId()).subscribe({
      next: (role) => {
        this.currentRole.set(role);
        this.populateForm(role);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load role details');
        this.isLoading.set(false);
        console.error('Error loading role:', error);
      }
    });
  }

  populateForm(role: RoleResponse): void {
    this.roleForm.patchValue({
      roleName: role.roleName,
      description: role.description
    });
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const updateRequest: UpdateRoleRequest = this.roleForm.value;

    this.roleService.updateRole(this.roleId(), updateRequest).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Role updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/roles']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to update role. Please try again.');
        console.error('Update role error:', error);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/roles']);
  }

  navigateToPermissions(): void {
    this.router.navigate(['/admin-dashboard/roles', this.roleId(), 'assign-permissions']);
  }

  // Auto-format role name to uppercase with underscores
  formatRoleName(event: any): void {
    let value = event.target.value;
    value = value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z_]/g, '');
    this.roleForm.patchValue({ roleName: value }, { emitEvent: false });
  }

  get roleName() {
    return this.roleForm.get('roleName');
  }

  get description() {
    return this.roleForm.get('description');
  }

  getRoleIcon(roleName: string): string {
    if (roleName?.includes('ADMIN')) return 'admin_panel_settings';
    if (roleName?.includes('SALES')) return 'business_center';
    if (roleName?.includes('MANAGER')) return 'analytics';
    if (roleName?.includes('USER')) return 'person';
    if (roleName?.includes('DEVELOPER')) return 'code';
    if (roleName?.includes('SUPPORT')) return 'support_agent';
    if (roleName?.includes('FINANCE')) return 'account_balance';
    if (roleName?.includes('HR')) return 'groups';
    return 'shield';
  }
}
