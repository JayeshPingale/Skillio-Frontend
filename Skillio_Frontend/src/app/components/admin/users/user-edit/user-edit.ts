import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { UpdateUserRequest, UserResponse, UserService } from '../../../../core/services/users/user.service';
import { RoleService } from '../../../../core/services/role/role.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';

export interface RoleResponse {
  roleId: number;
  roleName: string;
  description: string;
}

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule,FormsModule],
  templateUrl: './user-edit.html',
  styleUrls: ['./user-edit.css']
})
export class UserEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  userForm!: FormGroup;
  roles = signal<RoleResponse[]>([]);
  currentUser = signal<UserResponse | null>(null);
  userId = signal<number>(0);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.initForm();
    this.loadRoles();
    this.loadUserData();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      roleId: [null, [Validators.required]],
      isActive: [true]
    });
  }

  loadRoles(): void {
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load roles');
        console.error('Error loading roles:', error);
      }
    });
  }

  loadUserData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid user ID');
      return;
    }

    this.userId.set(Number(id));
    this.isLoading.set(true);

    this.userService.getUserById(this.userId()).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.populateForm(user);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load user details');
        this.isLoading.set(false);
        console.error('Error loading user:', error);
      }
    });
  }

  populateForm(user: UserResponse): void {
    // Extract roleId from roleName
    const role = this.roles().find(r => r.roleName === user.roleName);
    
    this.userForm.patchValue({
      fullName: user.fullName,
      email: user.email,
      contactNumber: user.contactNumber,
      roleId: role?.roleId || null,
      isActive: user.isActive
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const updateRequest: UpdateUserRequest = this.userForm.value;

    this.userService.updateUser(this.userId(), updateRequest).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set('User updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin-dashboard/users']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Failed to update user. Please try again.');
        console.error('Update user error:', error);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin-dashboard/users']);
  }

  toggleActiveStatus(): void {
    const currentStatus = this.userForm.get('isActive')?.value;
    this.userForm.patchValue({ isActive: !currentStatus });
  }

  get fullName() {
    return this.userForm.get('fullName');
  }

  get email() {
    return this.userForm.get('email');
  }

  get contactNumber() {
    return this.userForm.get('contactNumber');
  }

  get roleId() {
    return this.userForm.get('roleId');
  }

  get isActive() {
    return this.userForm.get('isActive');
  }
}
