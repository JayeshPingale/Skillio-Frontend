import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ThemeService } from '../../../core/services/theme/theme-service';
import { filter } from 'rxjs/operators';
import { ConfirmationService } from '../../../core/services/Confirmation Dialog/confirmation.service';
import { UserService, UserResponse } from '../../../core/services/users/user.service';
import { PaymentService, PaymentDTO  } from '../../../core/services/payments/payment-service';

import { BatchService, BatchResponse } from '../../../core/services/batches/batch.service';
import { forkJoin, of } from 'rxjs';
import { StudentService } from '../../../core/services/student/student-service';
import { LeadResponse, LeadService } from '../../../core/services/lead/lead.service';
import { EnrollmentResponse, EnrollmentService } from '../../../core/services/enrollment/enrollment.service';
import { CommissionDTO, CommissionService } from '../../../core/services/commission/commission-service';
import { NotificationComponent } from '../../notification-component/notification-component';
import { AuthService } from '../../../core/services/loginServices/auth-service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
  permissions: string[];
}

interface StatCard {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  isLoading?: boolean;
}

interface SalesExecutive {
  userId: number;
  fullName: string;
  email: string;
  contactNumber: string;
  avatar: string;
  avatarBg: string;
  totalLeads: number;
  convertedLeads: number;
  totalEnrollments: number;
  totalCommission: number;
}

interface LeadStatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface RecentEnrollment {
  enrollmentId: number;
  studentName: string;
  courseName: string;
  batchName: string;
  enrollmentDate: string;
  discountAmount: number;  // ✅ instead of amountPaid
  status: string;           // ✅ instead of paymentStatus
    totalCourseFees: number;      // ✅ Keep this
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  todayPayments: number;
  thisMonthPayments: number;
}

@Component({
  selector: 'app-admin-dash-board',
  standalone: true,
  imports: [CommonModule, RouterModule,NotificationComponent],
  templateUrl: './admin-dash-board.html',
  styleUrls: ['./admin-dash-board.css'],
})
export class AdminDashBoard implements OnInit {
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  private userService = inject(UserService);
  private studentService = inject(StudentService);
  private paymentService = inject(PaymentService);
  private leadService = inject(LeadService);
  private enrollmentService = inject(EnrollmentService);
  private commissionService = inject(CommissionService);
  private batchService = inject(BatchService);
  private authService = inject(AuthService);
  
  isSidebarCollapsed = signal(false);
  isMobileMenuOpen = signal(false);
  isHovering = signal(false);
  isLoading = signal(true);

  currentUser = computed(() => ({
    name: this.authService.getFullName() || 'User',
    email: '',
    role: this.authService.getRole() || '',
  }));

