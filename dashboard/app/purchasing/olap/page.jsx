// app/dashboard/olap/page.jsx
"use client";

import { useState, useRef } from "react";
import { 
  RefreshCw, 
  ExternalLink, 
  Maximize2, 
  Database, 
  Filter, 
  AlertTriangle 
} from "lucide-react";
import { motion } from "framer-motion";

export default function OlapPage() {
  // Ganti URL ini sesuai endpoint Mondrian/Saiku/JPivot kamu
  // Contoh: "http://localhost:8080/mondrian/testpage.jsp?query=myquery"
  // Atau jika kamu punya UI OLAP sendiri di route lain.
  const OLAP_SERVER_URL = "http://localhost:8080/mondrian/testpage.jsp?query=advpurchase"; 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef(null);

  const handleRefresh = () => {
    setLoading(true);
    setError(false);
    if (iframeRef.current) {
      // Reload iframe
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      
      {/* 1. Header & Toolbar Control */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Database size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">OLAP Cube Viewer</h2>
            <p className="text-xs text-gray-500">Multidimensional Analysis & Reporting</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            title="Refresh Data"
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <a 
            href={OLAP_SERVER_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            title="Open in New Tab"
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </motion.div>

      {/* 2. Main Viewer Area */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden"
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium animate-pulse">Menghubungkan ke OLAP Server...</p>
            <p className="text-xs text-gray-400 mt-2">Connecting to {OLAP_SERVER_URL}</p>
          </div>
        )}

        {/* Error Overlay (Jika Iframe gagal load - simulasi) */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
            <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Koneksi Gagal</h3>
            <p className="text-gray-500 text-center max-w-md mt-2">
              Tidak dapat memuat OLAP Viewer. Pastikan server Tomcat/Mondrian berjalan di port 8080.
            </p>
            <button 
              onClick={handleRefresh}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Iframe Container */}
        <iframe
          ref={iframeRef}
          src={OLAP_SERVER_URL}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="OLAP Viewer"
          // Sandbox permissions (optional, sesuaikan kebutuhan)
          // sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
        
        {/* Watermark (Opsional, agar terlihat pro) */}
        <div className="absolute bottom-4 right-4 text-[10px] text-gray-300 pointer-events-none select-none font-mono">
          POWERED BY MONDRIAN
        </div>
      </motion.div>

    </div>
  );
}