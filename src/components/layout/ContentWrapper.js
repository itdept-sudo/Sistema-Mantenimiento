'use client';

import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";

export default function ContentWrapper({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        {children}
      </main>
    </div>
  );
}