  // Navigation Items
  navItems: NavItem[] = [
    { icon: 'grid_view', label: 'Dashboard', route: '/admin-dashboard', permissions: ['USER_LIST', 'ROLE_LIST', 'PERMISSION_LIST', 'LEAD_LIST', 'ENROLLMENT_LIST', 'PAYMENT_LIST'] },
    { icon: 'people', label: 'Users', route: '/admin-dashboard/users', permissions: ['USER_LIST', 'USER_READ'] },
    { icon: 'admin_panel_settings', label: 'Roles', route: '/admin-dashboard/roles', permissions: ['ROLE_LIST', 'ROLE_READ'] },
    { icon: 'lock', label: 'Permissions', route: '/admin-dashboard/permissions', permissions: ['PERMISSION_LIST', 'PERMISSION_READ'] },
    { icon: 'person_add', label: 'Leads', route: '/admin-dashboard/leads', permissions: ['LEAD_LIST', 'LEAD_READ'] },
    { icon: 'assignment_turned_in', label: 'Enrollments', route: '/admin-dashboard/enrollments', permissions: ['ENROLLMENT_LIST', 'ENROLLMENT_READ'] },
    { icon: 'source', label: 'Lead Sources', route: '/admin-dashboard/lead-sources', permissions: ['LEAD_SOURCE_LIST', 'LEAD_SOURCE_READ'] },
    { icon: 'history', label: 'Lead Status History', route: '/admin-dashboard/lead-status-history', permissions: ['LEAD_STATUS_HISTORY_LIST', 'LEAD_STATUS_HISTORY_READ'] },
    { icon: 'school', label: 'Courses', route: '/admin-dashboard/courses', permissions: ['COURSE_LIST', 'COURSE_READ'] },
    { icon: 'groups', label: 'Batches', route: '/admin-dashboard/batches', permissions: ['BATCH_LIST', 'BATCH_READ'] },
    { icon: 'fact_check', label: 'Follow-ups', route: '/admin-dashboard/follow-ups', permissions: ['FOLLOW_UP_LIST', 'FOLLOW_UP_READ'] },
    { icon: 'school', label: 'Students', route: '/admin-dashboard/students', permissions: ['STUDENT_LIST', 'STUDENT_READ'] },
    { icon: 'receipt_long', label: 'Student Fees', route: '/admin-dashboard/student-fees', permissions: ['STUDENT_FEE_LIST', 'STUDENT_FEE_READ'] },
    { icon: 'payments', label: 'Payments', route: '/admin-dashboard/payments', permissions: ['PAYMENT_LIST', 'PAYMENT_READ'] },
    // { icon: 'payments', label: 'Payment Installments', route: '/admin-dashboard/payment-installments' },
    { icon: 'percent', label: 'Commissions', route: '/admin-dashboard/commissions', permissions: ['COMMISSION_LIST', 'COMMISSION_READ'] },
    { icon: 'payments', label: 'Commission Payments', route: '/admin-dashboard/commission-payments', permissions: ['COMMISSION_PAYMENT_LIST', 'COMMISSION_PAYMENT_READ'] },
    { icon: 'flag', label: 'Targets', route: '/admin-dashboard/targets', permissions: ['TARGET_LIST', 'TARGET_READ'] },
    { icon: 'history', label: 'Audit Logs', route: '/admin-dashboard/audit-logs', permissions: ['AUDIT_LOG_LIST', 'AUDIT_LOG_READ'] },
    { icon: 'receipt_long', label: 'Invoices', route: '/admin-dashboard/invoices', permissions: ['INVOICE_LIST', 'INVOICE_READ'] }
  ];

  filteredNavItems = computed(() =>
    this.navItems.filter((item) => this.authService.hasAnyPermission(item.permissions))
  );

  // Stats Cards with dynamic data
  statsCards = signal<StatCard[]>([
    {
      icon: 'school',
      iconBg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      label: 'Total Students',
      value: '0',
      trend: 'Loading...',
      trendUp: true,
      isLoading: true
    },
    {
      icon: 'people',
      iconBg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
      label: 'Sales Executives',
      value: '0',
      trend: 'Loading...',
      trendUp: true,
      isLoading: true
    },
    {
      icon: 'person_add',
      iconBg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
      label: 'Total Leads',
      value: '0',
      trend: 'Loading...',
      trendUp: true,
      isLoading: true
    },
    {
      icon: 'currency_rupee',
      iconBg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      label: 'Total Revenue',
      value: '₹ 0',
      trend: 'Loading...',
      trendUp: true,
      isLoading: true
    }
  ]);

  // Sales Executives data
  salesExecutives = signal<SalesExecutive[]>([]);

  // Lead status distribution
  leadStatusData = signal<LeadStatusData[]>([]);

  // Recent enrollments
  recentEnrollments = signal<RecentEnrollment[]>([]);

