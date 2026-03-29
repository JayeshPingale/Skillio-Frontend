import { Component, OnInit, signal, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService, StudentResponse } from '../../../../core/services/student/student-service';

@Component({
  selector: 'app-student-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-details-modal.html',
  styleUrls: ['./student-details-modal.css']
})
export class StudentDetailsModalComponent implements OnInit {
  private studentService = inject(StudentService);

  // ✅ Traditional @Input decorator
  @Input({ required: true }) studentId!: number;
  
  // ✅ Traditional @Output decorator
  @Output() close = new EventEmitter<void>();

  student = signal<StudentResponse | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadStudent();
  }

  loadStudent(): void {
    if (!this.studentId) return;

    this.isLoading.set(true);
    this.studentService.getStudentById(this.studentId).subscribe({
      next: (data) => {
        this.student.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading student:', error);
        this.isLoading.set(false);
      }
    });
  }

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

  closeModal(): void {
    this.close.emit();
  }
}
