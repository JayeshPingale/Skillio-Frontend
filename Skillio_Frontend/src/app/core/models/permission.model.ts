export interface PermissionResponse {
  permissionId: number;
  permissionName: string;
  module: string;
  description: string;
}

export interface PermissionRequest {
  permissionName: string;
  module: string;
  description: string;
}
