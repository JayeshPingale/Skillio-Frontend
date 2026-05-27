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
  alternateContact?: string;
  courseName?: string;
  batchName?: string;
  address: string;
  dateOfBirth?: string;
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
  alternateContact?: string;
  address: string;
  dateOfBirth: string;
}

export interface UpdateStudentRequest {
  fullName: string;
  email: string;
  contactNumber: string;
  alternateContact?: string;
  address: string;
  dateOfBirth?: string;
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

  getAllStudents(): Observable<StudentResponse[]> {
    return this.http.get<StudentResponse[]>(this.apiUrl);
  }

  getMyStudents(): Observable<StudentResponse[]> {
    return this.http.get<StudentResponse[]>(`${this.apiUrl}/my-students`);
  }

  getStudentById(studentId: number): Observable<StudentResponse> {
    return this.http.get<StudentResponse>(`${this.apiUrl}/${studentId}`);
  }

  getStudentByEmail(email: string): Observable<StudentResponse> {
    return this.http.get<StudentResponse>(`${this.apiUrl}/email/${email}`);
  }

  createStudent(request: CreateStudentRequest): Observable<StudentResponse> {
    return this.http.post<StudentResponse>(this.apiUrl, request);
  }

  updateStudent(studentId: number, request: UpdateStudentRequest): Observable<StudentResponse> {
    return this.http.put<StudentResponse>(`${this.apiUrl}/${studentId}`, request);
  }

  deleteStudent(studentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${studentId}`);
  }
}
