// src/app/core/models/follow-up.model.ts

export interface FollowUpResponse {
  followUpId: number;
  leadId: number;
  leadName: string;
  followUpDate: string;
  followUpType: 'CALL' | 'EMAIL' | 'VISIT' | 'WHATSAPP';
  notes: string;
  nextFollowUpDate: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED';
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpRequest {
  leadId: number;
  followUpDate: string;
  followUpType: 'CALL' | 'EMAIL' | 'VISIT' | 'WHATSAPP';
  notes: string;
  nextFollowUpDate: string;
}

export interface UpdateFollowUpRequest {
  followUpDate: string;
  followUpType: 'CALL' | 'EMAIL' | 'VISIT' | 'WHATSAPP';
  notes: string;
  nextFollowUpDate: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED';
}

export interface FollowUpStats {
  total: number;
  scheduled: number;
  completed: number;
  missed: number;
  dueToday: number;
  overdue: number;
}
