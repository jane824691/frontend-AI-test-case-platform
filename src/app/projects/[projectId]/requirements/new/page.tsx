'use client';

import { useParams } from 'next/navigation';
import { RequirementEditorForm } from '@/components/requirement-editor-form';

export default function NewRequirementPage() {
  const params = useParams<{ projectId: string }>();

  return <RequirementEditorForm projectId={params.projectId} />;
}
