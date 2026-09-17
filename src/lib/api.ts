import type {
  ApiResponse,
  ProjectSummary,
  ProjectWorkspace,
  RequirementUploadPayload,
  RequirementUploadResponse,
  Role,
  SessionUser,
  TestCaseDetail,
  TestCaseEditorPayload,
  TestCaseMutationResponse,
  TestCasePublishResponse,
  TestCaseSummary,
  PassFailResult,
} from './contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3003/api/v1';
const inFlightGetRequests = new Map<string, Promise<ApiResponse<unknown>>>();

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const requestKey = `${method} ${path}`;
  if (method === 'GET') {
    const inFlight = inFlightGetRequests.get(requestKey);
    if (inFlight) return inFlight as Promise<ApiResponse<T>>;
  }

  const requestPromise = fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  }).then((response) => {
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return response.json() as Promise<ApiResponse<T>>;
  });

  if (method === 'GET') {
    inFlightGetRequests.set(requestKey, requestPromise as Promise<ApiResponse<unknown>>);
    requestPromise.finally(() => inFlightGetRequests.delete(requestKey));
  }

  return requestPromise;
}

export const api = {
  getSession: () => request<{ user: SessionUser }>('/auth/session'),
  createDevSession: (role: Role) => request<{ user: SessionUser; expiresAt: string }>('/auth/dev-session', {
    method: 'POST',
    body: JSON.stringify({ role }),
  }),
  listProjects: () => request<{ items: ProjectSummary[]; total: number }>('/projects'),
  createProjectFromRequirement: (payload: RequirementUploadPayload) =>
    request<RequirementUploadResponse>('/projects/from-requirement', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getProjectWorkspace: (projectId: number | string) => request<ProjectWorkspace>(`/projects/${projectId}/workspace`),
  listSectionTestCases: (projectId: number | string, sectionId: number | string) =>
    request<{ projectId: number; requirementSectionId: number; items: TestCaseSummary[]; total: number }>(
      `/projects/${projectId}/sections/${sectionId}/test-cases`,
    ),
  listTestCases: (projectId: number | string) =>
    request<{ projectId: number; items: TestCaseSummary[]; total: number }>(`/projects/${projectId}/test-cases`),
  getTestCaseDetail: (projectId: number | string, testCaseId: number | string) =>
    request<TestCaseDetail>(`/projects/${projectId}/test-cases/${testCaseId}`),
  createTestCase: (projectId: number | string, payload: TestCaseEditorPayload) =>
    request<TestCaseMutationResponse>(`/projects/${projectId}/test-cases`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTestCase: (projectId: number | string, testCaseId: number | string, payload: TestCaseEditorPayload) =>
    request<TestCaseMutationResponse>(`/projects/${projectId}/test-cases/${testCaseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  publishTestCase: (projectId: number | string, testCaseId: number | string, comment: string) =>
    request<TestCasePublishResponse>(`/projects/${projectId}/test-cases/${testCaseId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  reopenTestCase: (projectId: number | string, testCaseId: number | string) =>
    request<TestCaseDetail>(`/projects/${projectId}/test-cases/${testCaseId}/reopen`, {
      method: 'POST',
    }),
  deleteTestCase: (projectId: number | string, testCaseId: number | string) =>
    request<{ projectId: number; testCaseId: number; deleted: boolean }>(`/projects/${projectId}/test-cases/${testCaseId}`, {
      method: 'DELETE',
    }),
  updateTestCaseResult: (projectId: number | string, testCaseId: number | string, result: PassFailResult) =>
    request<TestCaseDetail>(`/projects/${projectId}/test-cases/${testCaseId}/result`, {
      method: 'PATCH',
      body: JSON.stringify({ result }),
    }),
  uploadMarkdownRequirement: (projectId: number | string, payload: RequirementUploadPayload) =>
    request<RequirementUploadResponse>(`/projects/${projectId}/requirement-documents/upload`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCurrentRequirementText: (projectId: number | string, payload: RequirementUploadPayload) =>
    request<RequirementUploadResponse>(`/projects/${projectId}/requirement-documents/current`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
