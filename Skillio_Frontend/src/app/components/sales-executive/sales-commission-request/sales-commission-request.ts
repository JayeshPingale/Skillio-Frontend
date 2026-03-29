import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommissionService, EnrolledStudentCommissionView, CreateCommissionRequest } from '../../../core/services/commission/commission-service';
import { AuthService } from '../../../core/services/loginServices/auth-service';
import { ThemeService } from '../../../core/services/theme/theme-service';

@Component({
  selector: 'app-sales-commission-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-commission-request.html',
  styleUrls: ['./sales-commission-request.css']
})
export class SalesCommissionRequestComponent implements OnInit {

  private commissionService = inject(CommissionService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private router = inject(Router);

  enrolledStudents = signal<EnrolledStudentCommissionView[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  successMessage = signal('');
  errorMessage = signal('');

  // Modal
  showModal = signal(false);
  selectedStudent = signal<EnrolledStudentCommissionView | null>(null);
  isSubmitting = signal(false);

  // Form fields
  commissionPercentage = signal<number>(10);
  requestRemarks = signal('');

  filteredStudents = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.enrolledStudents();
    return this.enrolledStudents().filter(s =>
      s.studentName?.toLowerCase().includes(term) ||
      s.courseName?.toLowerCase().includes(term) ||
      s.studentCode?.toLowerCase().includes(term)
    );
  });

  // Computed eligible amount preview
  eligibleAmountPreview = computed(() => {
    const student = this.selectedStudent();
    if (!student) return 0;
    return (student.totalCourseFee * this.commissionPercentage()) / 100;
  });

  ngOnInit(): void {
    this.loadEnrolledStudents();
  }

  loadEnrolledStudents(): void {
    this.isLoading.set(true);
    this.commissionService.getMyEnrolledStudents().subscribe({
      next: (data) => { this.enrolledStudents.set(data); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load enrolled students'); this.isLoading.set(false); }
    });
  }

  openRequestModal(student: EnrolledStudentCommissionView): void {
    this.selectedStudent.set(student);
    this.commissionPercentage.set(10);
    this.requestRemarks.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedStudent.set(null);
  }

  submitRequest(): void {
    const student = this.selectedStudent();
    if (!student) return;

    if (this.commissionPercentage() <= 0 || this.commissionPercentage() > 100) {
      this.errorMessage.set('Commission percentage must be between 1 and 100');
      return;
    }

    this.isSubmitting.set(true);
    const salesExecId = this.authService.getUserId();

    const request: CreateCommissionRequest = {
      enrollmentId: student.enrollmentId,
      salesExecutiveId: salesExecId!,
      totalCourseFees: student.totalCourseFee,
      commissionPercentage: this.commissionPercentage(),
      remarks: this.requestRemarks()
    };

    this.commissionService.requestCommission(request).subscribe({
      next: () => {
        this.successMessage.set(` Commission request submitted for ${student.studentName}! Waiting for admin approval.`);
        this.closeModal();
        this.loadEnrolledStudents();
        this.isSubmitting.set(false);
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to submit request');
        this.isSubmitting.set(false);
        setTimeout(() => this.errorMessage.set(''), 4000);
      }
    });
  }

  getCommissionStatusClass(status?: string): string {
    if (!status) return '';
    const map: { [k: string]: string } = {
      'PENDING': 'cs-pending',
      'PENDING_APPROVAL': 'cs-pending-approval',
      'APPROVED': 'cs-approved',
      'ELIGIBLE': 'cs-eligible',
      'PAID': 'cs-paid',
      'REJECTED': 'cs-rejected'
    };
    return map[status] || '';
  }

  getPaymentProgress(student: EnrolledStudentCommissionView): number {
    if (!student.totalCourseFee) return 0;
    return Math.round((student.totalFeesPaid / student.totalCourseFee) * 100);
  }

  navigateToMyCommissions(): void {
    this.router.navigate(['/sales-dashboard/commissions']);
  }

  updateSearchTerm(value: string): void { this.searchTerm.set(value); }
}
