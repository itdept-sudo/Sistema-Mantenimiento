'use client';

import { useState } from "react";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

export default function ContentWrapper({ children }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isLoginPage = pathname === '/login';

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-slate-950 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              MaintOps
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          {children}
        </main>
      </div>
    </div>
  );
}
