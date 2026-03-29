import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { LeadService } from '../../../core/services/lead/lead.service';
import { TargetService } from '../../../core/services/target/target.service';
import { CommissionService } from '../../../core/services/commission/commission-service';
import { ThemeService } from '../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../core/services/loginServices/auth-service';
import { NotificationComponent } from '../../notification-component/notification-component';

interface SalesNavItem {
  icon: string;
  label: string;
  route: string;
  permissions: string[];
}

@Component({
  selector: 'app-sales-executive-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet,NotificationComponent],
  templateUrl: './sales-executive-dash-board.html',
  styleUrls: ['./sales-executive-dash-board.css']
})
export class SalesExecutiveDashBoard implements OnInit {
  private leadService = inject(LeadService);
  private targetService = inject(TargetService);
  private commissionService = inject(CommissionService);
  private router = inject(Router);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);

  // Sidebar state
  isSidebarCollapsed = signal(false);
  isMobileSidebarOpen = signal(false);
  isHovering = signal(false);

  // Loading states
  isLoading = signal(false);
  errorMessage = signal('');

  // Dashboard Stats
  totalLeads = signal(0);
  newLeads = signal(0);
  interestedLeads = signal(0);
  convertedLeads = signal(0);

  // Targets
  activeTargets = signal(0);
  completedTargets = signal(0);
  currentMonthTarget = signal<any>(null);

  // Commissions
  totalEligibleCommission = signal(0);
  totalPaidCommission = signal(0);
  pendingCommissions = signal(0);

  // Computed
  conversionRate = computed(() => {
    const total = this.totalLeads();
    const converted = this.convertedLeads();
    if (total === 0) return 0;
    return Math.round((converted / total) * 100);
  });

  // Recent Leads
  recentLeads = signal<any[]>([]);

  salesNavItems: SalesNavItem[] = [
    { icon: 'grid_view', label: 'Dashboard', route: '/sales-dashboard', permissions: ['LEAD_LIST', 'LEAD_READ', 'FOLLOW_UP_LIST'] },
    { icon: 'group', label: 'My Leads', route: '/sales-dashboard/leads', permissions: ['LEAD_LIST', 'LEAD_READ'] },
    { icon: 'schedule', label: 'Follow-ups', route: '/sales-dashboard/follow-ups', permissions: ['FOLLOW_UP_LIST', 'FOLLOW_UP_READ'] },
    { icon: 'assignment', label: 'Enrollments', route: '/sales-dashboard/enrollments', permissions: ['ENROLLMENT_LIST', 'ENROLLMENT_READ'] },
    { icon: 'person', label: 'Students', route: '/sales-dashboard/students', permissions: ['STUDENT_LIST', 'STUDENT_READ'] },
    { icon: 'payments', label: 'Students Fees', route: '/sales-dashboard/student-fees', permissions: ['STUDENT_FEE_LIST', 'STUDENT_FEE_READ'] },
    { icon: 'receipt_long', label: 'Payments', route: '/sales-dashboard/payments', permissions: ['PAYMENT_LIST', 'PAYMENT_READ'] },
    { icon: 'flag', label: 'My Targets', route: '/sales-dashboard/targets', permissions: ['TARGET_LIST', 'TARGET_READ'] },
    { icon: 'payments', label: 'Commissions', route: '/sales-dashboard/commissions', permissions: ['COMMISSION_LIST', 'COMMISSION_READ'] },
    { icon: 'request_quote', label: 'Request Commission', route: '/sales-dashboard/commission-request', permissions: ['COMMISSION_CREATE'] },
    { icon: 'school', label: 'Courses', route: '/sales-dashboard/courses', permissions: ['COURSE_LIST', 'COURSE_READ'] },
    { icon: 'groups', label: 'Batches', route: '/sales-dashboard/batches', permissions: ['BATCH_LIST', 'BATCH_READ'] },
    { icon: 'description', label: 'Invoices', route: '/sales-dashboard/invoices', permissions: ['INVOICE_LIST', 'INVOICE_READ'] },
  ];

  filteredNavItems = computed(() =>
    this.salesNavItems.filter((item) => this.authService.hasAnyPermission(item.permissions))
  );

  ngOnInit(): void {
    // Set initial sidebar state based on route
    const currentUrl = this.router.url;
    if (currentUrl !== '/sales-dashboard' && currentUrl !== '/sales-dashboard/') {
      this.isSidebarCollapsed.set(true);
    }

    // Listen to route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        if (url !== '/sales-dashboard' && url !== '/sales-dashboard/') {
          this.isSidebarCollapsed.set(true);
        } else {
          this.isSidebarCollapsed.set(false);
        }

        // Load dashboard data when on main route
        if (this.isExactDashboardRoute()) {
          this.loadDashboardData();
        }
      });

    // Initial load
    if (this.isExactDashboardRoute()) {
      this.loadDashboardData();
    }
  }

  loadDashboardData(): void {
  this.isLoading.set(true);
  this.errorMessage.set('');

  forkJoin({
    leads: this.authService.hasAnyPermission(['LEAD_LIST', 'LEAD_READ'])
      ? this.leadService.getMyLeads()
      : of([]),
    targets: this.authService.hasAnyPermission(['TARGET_LIST', 'TARGET_READ'])
      ? this.targetService.getMyTargets()
      : of([]),
    // ✅ CHANGED: Use getMyCommissions() instead of getCommissionsBySalesExecutive()
    commissions: this.authService.hasAnyPermission(['COMMISSION_LIST', 'COMMISSION_READ'])
      ? this.commissionService.getMyCommissions()
      : of([]),
    
  }).subscribe({
    next: (data) => {
      // Lead Stats
      this.totalLeads.set(data.leads.length);
      this.newLeads.set(data.leads.filter(l => l.status === 'NEW').length);
      this.interestedLeads.set(data.leads.filter(l => l.status === 'INTERESTED').length);
      this.convertedLeads.set(data.leads.filter(l => l.status === 'CONVERTED').length);

      // Recent Leads (last 5)
      const recent = data.leads
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      this.recentLeads.set(recent);

      // Target Stats
      this.activeTargets.set(data.targets.filter(t => t.status === 'ACTIVE').length);
      this.completedTargets.set(data.targets.filter(t => t.status === 'COMPLETED').length);

      // Get current month active target
      const activeTarget = data.targets.find(t => t.status === 'ACTIVE');
      this.currentMonthTarget.set(activeTarget || null);

      // ✅ Commission Stats - UNCOMMENT THESE
      const commissions = data.commissions ?? [];
      const eligibleStatuses = new Set(['ELIGIBLE', 'APPROVED', 'PAID']);
      const paidStatuses = new Set(['PAID']);
      const pendingStatuses = new Set(['PENDING', 'PENDING_APPROVAL']);

      this.totalEligibleCommission.set(
        commissions
          .filter(c => eligibleStatuses.has(c.status))
          .reduce((sum, c) => sum + (c.eligibleAmount || 0), 0)
      );
      this.totalPaidCommission.set(
        commissions
          .filter(c => paidStatuses.has(c.status))
          .reduce((sum, c) => sum + (c.eligibleAmount || 0), 0)
      );
      this.pendingCommissions.set(
        commissions.filter(c => pendingStatuses.has(c.status)).length
      );

      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('❌ Error loading dashboard data:', error);
      this.errorMessage.set('Failed to load dashboard data');
      this.isLoading.set(false);
    }
  });
}


  // Check if we're on the exact dashboard route
  isExactDashboardRoute(): boolean {
    const url = this.router.url;
    return url === '/sales-dashboard' || url === '/sales-dashboard/';
  }

  // Sidebar actions
  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(v => !v);
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  onMouseEnter(): void {
    if (this.isSidebarCollapsed() && window.innerWidth >= 1024) {
      this.isHovering.set(true);
    }
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  onNavItemClick(): void {
    this.isMobileSidebarOpen.set(false);
    if (window.innerWidth >= 1024) {
      this.isSidebarCollapsed.set(true);
    }
  }

  // Navigation methods
  navigateToLeads(): void {
    this.router.navigate(['/sales-dashboard/leads']);
    this.closeMobileSidebar();
  }

  navigateToTargets(): void {
    this.router.navigate(['/sales-dashboard/targets']);
    this.closeMobileSidebar();
  }

  navigateToCommissions(): void {
    this.router.navigate(['/sales-dashboard/commissions']);
    this.closeMobileSidebar();
  }

  navigateToCreateLead(): void {
    this.router.navigate(['/sales-dashboard/leads/create']);
    this.closeMobileSidebar();
  }

  navigateToFollowUps(): void {
    this.router.navigate(['/sales-dashboard/follow-ups']);
    this.closeMobileSidebar();
  }

  navigateToEnrollments(): void {
    this.router.navigate(['/sales-dashboard/enrollments']);
    this.closeMobileSidebar();
  }

  navigateToPayments(): void {
    this.router.navigate(['/sales-dashboard/payments']);
    this.closeMobileSidebar();
  }
  // Logout
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
        this.authService.logout();
      }
    });
  }

  // Helper methods
  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'NEW': 'status-new',
      'CONTACTED': 'status-contacted',
      'INTERESTED': 'status-interested',
      'QUALIFIED': 'status-qualified',
      'NEGOTIATION': 'status-negotiation',
      'CONVERTED': 'status-converted',
      'LOST': 'status-lost'
    };
    return classes[status] || 'status-new';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 80) return 'progress-success';
    if (percentage >= 50) return 'progress-warning';
    return 'progress-danger';
  }
}
