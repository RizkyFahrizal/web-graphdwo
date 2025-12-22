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
import { ShoppingCart, Map, TrendingUp, AlertTriangle, Layers, Tag, Globe, Filter, X, RefreshCw } from "lucide-react"; // Tambah RefreshCw
import { motion, AnimatePresence } from "framer-motion";

// --- KONFIGURASI CACHE ---
const CACHE_KEY = "DASHBOARD_SALES_DATA"; // Key khusus untuk dashboard ini
const CACHE_DURATION = 15 * 60 * 1000;    // 15 Menit

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val || 0);

// --- COMPONENT STAT CARD ---
const StatCard = ({ title, value, icon: Icon, gradient, delay }) => (
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

// --- MAIN PAGE ---
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [data, setData] = useState({ 
    category: [], products: [], trend: [], territory: [], subcategory: [] 
  });
  
  const [summary, setSummary] = useState({ revenue: 0, orders: 0, topRegion: "-" });

  // === FETCH DATA DENGAN CACHE ===
  const fetchData = useCallback(async (filterCategory = null, forceRefresh = false) => {
    setLoading(true);
    setErrorMsg("");
    
    try {
      // 1. CEK CACHE (Jika tidak sedang filter & tidak dipaksa refresh)
      if (!filterCategory && !forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, data: savedData, summary: savedSummary } = JSON.parse(cached);
          const now = Date.now();

          // Jika data masih segar (kurang dari 15 menit)
          if (now - timestamp < CACHE_DURATION) {
            console.log("⚡ Mengambil data Dashboard dari Cache");
            setData(savedData);
            setSummary(savedSummary);
            setLoading(false);
            return; // STOP, jangan panggil API
          }
        }
      }

      console.log("🔄 Mengambil data Dashboard baru dari API...");

      // 2. PANGGIL API (Jika cache miss atau filter aktif)
      const queryParam = filterCategory ? `?category=${encodeURIComponent(filterCategory)}` : "";
      const requests = [
        axios.get("http://localhost:3001/api/category-sales"),
        axios.get(`http://localhost:3001/api/top-products${queryParam}`),
        axios.get("http://localhost:3001/api/orders-trend"),
        axios.get("http://localhost:3001/api/territory-sales"),
        axios.get(`http://localhost:3001/api/subcategory-sales${queryParam}`),
      ];

      const results = await Promise.allSettled(requests);
      if (results.every((r) => r.status === "rejected")) throw new Error("Gagal terhubung ke Server Backend.");

      const getData = (i) => (results[i].status === "fulfilled" ? results[i].value.data : []);
      
      const newData = { 
        category: getData(0),
        products: getData(1),
        trend: getData(2), 
        territory: getData(3), 
        subcategory: getData(4)
      };

      // Hitung Summary
      const territoryData = newData.territory;
      const trendData = newData.trend;
      
      const rev = territoryData.reduce((a, c) => a + Number(c.value || 0), 0);
      const ord = trendData.reduce((a, c) => a + Number(c.total_orders || 0), 0);
      const sortedTerritory = [...territoryData].sort((a,b) => b.value - a.value);
      const topReg = sortedTerritory.length > 0 ? sortedTerritory[0].name : "-";

      const newSummary = { revenue: rev, orders: ord, topRegion: topReg };

      // Update State
      setData(newData);
      setSummary(newSummary);

      // 3. SIMPAN KE CACHE (Hanya jika bukan mode filter)
      if (!filterCategory) {
        const cachePayload = {
          timestamp: Date.now(),
          data: newData,
          summary: newSummary
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
      }

    } catch (err) { 
      setErrorMsg(err.message); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fungsi Refresh Manual
  const handleRefresh = () => {
    sessionStorage.removeItem(CACHE_KEY); // Hapus cache lama
    fetchData(null, true); // Paksa ambil baru
  };

  const handleCategoryClick = (data) => {
    if (data && data.name) {
      if (selectedCategory === data.name) {
        setSelectedCategory(null);
        fetchData(null);
      } else {
        setSelectedCategory(data.name);
        fetchData(data.name);
      }
    }
  };

  const handleResetFilter = () => {
    setSelectedCategory(null);
    fetchData(null);
  };

  // --- HITUNG TINGGI GRAFIK OTOMATIS ---
  const categoryChartHeight = Math.max(400, data.category.length * 60);

  if (loading && !data.category.length) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-600"></div></div>;
  if (errorMsg) return <div className="min-h-screen bg-slate-100 p-8 flex justify-center"><div className="bg-white p-6 rounded-xl shadow text-red-600 border border-red-200"><AlertTriangle className="inline mr-2"/>{errorMsg}</div></div>;

  return (
    <div className="space-y-8 min-h-screen bg-slate-100 p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Executive Dashboard</h1>
          <p className="text-slate-500">
            {selectedCategory ? `Showing details for: ${selectedCategory}` : "Real-time Sales Performance Overview"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {selectedCategory && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleResetFilter}
                className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-200 transition"
              >
                <Filter size={16} /> Filtered: {selectedCategory} <X size={16} className="ml-1" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* TOMBOL REFRESH MANUAL */}
          <button 
             onClick={handleRefresh}
             className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg border shadow-sm hover:bg-slate-50 transition text-sm font-medium"
           >
             <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
             Refresh
           </button>

          <div className="hidden md:block px-4 py-2 bg-white rounded-lg border text-sm shadow-sm text-slate-600">
            Update: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* 1. Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={formatCurrency(summary.revenue)} icon={null} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" delay={0} />
        <StatCard title="Total Orders" value={summary.orders} icon={ShoppingCart} gradient="bg-gradient-to-br from-blue-400 to-blue-600" delay={0.1} />
        <StatCard title="Top Region" value={summary.topRegion} icon={Map} gradient="bg-gradient-to-br from-violet-400 to-violet-600" delay={0.2} />
        <StatCard title="Avg Order Value" value={formatCurrency(summary.orders ? summary.revenue / summary.orders : 0)} icon={TrendingUp} gradient="bg-gradient-to-br from-orange-400 to-orange-600" delay={0.3} />
      </div>

      {/* 2. BIG CHARTS SECTION (Full Width) */}
      <div className="flex flex-col gap-8">
        
        {/* Trend Chart */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.4}} className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 text-lg mb-6">Revenue Growth (Last 12 Months)</h3>
          <div className="h-[350px]">
            <ResponsiveContainer>
              <AreaChart data={data.trend}>
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize:12, fill:'#64748b'}} axisLine={false} tickLine={false} dy={10} />
                <YAxis tickFormatter={(val)=>`$${val/1000}k`} tick={{fontSize:12, fill:'#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor:'#1e293b', border:'none', borderRadius:'8px', color:'#fff'}} formatter={(val)=>formatCurrency(val)} />
                <Area type="monotone" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={3} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Sales by Category */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.5}} className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800 text-lg">Sales by Category</h3>
            </div>
            <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">
              Click Bar to Filter
            </span>
          </div>
          
          <div style={{ height: `${categoryChartHeight}px`, minHeight: '400px' }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data.category} 
                layout="vertical" 
                margin={{left: 0, right: 30, top: 0, bottom: 0}}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={150} tick={{fontSize:12, fill:'#475569'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{backgroundColor:'#1e293b', border:'none', borderRadius:'8px', color:'#fff'}} formatter={(val)=>formatCurrency(val)} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 4, 4, 0]} 
                  barSize={30} 
                  onClick={handleCategoryClick} 
                  cursor="pointer"
                >
                  {data.category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedCategory === entry.name ? "#f59e0b" : "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* 3. Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Territory Leaders */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-800">Territory Leaders</h3>
          </div>
          <div className="flex flex-col gap-5 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {data.territory.map((item, idx) => {
              const maxVal = data.territory[0]?.value || 1;
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
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-2">
          <div className="flex items-center justify-between mb-6">
             <h3 className="font-bold text-slate-800">
               {selectedCategory ? `Top Products in ${selectedCategory}` : "Top Performing Products"}
             </h3>
             {selectedCategory && <span className="text-xs text-orange-500 font-bold px-2 py-1 bg-orange-50 rounded">FILTER ACTIVE</span>}
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={data.products} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={140} tick={{fontSize: 12, fill: '#475569'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{backgroundColor: '#1e293b', border:'none', borderRadius: '8px', color: '#fff'}} formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="value" fill={selectedCategory ? "#f59e0b" : "#10b981"} barSize={16} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Subcategory */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-slate-500"/>
            <h3 className="font-bold text-slate-800">
              {selectedCategory ? `Subcategories in ${selectedCategory}` : "Subcategory Performance"}
            </h3>
        </div>
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.subcategory} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }} formatter={(val) => formatCurrency(val)} />
                    <Bar dataKey="value" fill={selectedCategory ? "#8b5cf6" : "#6366f1"} barSize={30} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} dot={{r: 4, fill: '#fbbf24'}} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}