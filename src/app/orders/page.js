'use client';

import { useAuth } from '@/lib/AuthContext';
import KanbanBoard from '@/components/orders/KanbanBoard';
import EmployeePortal from '@/components/orders/EmployeePortal';

export default function OrdersPage() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (profile?.role === 'employee') {
    return <EmployeePortal />;
  }

  return <KanbanBoard />;
}
