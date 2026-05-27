export interface BatchResponse {
  batchId: number;
  batchCode: string;
  batchName: string;
  courseId: number;
  courseName: string;
  startDate: string;
  endDate: string;
  timing: string;
  modeOfClass: string;
  instructor: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  enrolledCount: number;
}

export interface CreateBatchRequest {
  batchCode: string;
  batchName: string;
  courseId: number;
  startDate: string;
  endDate: string;
  timing: string;
  modeOfClass: string;
  instructor: string;
  status: string;
}

export interface UpdateBatchRequest {
  batchName: string;
  startDate: string;
  endDate: string;
  timing: string;
  modeOfClass: string;
  instructor: string;
  status: string;
}
