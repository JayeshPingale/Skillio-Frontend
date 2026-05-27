import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CourseResponse, CourseService } from '../../../../core/services/courses/course.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';


@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './course-list.html',
  styleUrls: ['./course-list.css']
})
export class CourseList implements OnInit {
  private courseService = inject(CourseService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private confirmationService = inject(ConfirmationService); // ✅ Inject

  courses = signal<CourseResponse[]>([]);
  filteredCourses = signal<CourseResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  selectedFilter = signal('ALL');

  filterOptions = ['ALL', 'ACTIVE', 'INACTIVE'];

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService.getAllCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.filteredCourses.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load courses. Please try again.');
        this.isLoading.set(false);
        console.error('Error loading courses:', error);
      }
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.filterCourses();
  }

  updateSelectedFilter(value: string): void {
    this.selectedFilter.set(value);
    this.filterCourses();
  }

  filterCourses(): void {
    let filtered = this.courses();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(course => 
        course.courseName.toLowerCase().includes(term) ||
        course.description.toLowerCase().includes(term) ||
        course.duration.toLowerCase().includes(term)
      );
    }

    if (this.selectedFilter() === 'ACTIVE') {
      filtered = filtered.filter(course => course.isActive);
    } else if (this.selectedFilter() === 'INACTIVE') {
      filtered = filtered.filter(course => !course.isActive);
    }

    this.filteredCourses.set(filtered);
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin-dashboard/courses/create']);
  }

  navigateToEdit(courseId: number): void {
    this.router.navigate(['/admin-dashboard/courses/edit', courseId]);
  }

  // ✅ Updated delete method with Confirmation Dialog
  async deleteCourse(courseId: number, courseName: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Course',
      message: `Are you sure you want to delete "${courseName}"? This action cannot be undone and may affect associated batches.`,
      confirmText: 'Delete Course',
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'delete'
    });

    if (confirmed) {
      this.courseService.deleteCourse(courseId).subscribe({
        next: () => {
          this.successMessage.set(`Course "${courseName}" deleted successfully!`);
          this.loadCourses();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          this.errorMessage.set('Failed to delete course. It may be linked to batches.');
          console.error('Delete error:', error);
        }
      });
    }
  }

  getCourseStats() {
    return {
      total: this.courses().length,
      active: this.courses().filter(c => c.isActive).length,
      inactive: this.courses().filter(c => !c.isActive).length
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
