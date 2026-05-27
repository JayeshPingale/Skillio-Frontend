import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // ✅ ADD ActivatedRoute
import { FormsModule } from '@angular/forms';
import {
  EnrollmentResponse,
  EnrollmentService
} from '../../../../core/services/enrollment/enrollment.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service'; // ✅ ADD

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './enrollment-list.html',
  styleUrls: ['./enrollment-list.css']
})
export class EnrollmentListComponent implements OnInit {
  private enrollmentService = inject(EnrollmentService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(AuthService); // ✅ ADD
  private route = inject(ActivatedRoute); // ✅ ADD

  enrollments = signal<EnrollmentResponse[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedStatus = signal<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'>('ALL');
  successMessage = signal('');
  errorMessage = signal('');
  public Math = Math;
  currentPage = signal(1);
  itemsPerPage = signal(7);

  statusOptions: Array<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'> = [
    'ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'
  ];

  // ✅ ADD: Check user role
  isAdmin = computed(() => this.authService.isAdmin());
  isSalesExec = computed(() => this.authService.isSalesExecutive());

  filteredEnrollments = computed(() => {
    let filtered = this.enrollments();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter((e) =>
        e.studentName.toLowerCase().includes(term) ||
        e.studentEmail.toLowerCase().includes(term) ||
        e.courseName.toLowerCase().includes(term) ||
        e.batchName.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter((e) => e.status === this.selectedStatus());
    }

    return filtered;
  });

  stats = computed(() => {
    const all = this.enrollments();
    return {
      total: all.length,
      active: all.filter((e) => e.status === 'ACTIVE').length,
      completed: all.filter((e) => e.status === 'COMPLETED').length,
      cancelled: all.filter((e) => e.status === 'CANCELLED').length,
      onHold: all.filter((e) => e.status === 'ON_HOLD').length
    };
  });

  totalItems = computed(() => this.filteredEnrollments().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  paginatedEnrollments = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredEnrollments().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadEnrollments();
  }

  // ✅ UPDATED: Role-based loading
  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const isSalesExec = this.authService.isSalesExecutive();
    const enrollments$ = isSalesExec
      ? this.enrollmentService.getMyEnrollments() // ✅ Sales: sirf jo unhone create kiye
      : this.enrollmentService.getAllEnrollments(); // ✅ Admin: sab enrollments

    enrollments$.subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading enrollments:', error);
        this.errorMessage.set('Failed to load enrollments');
        this.isLoading.set(false);
      }
    });
  }

  // ✅ UPDATED: Relative navigation
  navigateToCreate(): void {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['edit', id], { relativeTo: this.route });
  }

  // ✅ UPDATED: Only admin can delete
  deleteEnrollment(id: number, studentName: string): void {
    if (!this.isAdmin()) {
      this.confirmationService.confirm({
        title: 'Access Denied',
        message: 'Only admins can delete enrollments.',
        type: 'warning',
        confirmText: 'OK',
        cancelText: 'Close'
      });
      return;
    }

    this.confirmationService
      .confirm({
        title: 'Delete Enrollment',
        message: `Are you sure you want to delete enrollment for "${studentName}"? This action cannot be undone.`,
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      })
      .then((confirmed) => {
        if (!confirmed) return;

        this.enrollmentService.deleteEnrollment(id).subscribe({
          next: () => {
            this.confirmationService.confirm({
              title: 'Deleted',
              message: 'Enrollment deleted successfully.',
              type: 'success',
              confirmText: 'OK',
              cancelText: 'Close'
            });
            this.loadEnrollments();
          },
          error: (error) => {
            console.error('Error deleting enrollment:', error);
            this.confirmationService.confirm({
              title: 'Delete Failed',
              message: 'Failed to delete enrollment. Please try again.',
              type: 'danger',
              confirmText: 'OK',
              cancelText: 'Close'
            });
          }
        });
      });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  updateStatus(value: string): void {
    this.selectedStatus.set(value as any);
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

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      ACTIVE: 'status-active',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
      ON_HOLD: 'status-onhold'
    };
    return classes[status] || 'status-active';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      ACTIVE: 'check_circle',
      COMPLETED: 'task_alt',
      CANCELLED: 'cancel',
      ON_HOLD: 'pause_circle'
    };
    return icons[status] || 'check_circle';
  }

  // Calculate final fee after discount
  calculateFinalFee(enrollment: EnrollmentResponse): number {
    let finalFee = enrollment.totalCourseFees;
    
    if (enrollment.discountPercentage && enrollment.discountPercentage > 0) {
      finalFee = finalFee - (finalFee * enrollment.discountPercentage / 100);
    } else if (enrollment.discountAmount && enrollment.discountAmount > 0) {
      finalFee = finalFee - enrollment.discountAmount;
    }
    
    return finalFee;
  }

  // Check if enrollment has discount
  hasDiscount(enrollment: EnrollmentResponse): boolean {
    return (enrollment.discountPercentage != null && enrollment.discountPercentage > 0) ||
           (enrollment.discountAmount != null && enrollment.discountAmount > 0);
  }

  // Get discount display text
  getDiscountText(enrollment: EnrollmentResponse): string {
    if (enrollment.discountPercentage && enrollment.discountPercentage > 0) {
      return `${enrollment.discountPercentage}% OFF`;
    } else if (enrollment.discountAmount && enrollment.discountAmount > 0) {
      return `₹${enrollment.discountAmount} OFF`;
    }
    return '';
  }
}
