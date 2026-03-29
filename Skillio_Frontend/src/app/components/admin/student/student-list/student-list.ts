import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService, StudentResponse } from '../../../../core/services/student/student-service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { StudentDetailsModalComponent } from '../student-details-modal/student-details-modal';  // ✅ ADD

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,StudentDetailsModalComponent],
  templateUrl: './student-list.html',
  styleUrls: ['./student-list.css']
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  students = signal<StudentResponse[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedStatus = signal<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'ON_HOLD'>('ALL');
  successMessage = signal('');
  errorMessage = signal('');
  showDetailsModal = signal(false);
  selectedStudentId = signal<number | null>(null);
  public Math = Math;
  currentPage = signal(1);
  itemsPerPage = signal(7);


  statusOptions: Array<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'ON_HOLD'> = [
    'ALL', 'ACTIVE', 'COMPLETED', 'DROPPED', 'ON_HOLD'
  ];

  isAdmin = computed(() => this.authService.isAdmin());
  isSalesExec = computed(() => this.authService.isSalesExecutive());

  filteredStudents = computed(() => {
    let filtered = this.students();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter((s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.studentCode.toLowerCase().includes(term) ||
        s.contactNumber.includes(term)
      );
    }

    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter((s) => s.status === this.selectedStatus());
    }

    return filtered;
  });

  stats = computed(() => {
    const all = this.students();
    return {
      total: all.length,
      active: all.filter((s) => s.status === 'ACTIVE').length,
      completed: all.filter((s) => s.status === 'COMPLETED').length,
      dropped: all.filter((s) => s.status === 'DROPPED').length,
      onHold: all.filter((s) => s.status === 'ON_HOLD').length
    };
  });

  totalItems = computed(() => this.filteredStudents().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  paginatedStudents = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredStudents().slice(start, start + this.itemsPerPage());
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  // loadStudents(): void {
  //   this.isLoading.set(true);
  //   this.errorMessage.set('');

  //   const isSalesExec = this.authService.isSalesExecutive();
  //   const students$ = isSalesExec
  //     ? this.studentService.getMyStudents()
  //     : this.studentService.getAllStudents();

  //   students$.subscribe({
  //     next: (data) => {
  //       this.students.set(data);
  //       this.isLoading.set(false);
  //     },
  //     error: (error) => {
  //       console.error('Error loading students:', error);
  //       this.errorMessage.set('Failed to load students');
  //       this.isLoading.set(false);
  //     }
  //   });
  // }

  private loadStudents(): void {
  this.isLoading.set(true);
  
  // ✅ Based on role, fetch different students
  const studentObservable = this.isSalesExec() 
    ? this.studentService.getMyStudents()  // Sales Exec: only their students
    : this.studentService.getAllStudents(); // Admin: all students
  
  studentObservable.subscribe({
    next: (data) => {
      this.students.set(data);
      this.currentPage.set(1);
      this.isLoading.set(false);
      
      if (data.length === 0 && this.isSalesExec()) {
        this.errorMessage.set("You haven't enrolled any students yet");
      }
    },
    error: (error) => {
      console.error('Error loading students:', error);
      this.isLoading.set(false);
      this.errorMessage.set('Failed to load students');
    }
  });
}

  navigateToCreate(): void {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['edit', id], { relativeTo: this.route });
  }

  // deleteStudent(id: number, studentName: string): void {
  //   if (!this.isAdmin()) {
  //     this.confirmationService.confirm({
  //       title: 'Access Denied',
  //       message: 'Only admins can delete students.',
  //       type: 'warning',
  //       confirmText: 'OK',
  //       cancelText: 'Close'
  //     });
  //     return;
  //   }

  //   this.confirmationService
  //     .confirm({
  //       title: 'Delete Student',
  //       message: `Are you sure you want to delete "${studentName}"? This action cannot be undone.`,
  //       type: 'danger',
  //       confirmText: 'Delete',
  //       cancelText: 'Cancel'
  //     })
  //     .then((confirmed) => {
  //       if (!confirmed) return;

  //       this.studentService.deleteStudent(id).subscribe({
  //         next: () => {
  //           this.confirmationService.confirm({
  //             title: 'Deleted',
  //             message: 'Student deleted successfully.',
  //             type: 'success',
  //             confirmText: 'OK',
  //             cancelText: 'Close'
  //           });
  //           this.loadStudents();
  //         },
  //         error: (error) => {
  //           console.error('Error deleting student:', error);
  //           this.confirmationService.confirm({
  //             title: 'Delete Failed',
  //             message: 'Failed to delete student. Please try again.',
  //             type: 'danger',
  //             confirmText: 'OK',
  //             cancelText: 'Close'
  //           });
  //         }
  //       });
  //     });
  // }

  deleteStudent(id: number, studentName: string): void {
  // This method is now only called by Admin (from template)
  // But keep the check for safety
  if (!this.isAdmin()) {
    this.confirmationService.confirm({
      title: 'Access Denied',
      message: 'Only admins can delete students.',
      type: 'warning',
      confirmText: 'OK',
      cancelText: 'Close'
    });
    return;
  }

  this.confirmationService
    .confirm({
      title: 'Delete Student',
      message: `Are you sure you want to delete "${studentName}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
    .then((confirmed) => {
      if (!confirmed) return;

      this.studentService.deleteStudent(id).subscribe({
        next: () => {
          this.confirmationService.confirm({
            title: 'Deleted',
            message: 'Student deleted successfully.',
            type: 'success',
            confirmText: 'OK',
            cancelText: 'Close'
          });
          this.loadStudents();
        },
        error: (error) => {
          console.error('Error deleting student:', error);
          this.confirmationService.confirm({
            title: 'Delete Failed',
            message: 'Failed to delete student. Please try again.',
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

  // Calculate age from date of birth
  calculateAge(dob: string | undefined): number {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      ACTIVE: 'status-active',
      COMPLETED: 'status-completed',
      DROPPED: 'status-dropped',
      ON_HOLD: 'status-onhold'
    };
    return classes[status] || 'status-active';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      ACTIVE: 'check_circle',
      COMPLETED: 'task_alt',
      DROPPED: 'cancel',
      ON_HOLD: 'pause_circle'
    };
    return icons[status] || 'check_circle';
  }
  showComingSoonMessage(): void {
  this.confirmationService.confirm({
    title: 'Feature Coming Soon',
    message: 'Delete functionality for students is coming soon. Currently, only admins can delete student records.',
    type: 'info',
    confirmText: 'Got It',
    cancelText: 'Close'
  });
}

  // ✅ ADD: Open modal
  openDetailsModal(studentId: number): void {
    this.selectedStudentId.set(studentId);
    this.showDetailsModal.set(true);
  }

  // ✅ ADD: Close modal
  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedStudentId.set(null);
  }
}
