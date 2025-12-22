"use client";

import Sidebar from "../components/Sidebar";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // === PROTEKSI LOGIN + AMBIL USER ===
  useEffect(() => {
    const cookies = Object.fromEntries(
      document.cookie.split("; ").map((c) => c.split("="))
    );

    if (!cookies.gg_token) {
      router.push("/login");
      return;
    }

    // Ambil user dari cookie
    setUserName(cookies.gg_name || "User");
    setUserEmail(cookies.gg_email || "user@example.com");
  }, [router]);

  // Judul halaman
  const getPageTitle = () => {
    if (pathname === "/dashboard/olap") return "OLAP Data Explorer";
    if (pathname === "/dashboard/settings") return "Pengaturan Akun";
    return "Dashboard Purchasing Overview";
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* TOP NAV */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
          
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              {getPageTitle()}
            </h2>
            <p className="text-xs text-gray-400 hidden sm:block">
              Welcome back, {userName}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">

              {/* Avatar (inisial user) */}
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                {userName ? userName[0].toUpperCase() : "U"}
              </div>

              {/* User info */}
              <div className="hidden md:block text-sm text-right leading-tight">
                <div className="font-semibold text-gray-700">{userName}</div>
                <div className="text-[10px] text-gray-400">{userEmail}</div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6 md:p-8 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