  // Payment statistics
  paymentStats = signal<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    todayPayments: 0,
    thisMonthPayments: 0
  });

  // Batches data
  activeBatches = signal<BatchResponse[]>([]);

  ngOnInit(): void {
    const currentUrl = this.router.url;
    if (currentUrl !== '/admin-dashboard' && currentUrl !== '/admin-dashboard/') {
      this.isSidebarCollapsed.set(true);
    }

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        if (url !== '/admin-dashboard' && url !== '/admin-dashboard/') {
          this.isSidebarCollapsed.set(true);
        } else {
          this.isSidebarCollapsed.set(false);
        }
      });

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);

    forkJoin({
      users: this.authService.hasAnyPermission(['USER_LIST', 'USER_READ'])
        ? this.userService.getAllUsers()
        : of([]),
      students: this.authService.hasAnyPermission(['STUDENT_LIST', 'STUDENT_READ'])
        ? this.studentService.getAllStudents()
        : of([]),
      payments: this.authService.hasAnyPermission(['PAYMENT_LIST', 'PAYMENT_READ'])
        ? this.paymentService.getAllPayments()
        : of([]),
      leads: this.authService.hasAnyPermission(['LEAD_LIST', 'LEAD_READ'])
        ? this.leadService.getAllLeads()
        : of([]),
      enrollments: this.authService.hasAnyPermission(['ENROLLMENT_LIST', 'ENROLLMENT_READ'])
        ? this.enrollmentService.getAllEnrollments()
        : of([]),
      commissions: this.authService.hasAnyPermission(['COMMISSION_LIST', 'COMMISSION_READ'])
        ? this.commissionService.getAllCommissions()
        : of([]),
      batches: this.authService.hasAnyPermission(['BATCH_LIST', 'BATCH_READ'])
        ? this.batchService.getAllBatches()
        : of([])
    }).subscribe({
      next: (data) => {
        this.processStatsData(data);
        this.processSalesExecutives(data.users, data.leads, data.enrollments, data.commissions);
        this.processLeadStatusData(data.leads);
        this.processRecentEnrollments(data.enrollments);
        this.processPaymentStats(data.payments);
        this.processActiveBatches(data.batches);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading.set(false);
      }
    });
  }

  processStatsData(data: any): void {
    const students = data.students;
    const users = data.users;
    const leads = data.leads;
    const payments = data.payments;

    // Sales Executives count (users with role "Sales Executive")
    const salesExecs = users.filter((u: UserResponse) => 
      u.roleName?.toLowerCase().includes('sales') || u.roleName?.toLowerCase().includes('executive')
    );

    // Total revenue calculation
    const totalRevenue = payments.reduce((sum: number, p: PaymentDTO) => sum + (p.amount || 0), 0);

    // Calculate trends (you can customize this based on your backend data)
    const studentsLastMonth = Math.floor(students.length * 0.9);
    const studentsTrend = ((students.length - studentsLastMonth) / studentsLastMonth * 100).toFixed(1);

    this.statsCards.set([
      {
        icon: 'school',
        iconBg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
        label: 'Total Students',
        value: students.length.toString(),
        trend: `+${studentsTrend}% this month`,
        trendUp: true,
        isLoading: false
      },
      {
        icon: 'people',
        iconBg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        label: 'Sales Executives',
        value: salesExecs.length.toString(),
        trend: `${salesExecs.filter((u: UserResponse) => u.isActive).length} active`,
        trendUp: true,
        isLoading: false
      },
      {
        icon: 'person_add',
        iconBg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
        label: 'Total Leads',
        value: leads.length.toString(),
        trend: `${leads.filter((l: LeadResponse) => l.status === 'NEW').length} new leads`,
        trendUp: true,
        isLoading: false
      },
      {
        icon: 'currency_rupee',
        iconBg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
        label: 'Total Revenue',
        value: `₹ ${this.formatCurrency(totalRevenue)}`,
        trend: `${payments.length} payments`,
        trendUp: true,
        isLoading: false
      }
    ]);
  }

  processSalesExecutives(
  users: UserResponse[], 
  leads: LeadResponse[], 
  enrollments: EnrollmentResponse[],
  commissions: CommissionDTO[]
): void {
  const salesExecs = users.filter(u => 
    u.roleName?.toLowerCase().includes('sales') || u.roleName?.toLowerCase().includes('executive')
  );

  const executivesData: SalesExecutive[] = salesExecs.map((exec, index) => {
    const userLeads = leads.filter(l => l.assignedToUserId === exec.userId);
    const convertedLeads = userLeads.filter(l => l.status === 'CONVERTED');
    
    const userEnrollments = enrollments.filter(e => 
      convertedLeads.some(cl => cl.leadId)
    );
    
    // ✅ FIX: Use correct field name - salesExecutiveId instead of userId
    const userCommissions = commissions.filter(c => c.salesExecutiveId === exec.userId);
    
    // ✅ FIX: Use eligibleAmount instead of commissionAmount
    const totalCommission = userCommissions.reduce((sum, c) => sum + (c.eligibleAmount || 0), 0);

    const colors = [
      'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
      'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
      'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
    ];

    return {
      userId: exec.userId,
      fullName: exec.fullName || 'Unknown',
      email: exec.email || '',
      contactNumber: exec.contactNumber || '',
      avatar: this.getInitials(exec.fullName || 'UK'),
      avatarBg: colors[index % colors.length],
      totalLeads: userLeads.length || 0,
      convertedLeads: convertedLeads.length || 0,
      totalEnrollments: userEnrollments.length || 0,
      totalCommission: totalCommission || 0
    };
  });

  console.log('✅ Sales Executives Data:', executivesData);
  this.salesExecutives.set(executivesData);
}

  processLeadStatusData(leads: LeadResponse[]): void {
    const statusColors: { [key: string]: string } = {
      'NEW': '#60a5fa',
      'CONTACTED': '#a78bfa',
      'INTERESTED': '#34d399',
      'QUALIFIED': '#fbbf24',
      'NEGOTIATION': '#f472b6',
      'CONVERTED': '#10b981',
      'LOST': '#ef4444'
    };

    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const total = leads.length || 1;

    const statusData: LeadStatusData[] = Object.keys(statusCounts).map(status => ({
      status,
      count: statusCounts[status],
      percentage: (statusCounts[status] / total) * 100,
      color: statusColors[status] || '#9ca3af'
    }));

    this.leadStatusData.set(statusData);
  }

