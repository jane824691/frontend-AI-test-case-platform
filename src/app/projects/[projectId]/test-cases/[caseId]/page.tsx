'use client';

import { useParams } from 'next/navigation';
import { TestCaseEditorForm } from '@/components/test-case-editor-form';

export default function TestCaseEditorPage() {
  const params = useParams<{ projectId: string; caseId: string }>();

  return <TestCaseEditorForm mode="edit" projectId={params.projectId} caseId={params.caseId} />;
}
