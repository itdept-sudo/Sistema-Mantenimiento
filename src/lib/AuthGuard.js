'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && pathname !== '/login') return null;

  return <>{children}</>;
}
