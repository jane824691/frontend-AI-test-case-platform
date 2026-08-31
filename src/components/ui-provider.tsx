'use client';

import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';

export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#10a37f',
          colorInfo: '#10a37f',
          borderRadius: 10,
          fontFamily: 'Inter, "Noto Sans TC", "Microsoft JhengHei", sans-serif',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
