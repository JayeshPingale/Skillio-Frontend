export interface UserResponse {
  userId: number;
  fullName: string;
  email: string;
  contactNumber: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  contactNumber: string;
  roleId: number;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  contactNumber: string;
  roleId: number;
  isActive: boolean;
}
