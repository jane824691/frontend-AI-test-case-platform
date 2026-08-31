 'use client';
import { PagePanel } from '@/components/page-panel';

export default function DiffPage() {
  return <PagePanel title="需求差異比對" description="這裡會顯示章節層級的變更狀態，並只允許針對已變更章節進行局部重新生成。" showVersion />;
}