processRecentEnrollments(enrollments: EnrollmentResponse[]): void {
  const recent: RecentEnrollment[] = enrollments
    .sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5)
    .map((e) => ({
      enrollmentId: e.enrollmentId,
      studentName: e.studentName || 'N/A',
      courseName: e.courseName || 'N/A',
      batchName: e.batchName || 'N/A',
      enrollmentDate: e.enrollmentDate || '',
      totalCourseFees: e.totalCourseFees || 0,    // ✅ Correct
      discountAmount: e.discountAmount || 0,       // ✅ Correct
      status: e.status || 'ACTIVE'
    }));

  this.recentEnrollments.set(recent);
  console.log('✅ Recent enrollments loaded:', recent);
}

/**
 * ✅ Calculate Discount Percentage
 */
calculateDiscountPercentage(totalFees: number, discount: number): number {
  if (!totalFees || totalFees === 0) return 0;
  return Math.round((discount / totalFees) * 100);
}


  processPaymentStats(payments: PaymentDTO[]): void {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayPayments = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate >= startOfToday;
    });

    const thisMonthPayments = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate >= startOfMonth;
    });

    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    this.paymentStats.set({
      totalPayments: payments.length,
      totalAmount: totalAmount,
      todayPayments: todayPayments.length,
      thisMonthPayments: thisMonthPayments.length
    });
  }

  processActiveBatches(batches: BatchResponse[]): void {
    const active = batches
      .filter(b => b.status === 'ONGOING' || b.status === 'UPCOMING')
      .slice(0, 5);
    this.activeBatches.set(active);
  }

  formatCurrency(amount: number | undefined | null): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0';
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (numAmount >= 10000000) {
      return `${(numAmount / 10000000).toFixed(2)} Cr`;
    } else if (numAmount >= 100000) {
      return `${(numAmount / 100000).toFixed(2)} L`;
    } else if (numAmount >= 1000) {
      return `${(numAmount / 1000).toFixed(2)} K`;
    }
    return numAmount.toFixed(2);
  }

  getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  isExactDashboardRoute(): boolean {
    const url = this.router.url;
    return url === '/admin-dashboard' || url === '/admin-dashboard/';
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.set(!this.isSidebarCollapsed());
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  onMouseEnter(): void {
    if (this.isSidebarCollapsed() && window.innerWidth >= 1024) {
      this.isHovering.set(true);
    }
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  onNavItemClick(): void {
    this.isMobileMenuOpen.set(false);
    if (window.innerWidth >= 1024) {
      this.isSidebarCollapsed.set(true);
    }
  }

  logout(): void {
    this.confirmationService.confirm({
      title: 'Logout',
      message: 'Are you sure you want to logout? You will need to login again to access your account.',
      confirmText: 'Logout',
      cancelText: 'Stay Logged In',
      type: 'warning',
      icon: 'logout'
    }).then((confirmed) => {
      if (confirmed) {
        sessionStorage.clear();
        this.authService.logout();
      }
    });
  }

  getUserInitials(): string {
    const nameParts = this.currentUser().name.split(' ');
    const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || '';
    const lastInitial = nameParts[1]?.charAt(0).toUpperCase() || '';
    return firstInitial + lastInitial;
  }
}
