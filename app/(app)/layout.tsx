import { Sidebar } from '@/components/Sidebar';
import { LockProvider } from '@/components/LockOverlay';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LockProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-bg">
          <div className="page-anim mx-auto max-w-[1400px] px-10 py-7 pb-12">{children}</div>
        </main>
      </div>
    </LockProvider>
  );
}
