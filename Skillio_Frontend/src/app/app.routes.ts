import { Routes } from '@angular/router';
import { AdminDashBoard } from './components/dashboards/admin-dash-board/admin-dash-board';
import { SalesExecutiveDashBoard } from './components/dashboards/sales-executive-dash-board/sales-executive-dash-board';
import { LoginPageComponent } from './components/login-page-component/login-page-component';
import { ForgotPasswordPageComponent } from './components/forgot-password-page-component/forgot-password-page-component';
import { PageNotFoundComponent } from './components/error-pages/page-not-found/page-not-found';
import { UnauthorizedPageComponent } from './components/error-pages/unauthorized-page/unauthorized-page';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { salesExecutiveGuard } from './core/guards/sales-executive.guard';
import { EnrollmentListComponent } from './components/admin/enrollments/enrollment-list/enrollment-list';
import { EnrollmentManageComponent } from './components/admin/enrollments/enrollment-manage/enrollment-manage';
import { StudentListComponent } from './components/admin/student/student-list/student-list';
import { StudentManageComponent } from './components/admin/student/student-manage/student-manage';
import { StudentFeesListComponent } from './components/admin/student-fees/student-fees-list/student-fees-list';
import { StudentFeesManageComponent } from './components/admin/student-fees/student-fees-manage/student-fees-manage';
import { PaymentListComponent } from './components/admin/payments/payment-list/payment-list';
import { PaymentManageComponent } from './components/admin/payments/payment-manage/payment-manage';
import { PaymentInstallmentListComponent } from './components/admin/payment-installments/payment-installment-list/payment-installment-list';
import { PaymentInstallmentManageComponent } from './components/admin/payment-installments/payment-installment-manage/payment-installment-manage';
import { CommissionListComponent } from './components/admin/commissions/commission-list/commission-list';
import { CommissionManageComponent } from './components/admin/commissions/commission-manage/commission-manage';
import { CommissionPaymentListComponent } from './components/admin/commissionsPayment/commission-payment-list/commission-payment-list';
import { CommissionPaymentManageComponent } from './components/admin/commissionsPayment/commission-payment-manage/commission-payment-manage';
import { TargetListComponent } from './components/admin/target/target-list/target-list';
import { TargetManageComponent } from './components/admin/target/target-manage/target-manage';
import { AuditLogListComponent } from './components/admin/auditLog/audit-log-list';
import { InvoiceListComponent } from './components/admin/invoice/invoice-list/invoice-list';
import { InvoiceManageComponent } from './components/admin/invoice/invoice-manage/invoice-manage';
import { SalesCommissionRequestComponent } from './components/sales-executive/sales-commission-request/sales-commission-request';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginPageComponent,
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordPageComponent,
  },
  {
    path: 'unauthorized',
    component: UnauthorizedPageComponent,
  },

  // ========== ADMIN DASHBOARD ==========
  {
    path: 'admin-dashboard',
    component: AdminDashBoard,
    canActivate: [authGuard, adminGuard],
    children: [

      // Users
      {
        path: 'users',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['USER_LIST', 'USER_READ'] }, loadComponent: () => import('./components/admin/users/user-list/user-list').then(m => m.UserListComponent) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'USER_CREATE' }, loadComponent: () => import('./components/admin/users/user-create/user-create').then(m => m.UserCreateComponent) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'USER_UPDATE' }, loadComponent: () => import('./components/admin/users/user-edit/user-edit').then(m => m.UserEditComponent) },
        ],
      },

      // Roles
      {
        path: 'roles',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['ROLE_LIST', 'ROLE_READ'] }, loadComponent: () => import('./components/admin/roles/role-list/role-list').then(m => m.RoleList) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'ROLE_CREATE' }, loadComponent: () => import('./components/admin/roles/role-create/role-create').then(m => m.RoleCreate) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'ROLE_UPDATE' }, loadComponent: () => import('./components/admin/roles/role-edit/role-edit').then(m => m.RoleEdit) },
          { path: ':id/assign-permissions', canActivate: [permissionGuard], data: { permission: 'ROLE_UPDATE' }, loadComponent: () => import('./components/admin/roles/role-assign-permissions/role-assign-permissions').then(m => m.RoleAssignPermissions) },
        ],
      },

      // Permissions
      {
        path: 'permissions',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['PERMISSION_LIST', 'PERMISSION_READ'] }, loadComponent: () => import('./components/admin/permissions/permission-list/permission-list').then(m => m.PermissionListComponent) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'PERMISSION_CREATE' }, loadComponent: () => import('./components/admin/permissions/permission-create/permission-create').then(m => m.PermissionCreateComponent) },
        ],
      },

      // Leads
      {
        path: 'leads',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['LEAD_LIST', 'LEAD_READ'] }, loadComponent: () => import('./components/admin/leads/lead-list/lead-list').then(m => m.LeadListComponent) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'LEAD_CREATE' }, loadComponent: () => import('./components/admin/leads/lead-create/lead-create').then(m => m.LeadCreateComponent) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'LEAD_UPDATE' }, loadComponent: () => import('./components/admin/leads/lead-edit/lead-edit').then(m => m.LeadEditComponent) },
          {
            path: ':id/assign',
            canActivate: [permissionGuard],
            data: { permission: 'LEAD_UPDATE' },
            loadComponent: () => import('./components/admin/leads/lead-assign/lead-assign').then(m => m.LeadAssignComponent),
          },
        ],
      },

      // Lead Sources
      {
        path: 'lead-sources',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['LEAD_SOURCE_LIST', 'LEAD_SOURCE_READ'] }, loadComponent: () => import('./components/admin/LeadSource/lead-source-list/lead-source-list-component').then(m => m.LeadSourceListComponent) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'LEAD_SOURCE_CREATE' }, loadComponent: () => import('./components/admin/LeadSource/lead-source-create/lead-source-create-component').then(m => m.LeadSourceCreateComponent) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'LEAD_SOURCE_UPDATE' }, loadComponent: () => import('./components/admin/LeadSource/lead-source-edit/lead-source-edit').then(m => m.LeadSourceEditComponent) },
        ],
      },

      // Lead Status History
      {
        path: 'lead-status-history',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['LEAD_STATUS_HISTORY_LIST', 'LEAD_STATUS_HISTORY_READ'] }, loadComponent: () => import('./components/admin/LeadSource/lead-status-history/lead-status-history-component').then(m => m.LeadStatusHistoryComponent) },
          { path: 'lead/:leadId', canActivate: [permissionGuard], data: { anyPermissions: ['LEAD_STATUS_HISTORY_LIST', 'LEAD_STATUS_HISTORY_READ'] }, loadComponent: () => import('./components/admin/LeadSource/lead-status-history/lead-status-history-component').then(m => m.LeadStatusHistoryComponent) },
        ],
      },

      // Follow-ups
      {
        path: 'follow-ups',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['FOLLOW_UP_LIST', 'FOLLOW_UP_READ'] }, loadComponent: () => import('./components/admin/follow-ups/follow-up-list/follow-up-list').then(m => m.FollowUpList) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'FOLLOW_UP_CREATE' }, loadComponent: () => import('./components/admin/follow-ups/follow-up-create/follow-up-create').then(m => m.FollowUpCreate) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'FOLLOW_UP_UPDATE' }, loadComponent: () => import('./components/admin/follow-ups/follow-up-edit/follow-up-edit').then(m => m.FollowUpEdit) },
          { path: 'manage', canActivate: [permissionGuard], data: { anyPermissions: ['FOLLOW_UP_READ', 'FOLLOW_UP_UPDATE'] }, loadComponent: () => import('./components/admin/follow-ups/follow-up-manage/follow-up-manage').then(m => m.FollowUpManageComponent) },
        ],
      },

      // Courses
      {
        path: 'courses',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['COURSE_LIST', 'COURSE_READ'] }, loadComponent: () => import('./components/admin/courses/course-list/course-list').then(m => m.CourseList) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'COURSE_CREATE' }, loadComponent: () => import('./components/admin/courses/course-create/course-create').then(m => m.CourseCreate) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'COURSE_UPDATE' }, loadComponent: () => import('./components/admin/courses/course-edit/course-edit').then(m => m.CourseEdit) },
        ],
      },

      // Batches
      {
        path: 'batches',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['BATCH_LIST', 'BATCH_READ'] }, loadComponent: () => import('./components/admin/batches/batch-list/batch-list').then(m => m.BatchListComponent) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'BATCH_CREATE' }, loadComponent: () => import('./components/admin/batches/batch-create/batch-create').then(m => m.BatchCreate) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'BATCH_UPDATE' }, loadComponent: () => import('./components/admin/batches/batch-edit/batch-edit').then(m => m.BatchEdit) },
        ],
      },

      // Enrollments
      {
        path: 'enrollments',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['ENROLLMENT_LIST', 'ENROLLMENT_READ'] }, component: EnrollmentListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'ENROLLMENT_CREATE' }, component: EnrollmentManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'ENROLLMENT_UPDATE' }, component: EnrollmentManageComponent },
        ],
      },

      // Students
      {
        path: 'students',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['STUDENT_LIST', 'STUDENT_READ'] }, component: StudentListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'STUDENT_CREATE' }, component: StudentManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'STUDENT_UPDATE' }, component: StudentManageComponent },
        ],
      },

      // Student Fees
      {
        path: 'student-fees',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['STUDENT_FEE_LIST', 'STUDENT_FEE_READ'] }, component: StudentFeesListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'STUDENT_FEE_CREATE' }, component: StudentFeesManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'STUDENT_FEE_UPDATE' }, component: StudentFeesManageComponent },
        ],
      },

      // Payments
      {
        path: 'payments',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['PAYMENT_LIST', 'PAYMENT_READ'] }, component: PaymentListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'PAYMENT_CREATE' }, component: PaymentManageComponent },
        ],
      },

      // Payment Installments
      {
        path: 'payment-installments',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['PAYMENT_INSTALLMENT_LIST', 'PAYMENT_INSTALLMENT_READ'] }, component: PaymentInstallmentListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'PAYMENT_INSTALLMENT_CREATE' }, component: PaymentInstallmentManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'PAYMENT_INSTALLMENT_UPDATE' }, component: PaymentInstallmentManageComponent },
        ],
      },

      // Commissions
      {
        path: 'commissions',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['COMMISSION_LIST', 'COMMISSION_READ'] }, component: CommissionListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'COMMISSION_CREATE' }, component: CommissionManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'COMMISSION_UPDATE' }, component: CommissionManageComponent },
        ],
      },

      // Commission Payments
      {
        path: 'commission-payments',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['COMMISSION_PAYMENT_LIST', 'COMMISSION_PAYMENT_READ'] }, component: CommissionPaymentListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'COMMISSION_PAYMENT_CREATE' }, component: CommissionPaymentManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'COMMISSION_PAYMENT_UPDATE' }, component: CommissionPaymentManageComponent },
        ],
      },

      // Targets
      {
        path: 'targets',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['TARGET_LIST', 'TARGET_READ'] }, component: TargetListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'TARGET_CREATE' }, component: TargetManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'TARGET_UPDATE' }, component: TargetManageComponent },
          { path: 'update-achievement/:id', canActivate: [permissionGuard], data: { permission: 'TARGET_UPDATE' }, component: TargetManageComponent },
        ],
      },

      // Audit Logs
      { path: 'audit-logs', canActivate: [permissionGuard], data: { anyPermissions: ['AUDIT_LOG_LIST', 'AUDIT_LOG_READ'] }, component: AuditLogListComponent },

      // Invoices
      {
        path: 'invoices',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['INVOICE_LIST', 'INVOICE_READ'] }, component: InvoiceListComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'INVOICE_UPDATE' }, component: InvoiceManageComponent },
        ],
      },
    ],
  },

  // ========== SALES DASHBOARD ==========
  {
    path: 'sales-dashboard',
    component: SalesExecutiveDashBoard,
    canActivate: [authGuard, salesExecutiveGuard],
    children: [

      // Leads
      {
        path: 'leads',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['LEAD_LIST', 'LEAD_READ'] }, loadComponent: () => import('./components/admin/leads/lead-list/lead-list').then(m => m.LeadListComponent) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'LEAD_CREATE' }, loadComponent: () => import('./components/admin/leads/lead-create/lead-create').then(m => m.LeadCreateComponent) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'LEAD_UPDATE' }, loadComponent: () => import('./components/admin/leads/lead-edit/lead-edit').then(m => m.LeadEditComponent) },
        ],
      },

      // Follow-ups
      {
        path: 'follow-ups',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['FOLLOW_UP_LIST', 'FOLLOW_UP_READ'] }, loadComponent: () => import('./components/admin/follow-ups/follow-up-list/follow-up-list').then(m => m.FollowUpList) },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'FOLLOW_UP_CREATE' }, loadComponent: () => import('./components/admin/follow-ups/follow-up-create/follow-up-create').then(m => m.FollowUpCreate) },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'FOLLOW_UP_UPDATE' }, loadComponent: () => import('./components/admin/follow-ups/follow-up-edit/follow-up-edit').then(m => m.FollowUpEdit) },
        ],
      },

      // Enrollments
      {
        path: 'enrollments',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['ENROLLMENT_LIST', 'ENROLLMENT_READ'] }, component: EnrollmentListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'ENROLLMENT_CREATE' }, component: EnrollmentManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'ENROLLMENT_UPDATE' }, component: EnrollmentManageComponent },
        ],
      },

      // Students
      {
        path: 'students',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['STUDENT_LIST', 'STUDENT_READ'] }, component: StudentListComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'STUDENT_UPDATE' }, component: StudentManageComponent },
        ],
      },

      // Student Fees
      {
        path: 'student-fees',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['STUDENT_FEE_LIST', 'STUDENT_FEE_READ'] }, component: StudentFeesListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'STUDENT_FEE_CREATE' }, component: StudentFeesManageComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'STUDENT_FEE_UPDATE' }, component: StudentFeesManageComponent },
        ],
      },

      // Payments
      {
        path: 'payments',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['PAYMENT_LIST', 'PAYMENT_READ'] }, component: PaymentListComponent },
          { path: 'create', canActivate: [permissionGuard], data: { permission: 'PAYMENT_CREATE' }, component: PaymentManageComponent },
        ],
      },

      // Courses (Read Only)
      {
        path: 'courses',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['COURSE_LIST', 'COURSE_READ'] }, loadComponent: () => import('./components/admin/courses/course-list/course-list').then(m => m.CourseList) },
        ],
      },

      // Batches (Read Only)
      {
        path: 'batches',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['BATCH_LIST', 'BATCH_READ'] }, loadComponent: () => import('./components/admin/batches/batch-list/batch-list').then(m => m.BatchListComponent) },
        ],
      },

      // Targets (Read Only)
      { path: 'targets', canActivate: [permissionGuard], data: { anyPermissions: ['TARGET_LIST', 'TARGET_READ'] }, component: TargetListComponent },

      // Commissions (My Commissions — read view)
      { path: 'commissions', canActivate: [permissionGuard], data: { anyPermissions: ['COMMISSION_LIST', 'COMMISSION_READ'] }, component: CommissionListComponent },

      // ✅ NEW: Commission Request — Sales Executive only
      { path: 'commission-request', canActivate: [permissionGuard], data: { permission: 'COMMISSION_CREATE' }, component: SalesCommissionRequestComponent },

      // Invoices
      {
        path: 'invoices',
        children: [
          { path: '', canActivate: [permissionGuard], data: { anyPermissions: ['INVOICE_LIST', 'INVOICE_READ'] }, component: InvoiceListComponent },
          { path: 'edit/:id', canActivate: [permissionGuard], data: { permission: 'INVOICE_UPDATE' }, component: InvoiceManageComponent },
        ],
      },
    ],
  },

  // ========== 404 ==========
  { path: '**', component: PageNotFoundComponent },
];
