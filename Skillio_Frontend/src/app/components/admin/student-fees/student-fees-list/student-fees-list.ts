import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentFeesResponse, StudentFeesService } from '../../../../core/services/student-fees/student-fees.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';

@Component({
  selector: 'app-student-fees-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './student-fees-list.html',
  styleUrls: ['./student-fees-list.css']
})
export class StudentFeesListComponent implements OnInit {
  private studentFeesService = inject(StudentFeesService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  public themeService = inject(ThemeService);

  studentFees = signal<StudentFeesResponse[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedPaymentStatus = signal<string>('ALL');
  showOverdueOnly = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  public Math = Math;
  currentPage = signal(1);
  itemsPerPage = signal(7);

  paymentStatuses = ['ALL', 'PENDING', 'PARTIAL', 'COMPLETED'];

  // ✅ Check user role
  isSalesExec = computed(() => this.authService.isSalesExecutive());
  isAdmin = computed(() => this.authService.isAdmin());

  // Filtered fees
  filteredFees = computed(() => {
    let filtered = this.studentFees();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(f =>
        f.studentName.toLowerCase().includes(term) ||
        f.courseName.toLowerCase().includes(term) ||
        f.batchName.toLowerCase().includes(term)
        // f.studentCode.toLowerCase().includes(term)
      );
    }

    // Payment status filter
    if (this.selectedPaymentStatus() !== 'ALL') {
      filtered = filtered.filter(f => f.paymentStatus === this.selectedPaymentStatus());
    }

    // Overdue filter
    if (this.showOverdueOnly()) {
      const today = new Date();
      filtered = filtered.filter(f => {
        const dueDate = new Date(f.dueDate);
        return dueDate < today && f.paymentStatus !== 'COMPLETED';
      });
    }

    return filtered;
  });

  // Stats
  stats = computed(() => {
    const all = this.studentFees();
    const today = new Date();
    return {
      total: all.length,
      pending: all.filter(f => f.paymentStatus === 'PENDING').length,
      partial: all.filter(f => f.paymentStatus === 'PARTIAL').length,
      completed: all.filter(f => f.paymentStatus === 'COMPLETED').length,
      totalFeesAmount: all.reduce((sum, f) => sum + f.totalFees, 0),
      totalPaidAmount: all.reduce((sum, f) => sum + f.paidAmount, 0),
      totalBalanceAmount: all.reduce((sum, f) => sum + f.balanceAmount, 0),
      overdue: all.filter(f => {
        const dueDate = new Date(f.dueDate);
        return dueDate < today && f.paymentStatus !== 'COMPLETED';
      }).length
    };
  });

  totalItems = computed(() => this.filteredFees().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  paginatedFees = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredFees().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadStudentFees();
  }

  // ✅ Load fees based on role
  loadStudentFees(): void {
  this.isLoading.set(true);
  this.errorMessage.set('');

  const isSalesExec = this.authService.isSalesExecutive();
  
  // ✅ DEBUG LOG
  console.log('🔥 Is Sales Executive?', isSalesExec);
  console.log('🔥 User Role:', this.authService.getRole());
  
  const fees$ = isSalesExec
    ? this.studentFeesService.getMyStudentFees()
    : this.studentFeesService.getAllStudentFees();

  // ✅ DEBUG: Check which API is called
  console.log('🔥 Calling:', isSalesExec ? '/my-students' : '/all');

  fees$.subscribe({
    next: (data) => {
      console.log('🔥 Received Fees Count:', data.length);
      console.log('🔥 Fees Data:', data);
      this.studentFees.set(data);
      this.currentPage.set(1);
      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('❌ Error loading student fees:', error);
      this.errorMessage.set('Failed to load student fees');
      this.isLoading.set(false);
    }
  });
}


  // ✅ Navigate with role-aware routing
  navigateToCreate(): void {
    const basePath = this.isSalesExec() ? '/sales-dashboard' : '/admin-dashboard';
    this.router.navigate([`${basePath}/student-fees/create`]);
  }

  navigateToEdit(id: number): void {
    const basePath = this.isSalesExec() ? '/sales-dashboard' : '/admin-dashboard';
    this.router.navigate([`${basePath}/student-fees/edit`, id]);
  }

  navigateToPayFees(feesId: number, studentName: string, balanceAmount: number): void {
    const basePath = this.isSalesExec() ? '/sales-dashboard' : '/admin-dashboard';
    this.router.navigate([`${basePath}/payments/create`], {
      queryParams: {
        feesId: feesId,
        studentName: studentName,
        balanceAmount: balanceAmount,
        returnUrl: `${basePath}/student-fees`
      }
    });
  }

  deleteStudentFees(id: number, studentName: string): void {
    if (!this.isAdmin()) {
      this.confirmationService.confirm({
        title: 'Access Denied',
        message: 'Only admins can delete student fees.',
        type: 'warning',
        confirmText: 'OK',
        cancelText: 'Close'
      });
      return;
    }

    this.confirmationService.confirm({
      title: 'Delete Fees Record',
      message: `Delete fees record for "${studentName}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }).then((confirmed) => {
      if (!confirmed) return;

      this.studentFeesService.deleteStudentFees(id).subscribe({
        next: () => {
          this.successMessage.set('Fees record deleted successfully!');
          this.loadStudentFees();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('Error deleting fees:', error);
          this.errorMessage.set('Failed to delete fees record');
        }
      });
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  updatePaymentStatus(value: string): void {
    this.selectedPaymentStatus.set(value);
    this.currentPage.set(1);
  }

  toggleOverdueFilter(): void {
    this.showOverdueOnly.set(!this.showOverdueOnly());
    this.currentPage.set(1);
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

  isOverdue(dueDate: string, paymentStatus: string): boolean {
    if (paymentStatus === 'COMPLETED') return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  }

  getPaymentStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'PENDING': 'payment-pending',
      'PARTIAL': 'payment-partial',
      'COMPLETED': 'payment-completed'
    };
    return classes[status] || 'payment-pending';
  }

  getPaymentStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'PENDING': 'pending',
      'PARTIAL': 'payments',
      'COMPLETED': 'check_circle'
    };
    return icons[status] || 'pending';
  }

  calculatePercentagePaid(amountPaid: number, totalFees: number): number {
    if (totalFees === 0) return 0;
    return Math.round((amountPaid / totalFees) * 100);
  }
}
