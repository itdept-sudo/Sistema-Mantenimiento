'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { 
  LayoutDashboard, 
  Map, 
  ClipboardList, 
  Package, 
  Calendar, 
  Settings,
  LogOut,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'inventory', 'technician'] },
  { name: 'Plano Planta', href: '/floor-plan', icon: Map, roles: ['admin', 'supervisor', 'inventory', 'technician'] },
  { name: 'Órdenes', href: '/orders', icon: ClipboardList, roles: ['admin', 'supervisor', 'inventory', 'technician'] },
  { name: 'Inventario', href: '/inventory', icon: Package, roles: ['admin', 'supervisor', 'inventory'] },
  { name: 'Calendario', href: '/calendar', icon: Calendar, roles: ['admin', 'supervisor', 'inventory', 'technician'] },
  { name: 'Usuarios', href: '/users', icon: Users, roles: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, logout, loading } = useAuth();
  
  // Debug para ver qué está pasando (puedes verlo en F12)
  console.log("Sidebar Debug - Role:", profile?.role, "Loading:", loading);

  const userRole = profile?.role || 'technician';

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <div className="flex flex-col h-screen w-64 bg-slate-900 text-white border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          MaintOps Pro
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          {profile?.role ? profile.role.toUpperCase() : 'SISTEMA DE GESTIÓN'}
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {filteredItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
              pathname === item.href 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              pathname === item.href ? "text-white" : "text-slate-500 group-hover:text-blue-400"
            )} />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition-colors group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
