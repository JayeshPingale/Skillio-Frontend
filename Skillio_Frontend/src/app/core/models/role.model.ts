export interface RoleResponse {
  roleId: number;
  roleName: string;
  description: string;
  createdAt: string;
}

export interface RoleRequest {
  roleName: string;
  description: string;
}

export interface UpdateRoleRequest {
  roleName: string;
  description: string;
}

export interface RolePermissionResponse {
  roleId: number;
  roleName: string;
  permissionId: number;
  permissionName: string;
}

export interface AssignPermissionToRoleRequest {
  roleId: number;
  permissionIds: number[];
}
