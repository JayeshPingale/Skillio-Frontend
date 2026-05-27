import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BatchResponse {
  batchId: number;
  batchCode: string;
  batchName: string;
  courseId: number;
  courseName: string;
  startDate: string;
  endDate: string;
  timing: string;          // ✅ Fixed from 'timings'
  modeOfClass: string;     // ✅ Added
  instructor: string;      // ✅ Fixed from 'instructorName'
  description: string;
  status: string;          // ✅ Added (UPCOMING, ONGOING, COMPLETED, CANCELLED)
  enrolledCount: number;   // ✅ Fixed from 'currentEnrollment'
  createdAt: string;
  updatedAt: string;
}

export interface CreateBatchRequest {
  batchCode: string;
  batchName: string;
  courseId: number;
  startDate: string;
  endDate: string;
  timing: string;          // ✅ Fixed from 'timings'
  modeOfClass: string;     // ✅ Fixed from 'modeofClass'
  instructor: string;
  description: string;
}

export interface UpdateBatchRequest {
  batchName: string;
  startDate: string;
  endDate: string;
  timing: string;          // ✅ Fixed from 'timings'
  modeOfClass: string;     // ✅ Fixed from 'modeofClass'
  instructor: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/batches';

  getAllBatches(): Observable<BatchResponse[]> {
    return this.http.get<BatchResponse[]>(this.apiUrl);
  }

  getBatchById(batchId: number): Observable<BatchResponse> {
    return this.http.get<BatchResponse>(`${this.apiUrl}/${batchId}`);
  }

  getBatchesByStatus(status: string): Observable<BatchResponse[]> {
    return this.http.get<BatchResponse[]>(`${this.apiUrl}/by-status/${status}`);
  }

  getBatchesByCourse(courseId: number): Observable<BatchResponse[]> {
    return this.http.get<BatchResponse[]>(`${this.apiUrl}/by-course/${courseId}`);
  }

  createBatch(request: CreateBatchRequest): Observable<BatchResponse> {
    return this.http.post<BatchResponse>(this.apiUrl, request);
  }

  updateBatch(batchId: number, request: UpdateBatchRequest): Observable<BatchResponse> {
    return this.http.put<BatchResponse>(`${this.apiUrl}/${batchId}`, request);
  }

  deleteBatch(batchId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${batchId}`);
  }
}
