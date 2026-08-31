 'use client';
import { PagePanel } from '@/components/page-panel';

export default function ApprovalQueuePage() {
  return <PagePanel title="審核佇列" description="在 Phase 1 中，QA 或 PM 的發布操作會立即使案例成為團隊可見的已發布狀態。" apiPath="GET /projects/{project_id}/test-cases?view=approval_queue" />;
}
