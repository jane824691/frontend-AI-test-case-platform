'use client';

import { useParams } from 'next/navigation';
import { TestCaseEditorForm } from '@/components/test-case-editor-form';

export default function NewTestCasePage() {
  const params = useParams<{ projectId: string }>();

  return <TestCaseEditorForm mode="create" projectId={params.projectId} />;
}
