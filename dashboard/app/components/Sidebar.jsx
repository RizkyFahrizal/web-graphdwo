"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  LogOut,
  Server,
  ChevronRight,
  ShoppingCart,
  PackageSearch,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Sidebar() {
  const path = usePathname();

  // -----------------------------
  // MENU UNTUK SALES & PURCHASING
  // -----------------------------
  const salesMenu = [
    { href: "/dashboard", label: "Dashboard Sales", icon: LayoutDashboard },
    { href: "/dashboard/olap", label: "OLAP Sales Viewer", icon: Database },
  ];

  const purchasingMenu = [
    { href: "/purchasing", label: "Dashboard Purchasing", icon: ShoppingCart },
    { href: "/purchasing/olap", label: "OLAP Purchasing Viewer", icon: PackageSearch },
  ];

  const rankingMenu = [{ href: "/ranking", label: "Ranking Table", icon: ShoppingCart }  ];

  const renderMenu = (menu) =>
    menu.map((item) => {
      const isActive = path === item.href;
      const Icon = item.icon;

      return (
        <Link key={item.href} href={item.href} className="block relative group">
          {isActive && (
            <motion.div
              layoutId="active-sidebar"
              className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/50"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}

          <div
            className={`relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
              isActive
                ? "text-white font-medium"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                size={20}
                className={
                  isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                }
              />
              <span className="text-sm">{item.label}</span>
            </div>

            {isActive && <ChevronRight size={16} className="text-blue-300" />}
          </div>
        </Link>
      );
    });

  return (
    <aside className="w-72 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl relative z-20">
      
      {/* HEADER */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <span className="font-bold text-xl">G</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100">
            WHADV Admin
          </h1>
          <p className="text-xs text-slate-400 font-medium">Analytics Portal</p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 py-6 space-y-6">
        
        {/* SALES */}
        <div>
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Sales Module
          </p>
          {renderMenu(salesMenu)}
        </div>

        {/* PURCHASING */}
        <div>
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6">
            Purchasing Module
          </p>
          {renderMenu(purchasingMenu)}
        </div>

        {/* Ranking Table */}
        <div>
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6">
          Ranking Table
          </p>
          {renderMenu(rankingMenu)}
        </div>

      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        
        {/* LOGOUT */}
        <Link
          href="/logout"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Logout</span>
        </Link>

        {/* STATUS PANEL */}
        {/* <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-500 border border-slate-800">
          <div className="flex items-center gap-2 mb-2 font-semibold text-slate-400">
            <Server size={12} />
            <span>System Status</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Node API</span>
              <span className="text-emerald-400">● Live</span>
            </div>

            <div className="flex justify-between">
              <span>Database</span>
              <span className="text-blue-400">● Connected</span>
            </div>
          </div>
        </div> */}

      </div>
    </aside>
  );
}
