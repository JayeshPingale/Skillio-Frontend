import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/users/user.service';
import { RoleService } from '../../../../core/services/role/role.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';


export interface RoleResponse {
  roleId: number;
  roleName: string;
  description: string;
}

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule,FormsModule],
  templateUrl: './user-create.html',
  styleUrls: ['./user-create.css']
})
export class UserCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  userForm!: FormGroup;
  roles = signal<RoleResponse[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
roleName: any;

  ngOnInit(): void {
    this.initForm();
    this.loadRoles();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      roleName: [null, [Validators.required]]
    });
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load roles');
        this.isLoading.set(false);
        console.error('Error loading roles:', error);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.userService.createUser(this.userForm.value).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/admin-dashboard/users']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to create user. Please try again.');
        console.error('Create user error:', error);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/users']);
  }

  get fullName() {
    return this.userForm.get('fullName');
  }

  get email() {
    return this.userForm.get('email');
  }

  get password() {
    return this.userForm.get('password');
  }

  get contactNumber() {
    return this.userForm.get('contactNumber');
  }

  get roleId() {
    return this.userForm.get('roleId');
  }
}
