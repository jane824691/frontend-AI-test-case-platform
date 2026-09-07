import type { ApiResponse, ProjectSummary, ProjectWorkspace, Role, SessionUser, TestCaseDetail, TestCaseSummary } from './contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3003/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<ApiResponse<T>>;
}

export const api = {
  getSession: () => request<{ user: SessionUser }>('/auth/session'),
  createDevSession: (role: Role) => request<{ user: SessionUser; expiresAt: string }>('/auth/dev-session', {
    method: 'POST',
    body: JSON.stringify({ role }),
  }),
  listProjects: () => request<{ items: ProjectSummary[]; total: number }>('/projects'),
  getProjectWorkspace: (projectId: number | string) => request<ProjectWorkspace>(`/projects/${projectId}/workspace`),
  listSectionTestCases: (projectId: number | string, sectionId: number | string) =>
    request<{ projectId: number; requirementSectionId: number; items: TestCaseSummary[]; total: number }>(
      `/projects/${projectId}/sections/${sectionId}/test-cases`,
    ),
  listTestCases: (projectId: number | string) =>
    request<{ projectId: number; items: TestCaseSummary[]; total: number }>(`/projects/${projectId}/test-cases`),
  getTestCaseDetail: (projectId: number | string, testCaseId: number | string) =>
    request<TestCaseDetail>(`/projects/${projectId}/test-cases/${testCaseId}`),
};
