import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { PaymentInstallmentDTO, PaymentInstallmentService } from '../../../../core/services/payments-Installment/payment-installment-service';

@Component({
  selector: 'app-payment-installment-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './payment-installment-list.html',
  styleUrls: ['./payment-installment-list.css']
})
export class PaymentInstallmentListComponent implements OnInit {
  private installmentService = inject(PaymentInstallmentService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  installments = signal<PaymentInstallmentDTO[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedStatus = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');

  statusOptions = ['ALL', 'PENDING', 'PAID', 'OVERDUE'];

  // Filtered installments
  filteredInstallments = computed(() => {
    let filtered = this.installments();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(i =>
        i.studentName.toLowerCase().includes(term) ||
        i.courseName.toLowerCase().includes(term) ||
        i.installmentNumber.toString().includes(term)
      );
    }

    // Status filter
    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter(i => i.paymentStatus === this.selectedStatus());
    }

    // Sort by due date (earliest first)
    return filtered.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  });

  // Stats
  stats = computed(() => {
    const all = this.installments();
    const pending = all.filter(i => i.paymentStatus === 'PENDING');
    const paid = all.filter(i => i.paymentStatus === 'PAID');
    const overdue = all.filter(i => i.paymentStatus === 'OVERDUE');
    
    return {
      total: all.length,
      pending: pending.length,
      paid: paid.length,
      overdue: overdue.length,
      totalAmount: all.reduce((sum, i) => sum + i.installmentAmount, 0),
      pendingAmount: pending.reduce((sum, i) => sum + i.installmentAmount, 0),
      paidAmount: paid.reduce((sum, i) => sum + i.installmentAmount, 0),
      overdueAmount: overdue.reduce((sum, i) => sum + i.installmentAmount, 0)
    };
  });

  ngOnInit(): void {
    this.loadInstallments();
  }

  loadInstallments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.installmentService.getAllInstallments().subscribe({
      next: (data) => {
        this.installments.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading installments:', error);
        this.errorMessage.set('Failed to load installments');
        this.isLoading.set(false);
      }
    });
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin-dashboard/payment-installments/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/admin-dashboard/payment-installments/edit', id]);
  }

  markAsPaid(id: number, studentName: string): void {
    if (confirm(`Mark installment for "${studentName}" as paid?`)) {
      this.installmentService.markAsPaid(id).subscribe({
        next: () => {
          this.successMessage.set('Installment marked as paid successfully!');
          this.loadInstallments();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('Error marking as paid:', error);
          this.errorMessage.set('Failed to mark installment as paid');
        }
      });
    }
  }

  deleteInstallment(id: number, studentName: string): void {
    if (confirm(`Delete installment for "${studentName}"?`)) {
      this.installmentService.deleteInstallment(id).subscribe({
        next: () => {
          this.successMessage.set('Installment deleted successfully!');
          this.loadInstallments();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('Error deleting installment:', error);
          this.errorMessage.set('Failed to delete installment');
        }
      });
    }
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updateStatus(value: string): void {
    this.selectedStatus.set(value);
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'PENDING': 'status-pending',
      'PAID': 'status-paid',
      'OVERDUE': 'status-overdue'
    };
    return classes[status] || 'status-pending';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'PENDING': 'pending',
      'PAID': 'check_circle',
      'OVERDUE': 'error'
    };
    return icons[status] || 'pending';
  }

  isOverdue(dueDate: string, status: string): boolean {
    if (status === 'PAID') return false;
    return new Date(dueDate) < new Date();
  }
}
