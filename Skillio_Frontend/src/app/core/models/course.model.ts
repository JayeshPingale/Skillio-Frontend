export interface CourseResponse {
  courseId: number;
  courseName: string;
  description: string;
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
