import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';

@Component({
  selector: 'app-permission-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './permission-create.html',
  styleUrls: ['./permission-create.css']
})
export class PermissionCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private permissionService = inject(PermissionService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  permissionForm!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');

  // Module options should cover every guarded feature in the app.
  modules = [
    'USER',
    'ROLE',
    'PERMISSION',
    'LEAD',
    'LEAD_SOURCE',
    'LEAD_STATUS_HISTORY',
    'COURSE',
    'BATCH',
    'STUDENT',
    'STUDENT_FEE',
    'ENROLLMENT',
    'PAYMENT',
    'PAYMENT_INSTALLMENT',
    'FOLLOW_UP',
    'COMMISSION',
    'COMMISSION_PAYMENT',
    'TARGET',
    'INVOICE',
    'AUDIT_LOG',
    'REPORT'
  ];

  // Common permission templates
  permissionTemplates = [
    { name: 'CREATE', description: 'Create new records' },
    { name: 'READ', description: 'View and read records' },
    { name: 'UPDATE', description: 'Modify existing records' },
    { name: 'DELETE', description: 'Remove records' },
    { name: 'LIST', description: 'List all records' },
    { name: 'EXPORT', description: 'Export data' },
    { name: 'IMPORT', description: 'Import data' }
  ];

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.permissionForm = this.fb.group({
      permissionName: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.pattern(/^[A-Z_]+$/)
      ]],
      module: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // ✅ NEW METHOD - Select module from icon box
  selectModule(module: string): void {
    this.permissionForm.patchValue({ module });
  }

  // ✅ Check if module is selected
  isModuleSelected(module: string): boolean {
    return this.module?.value === module;
  }

  getModuleLabel(module: string): string {
    return module.replace(/_/g, ' ');
  }

  useTemplate(module: string, template: any): void {
    const permissionName = `${module}_${template.name}`;
    const description = `${template.description} in ${module} module`;
    
    this.permissionForm.patchValue({
      permissionName,
      module,
      description
    });
  }
// permission-create.ts
onSubmit(): void {
  if (this.permissionForm.invalid) {
    this.permissionForm.markAllAsTouched();
    return;
  }

  this.isSubmitting.set(true);
  this.errorMessage.set('');

  // ✅ Extract action from permission name (e.g., USER_CREATE → CREATE)
  const formValue = this.permissionForm.value;
  const parts = formValue.permissionName.split('_');
  const action = parts.length > 1 ? parts[parts.length - 1] : 'READ'; // Default to READ

  const requestPayload = {
    permissionName: formValue.permissionName,
    module: formValue.module,
    action: action, // ✅ Add action field
    description: formValue.description
  };

  this.permissionService.createPermission(requestPayload).subscribe({
    next: (response) => {
      this.isSubmitting.set(false);
      this.router.navigate(['/admin-dashboard/permissions']);
    },
    error: (error) => {
      this.isSubmitting.set(false);
      this.errorMessage.set(error.error?.message || 'Failed to create permission. Please try again.');
      console.error('Create permission error:', error);
    }
  });
}


  cancel(): void {
    this.router.navigate(['/admin-dashboard/permissions']);
  }

  formatPermissionName(event: any): void {
    let value = event.target.value;
    value = value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z_]/g, '');
    this.permissionForm.patchValue({ permissionName: value }, { emitEvent: false });
  }

  get permissionName() {
    return this.permissionForm.get('permissionName');
  }

  get module() {
    return this.permissionForm.get('module');
  }

  get description() {
    return this.permissionForm.get('description');
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
    return icons[module] || 'extension';
  }
}
