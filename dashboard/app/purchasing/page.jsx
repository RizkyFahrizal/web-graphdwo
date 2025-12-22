// app/purchasing/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  Cell
} from "recharts";
import { ShoppingCart, Map, TrendingUp, AlertTriangle, Layers, Tag, Globe, Filter, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// KONFIGURASI CACHE
const CACHE_KEY = "PURCHASING_DASHBOARD_DATA";
const CACHE_DURATION = 15 * 60 * 1000; // 15 Menit (dalam milid
// Format currency (IDR) — sesuaikan locale/cur jika perlu
const formatCurrency = (val) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

// ----------------- StatCard (sama seperti dashboard style) -----------------
const StatCard = ({ title, value, icon: Icon, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`p-6 rounded-2xl shadow-lg text-white ${gradient} relative overflow-hidden group`}
  >
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full group-hover:scale-110 transition-transform"></div>
    <div className="flex justify-between items-start relative z-10">
      <div className="flex-1">
        <p className="text-sm font-medium text-white/90 mb-1">{title}</p>
        <h3 className="text-3xl font-bold">{value}</h3>
      </div>
      {Icon && (
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Icon className="w-6 h-6 text-white" />
        </div>
      )}
    </div>
  </motion.div>
);

// ----------------- Main Purchasing Dashboard (dashboard style) -----------------
export default function PurchasingDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);

  // data object similar to dashboard
  const [data, setData] = useState({
    vendors: [],        // category equivalent (top vendors)
    products: [],       // top products
    trend: [],          // monthly trend
    region: [],         // by region
    subcategory: [],    // subcategory performance
  });

  const [summary, setSummary] = useState({
    total_purchase: 0,
    total_orders: 0,
    total_received: 0,
    total_rejected: 0,
    topRegion: "-"
  });

  // compute dynamic height for vendor chart (vertical)
  const vendorChartHeight = Math.max(400, data.vendors.length * 60);

  const fetchData = useCallback(async (filterVendor = null, forceRefresh = false) => {
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. CEK CACHE DULU (Hanya jika tidak sedang filter vendor & tidak dipaksa refresh)
      if (!filterVendor && !forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, data: savedData, summary: savedSummary } = JSON.parse(cached);
          const now = Date.now();

          // Jika data masih baru (kurang dari 15 menit)
          if (now - timestamp < CACHE_DURATION) {
            console.log("⚡ Mengambil data dari Session Cache (Tanpa API Call)");
            setData(savedData);
            setSummary(savedSummary);
            setLoading(false);
            return; // STOP DISINI, JANGAN LANJUT KE AXIOS
          }
        }
      }

      console.log("🔄 Mengambil data baru dari API...");

      // 2. JIKA CACHE KOSONG/EXPIRED/FILTER AKTIF -> PANGGIL API
      // (Request API sama seperti sebelumnya, limit 5 untuk top vendors)
      const requests = [
        axios.get("http://localhost:3001/api/purchasing/summary"),
        axios.get("http://localhost:3001/api/purchasing/top-vendors?limit=5"), // Limit 5 sesuai request sebelumnya
        axios.get("http://localhost:3001/api/purchasing/top-products?limit=10"),
        axios.get("http://localhost:3001/api/purchasing/trend"),
        axios.get("http://localhost:3001/api/purchasing/by-region"),
        axios.get("http://localhost:3001/api/purchasing/subcategory")
      ];

      const results = await Promise.allSettled(requests);
      const get = (i) => (results[i] && results[i].status === "fulfilled" ? results[i].value.data : []);

      // Susun data baru
      const newData = {
        vendors: get(1) || [],
        products: get(2) || [],
        trend: get(3) || [],
        region: get(4) || [],
        subcategory: Array.isArray(get(5)) ? get(5) : []
      };

      // Susun summary baru
      const sumRes = get(0);
      let newSummary = {};
      
      if (sumRes && typeof sumRes === "object") {
         newSummary = {
          total_purchase: sumRes.total_purchasing || 0,
          total_orders: sumRes.total_orders || 0,
          total_received: sumRes.total_received || 0,
          total_rejected: sumRes.total_rejected || 0,
          topRegion: "-" // nanti diupdate dibawah
        };
      } else {
         // Fallback logic
         const rev = (newData.region || []).reduce((a, c) => a + Number(c.value || 0), 0);
         const ord = (newData.trend || []).reduce((a, c) => a + Number(c.orders_count || 0), 0);
         newSummary = { total_purchase: rev, total_orders: ord, total_received: 0, total_rejected: 0, topRegion: "-" };
      }
      
      // Hitung Top Region untuk summary
      const sortedRegion = [...(newData.region || [])].sort((a,b) => b.value - a.value);
      newSummary.topRegion = sortedRegion[0] ? sortedRegion[0].name : "-";

      // Update State
      setData(newData);
      setSummary(newSummary);

      // 3. SIMPAN KE CACHE (Hanya jika bukan mode filter)
      if (!filterVendor) {
        const cachePayload = {
          timestamp: Date.now(),
          data: newData,
          summary: newSummary
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
      }

    } catch (err) {
      console.error("Fetch error", err);
      setErrorMsg("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect load awal
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fungsi Refresh Manual (Tombol)
  const handleRefresh = () => {
    sessionStorage.removeItem(CACHE_KEY); // Hapus cache lama
    fetchData(null, true); // Paksa ambil baru
  };
  // click vendor to filter products (mimic dashboard behavior)
  const handleVendorClick = (d) => {
    if (!d || !d.name) return;
    if (selectedVendor === d.name) {
      setSelectedVendor(null);
      fetchData(null);
    } else {
      setSelectedVendor(d.name);
      // Optional: if backend supports ?vendor=... on top-products endpoint, implement filtering
      fetchData(d.name);
    }
  };

  // Loading / Error guard
  if (loading && !data.vendors.length) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-600"></div>
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-100 p-8 flex justify-center">
        <div className="bg-white p-6 rounded-xl shadow text-red-600 border border-red-200">
          <AlertTriangle className="inline mr-2"/> {errorMsg}
        </div>
      </div>
    );
  }

  // ----------------- Render -----------------
  return (
    <div className="space-y-8 min-h-screen bg-slate-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Purchasing Dashboard</h1>
           <p className="text-slate-500">
             {selectedVendor ? `Filtered: ${selectedVendor}` : "Overview Purchasing"}
           </p>
        </div>

        <div className="flex items-center gap-3">
           {/* Tombol Filter Reset (jika ada filter) */}
           {/* ... kode filter button ... */}

           {/* TOMBOL REFRESH MANUAL BARU */}
           <button 
             onClick={handleRefresh}
             className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg border shadow-sm hover:bg-slate-50 transition text-sm font-medium"
           >
             <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
             Refresh Data
           </button>

           <div className="hidden md:block px-4 py-2 bg-white rounded-lg border text-sm shadow-sm text-slate-600">
             Date: {new Date().toLocaleDateString()}
           </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Purchases" value={formatCurrency(summary.total_purchase)} icon={null} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" delay={0} />
        <StatCard title="Total Orders" value={summary.total_orders} icon={ShoppingCart} gradient="bg-gradient-to-br from-blue-400 to-blue-600" delay={0.1} />
        <StatCard title="Top Region" value={summary.topRegion} icon={Map} gradient="bg-gradient-to-br from-violet-400 to-violet-600" delay={0.2} />
        <StatCard title="Avg Order Value" value={summary.total_orders ? formatCurrency(summary.total_purchase / summary.total_orders) : formatCurrency(0)} icon={TrendingUp} gradient="bg-gradient-to-br from-orange-400 to-orange-600" delay={0.3} />
      </div>

      {/* Big Charts */}
      <div className="flex flex-col gap-8">
        {/* Trend (AreaChart) */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}} className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 text-lg mb-6">Purchasing Trend (Last 12 Months)</h3>
          <div className="h-[350px]">
            {data.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fontSize:12, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val)=>`${(val/1000).toLocaleString()}k`} tick={{fontSize:12, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{backgroundColor:'#1e293b', border:'none', borderRadius:'8px', color:'#fff'}} formatter={(val)=>formatCurrency(val)} />
                  <Area type="monotone" dataKey="total_spend" stroke="#3b82f6" strokeWidth={3} fill="url(#colorSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400">No trend data</div>
            )}
          </div>
        </motion.div>

        {/* Vendors (vertical bar) & Top Products */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.45}} className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vendors (left) */}
            <div className="col-span-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Top Vendors (by Spend)</h3>
                </div>
                <span className="text-xs text-slate-500">Click bar to filter</span>
              </div>

              <div style={{ height: `${vendorChartHeight}px`, minHeight: 300 }}>
                {data.vendors.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.vendors} layout="vertical" margin={{ left: 0, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={160} tick={{fontSize:12, fill:'#475569'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{backgroundColor:'#1e293b', border:'none', borderRadius:'8px', color:'#fff'}} formatter={(val)=>formatCurrency(val)} />
                      <Bar dataKey="value" radius={[0,4,4,0]} barSize={18} onClick={handleVendorClick} cursor="pointer">
                        {data.vendors.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={selectedVendor === entry.name ? "#f59e0b" : "#6366f1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-400 mt-12">No vendor data</div>
                )}
              </div>
            </div>

            {/* Center: Top Products (bigger) */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">{selectedVendor ? `Top Products - ${selectedVendor}` : "Top Purchased Products"}</h3>
                {selectedVendor && <span className="text-xs text-orange-500 font-bold px-2 py-1 bg-orange-50 rounded">FILTER ACTIVE</span>}
              </div>

              <div className="h-[300px]">
                {data.products.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.products} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={180} tick={{fontSize:12, fill:'#475569'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill:'#f1f5f9'}} contentStyle={{backgroundColor:'#1e293b', border:'none', borderRadius:'8px', color:'#fff'}} formatter={(val)=>formatCurrency(val)} />
                      <Bar dataKey="value" fill={selectedVendor ? "#f59e0b" : "#10b981"} barSize={18} radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-400 mt-12">No product data</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Secondary metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Territory Leaders */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-800">Region Leaders</h3>
          </div>
          <div className="flex flex-col gap-5 h-[300px] overflow-y-auto pr-2">
            {data.region.length > 0 ? data.region.map((item, idx) => {
              const maxVal = data.region[0]?.value || 1;
              const percent = Math.round((item.value / maxVal) * 100);
              return (
                <div key={idx} className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            }) : <div className="text-slate-400">No region data</div>}
          </div>
        </div>

        {/* Top Products (duplicate small) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Top Products Snapshot</h3>
            <span className="text-xs text-slate-500">Top 10</span>
          </div>

          <div className="h-[300px]">
            {data.products.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.products} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize:12, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${(val/1000).toLocaleString()}k`} tick={{fontSize:12, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }} formatter={(val) => formatCurrency(val)} />
                  <Bar dataKey="value" fill="#6366f1" barSize={30} radius={[4,4,0,0]} />
                  <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} dot={{r:4, fill:'#fbbf24'}} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 mt-12">No product data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
