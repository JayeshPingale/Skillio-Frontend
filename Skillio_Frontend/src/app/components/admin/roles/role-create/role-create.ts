import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RoleService } from '../../../../core/services/role/role.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';


@Component({
  selector: 'app-role-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule,FormsModule],
  templateUrl: './role-create.html',
  styleUrls: ['./role-create.css']
})
export class RoleCreate implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  roleForm!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');

  // Predefined role suggestions
  roleSuggestions = [
    { name: 'ROLE_ADMIN', description: 'Full system access with administrative privileges' },
    { name: 'ROLE_SALES_EXECUTIVE', description: 'Sales team member with lead management access' },
    { name: 'ROLE_MANAGER', description: 'Team manager with reporting and oversight access' },
    { name: 'ROLE_INSTRUCTOR', description: 'Course instructor with student management access' },
    { name: 'ROLE_RECEPTIONIST', description: 'Front desk staff with basic enrollment access' }
  ];

  ngOnInit(): void {
    this.initForm();
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

  useSuggestion(suggestion: any): void {
    this.roleForm.patchValue({
      roleName: suggestion.name,
      description: suggestion.description
    });
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.roleService.createRole(this.roleForm.value).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/admin-dashboard/roles']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to create role. Please try again.');
        console.error('Create role error:', error);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/roles']);
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
}
