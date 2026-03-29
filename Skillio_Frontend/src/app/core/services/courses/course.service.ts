import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CourseResponse {
  courseId: number;
  courseName: string;
  description: string;  // ✅ Fixed: lowercase 'd'
  duration: string;
  totalFees: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCourseRequest {
  courseName: string;
  description: string;
  duration: string;
  totalFees: number;
}

export interface UpdateCourseRequest {
  courseName: string;
  description: string;  // ✅ Matches backend
  duration: string;
  totalFees: number;   // ✅ Matches backend
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/courses';

  getAllCourses(): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(this.apiUrl);
  }

  getActiveCourses(): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.apiUrl}/active`);
  }

  getCourseById(courseId: number): Observable<CourseResponse> {
    return this.http.get<CourseResponse>(`${this.apiUrl}/${courseId}`);
  }

  createCourse(request: CreateCourseRequest): Observable<CourseResponse> {
    return this.http.post<CourseResponse>(this.apiUrl, request);
  }

  updateCourse(courseId: number, request: UpdateCourseRequest): Observable<CourseResponse> {
    return this.http.put<CourseResponse>(`${this.apiUrl}/${courseId}`, request);
  }

  deleteCourse(courseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${courseId}`);
  }

  toggleCourseStatus(courseId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${courseId}/toggle-status`, {});
  }
}
