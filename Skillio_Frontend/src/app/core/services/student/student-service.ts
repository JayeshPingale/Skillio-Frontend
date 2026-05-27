import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
export interface StudentResponse {
  studentId: number;
  studentCode: string;
  fullName: string;
  email: string;
  contactNumber: string;
  alternateContact?: string;  // ✅ Added
  address: string;
  dateOfBirth?: string;  // ✅ Added
  enrollmentDate: string;
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  fullName: string;
  email: string;
  contactNumber: string;
  alternateContact?: string;  // ✅ Added
  address: string;
  dateOfBirth: string;  // ✅ Added (YYYY-MM-DD format)
}

export interface UpdateStudentRequest {
  fullName: string;
  email: string;
  contactNumber: string;
  alternateContact?: string;  // ✅ Added
  address: string;
  dateOfBirth?: string;  // ✅ Added (optional)
  remarks?: string;
}

export interface StudentStats {
  total: number;
  recentlyAdded: number;
}
@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/students`;

  // Get all students
  getAllStudents(): Observable<StudentResponse[]> {
    return this.http.get<StudentResponse[]>(this.apiUrl);
  }

  getMyStudents(): Observable<StudentResponse[]> {
  return this.http.get<StudentResponse[]>(`${this.apiUrl}/my-students`);
}

  // Get student by ID
  getStudentById(studentId: number): Observable<StudentResponse> {
    return this.http.get<StudentResponse>(`${this.apiUrl}/${studentId}`);
  }

  // Get student by email
  getStudentByEmail(email: string): Observable<StudentResponse> {
    return this.http.get<StudentResponse>(`${this.apiUrl}/email/${email}`);
  }

  // Create student
  createStudent(request: CreateStudentRequest): Observable<StudentResponse> {
    return this.http.post<StudentResponse>(this.apiUrl, request);
  }

  // Update student
  updateStudent(studentId: number, request: UpdateStudentRequest): Observable<StudentResponse> {
    return this.http.put<StudentResponse>(`${this.apiUrl}/${studentId}`, request);
  }

  // Delete student
  deleteStudent(studentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${studentId}`);
  }
}
