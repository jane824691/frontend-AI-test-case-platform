import type { Metadata } from 'next';
import 'antd/dist/reset.css';
import './globals.css';
import { UiProvider } from '@/components/ui-provider';

export const metadata: Metadata = {
  title: 'AI 測試案例平台',
  description: 'AI 輔助測試案例管理平台',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body><UiProvider>{children}</UiProvider></body></html>;
}
