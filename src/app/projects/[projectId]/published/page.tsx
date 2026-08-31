 'use client';
import { PagePanel } from '@/components/page-panel';

export default function PublishedCasesPage() {
  return <PagePanel title="已發布案例" description="已發布案例是目前團隊可見的正式內容；被退回的案例則會以「已退回」狀態分開呈現。" apiPath="GET /projects/{project_id}/test-cases?status=published" />;
}
