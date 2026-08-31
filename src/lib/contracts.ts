export type Role = 'admin' | 'pm' | 'qa' | 'developer';
export type TestCaseStatus = 'draft' | 'published' | 'rejected';
export type PassFailResult = 'pass' | 'fail' | 'hold';

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  globalRole: Role;
  projectRole: Role;
}

export interface ApiResponse<T> {
  data: T;
  meta?: { stub: boolean };
}

