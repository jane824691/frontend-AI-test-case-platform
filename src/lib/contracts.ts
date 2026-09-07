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

export interface RequirementVersionSummary {
  requirementVersionId: number;
  versionNumber: number;
  changeSummary: string | null;
  updatedAt: string | null;
}

export interface ProjectSummary {
  projectId: number;
  name: string;
  statusCode: number;
  owner: {
    userId: number;
    name: string;
    role: Role | string;
  } | null;
  membersSummary: {
    total: number;
    admins: number;
    pms: number;
    qas: number;
    developers: number;
  };
  latestRequirementVersion: RequirementVersionSummary | null;
  sectionCount: number;
  testCaseCount: number;
  draftCount: number;
  publishedCount: number;
  rejectedCount: number;
  updatedAt: string;
}

export interface RequirementSectionSummary {
  requirementSectionId: number;
  sectionKey: string;
  heading: string;
  headingPath: string;
  sectionOrder: number;
  statusCode: number;
  testCaseCount: number;
  draftCount: number;
  publishedCount: number;
  rejectedCount: number;
}

export interface TestCaseSummary {
  testCaseId: number;
  projectId: number;
  requirementSectionId: number | null;
  sectionKey: string | null;
  stableCaseCode: string;
  currentStatus: TestCaseStatus | string;
  currentTestCaseVersionId: number | null;
  publishedTestCaseVersionId: number | null;
  updatedByUserId: number | null;
  updatedByUserName: string | null;
  updatedAt: string | null;
  passFailResult: PassFailResult | string | null;
  passFailUpdatedByUserId: number | null;
  passFailUpdatedByName: string | null;
  latestVersion: {
    testCaseVersionId: number | null;
    revisionNumber: number | null;
    title: string | null;
    priority: string | null;
    suggestedTestLevel: string | null;
  };
  publishedVersion: {
    testCaseVersionId: number | null;
    revisionNumber: number | null;
  };
}

export interface TestCaseDetail extends TestCaseSummary {
  latestVersion: TestCaseSummary['latestVersion'] & {
    description: string | null;
    preconditions: string | null;
    expectedResult: string | null;
    reusabilityNote: string | null;
    unitTestRecommended: boolean;
    generatedByAi: boolean;
    updatedByUserId: number | null;
    updatedByUserName: string | null;
    updatedAt: string | null;
  };
}

export interface ProjectWorkspace {
  project: ProjectSummary;
  latestRequirementVersion: RequirementVersionSummary | null;
  sections: RequirementSectionSummary[];
  recentTestCases: TestCaseSummary[];
}
