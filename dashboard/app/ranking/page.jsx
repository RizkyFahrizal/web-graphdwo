"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  Trophy, 
  ShoppingBag, 
  Map, 
  Tag, 
  Truck, 
  Package, 
  TrendingUp, 
  ArrowUpRight,
  RefreshCw // Icon refresh
} from "lucide-react";

// --- KONFIGURASI CACHE ---
const CACHE_KEY = "RANKING_DASHBOARD_DATA";
const CACHE_DURATION = 15 * 60 * 1000; // 15 Menit

// --- 1. REUSABLE COMPONENT: KARTU TABEL RANKING ---
const RankingCard = ({ title, data, icon: Icon, color, type = "number" }) => {
  const formatValue = (val) => {
    if (type === "currency") {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(val);
    }
    return new Intl.NumberFormat("id-ID").format(val);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
      {/* Header Kartu */}
      <div className={`p-4 ${color} bg-opacity-10 border-b border-gray-100 flex items-center gap-3`}>
        <div className={`p-2 rounded-lg ${color} text-white shadow-sm`}>
          <Icon size={20} />
        </div>
        <h3 className="font-bold text-gray-700">{title}</h3>
      </div>

      {/* Tabel */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-12 text-center">#</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3 text-right">
                {type === "currency" ? "Nilai (Rp)" : "Total (Qty)"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data && data.length > 0 ? (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center font-medium text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[150px]" title={item.name}>
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-700">
                    {formatValue(item.value)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-4 py-8 text-center text-gray-400">
                  Belum ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 2. MAIN PAGE COMPONENT ---
export default function RankingDashboard() {
  const [loading, setLoading] = useState(true);
  
  // Menyatukan state agar mudah di-cache
  const [rankingData, setRankingData] = useState({
    salesCustomers: [],
    salesProducts: [],
    salesTerritories: [],
    purchExpensive: [],
    purchVendors: [],
    purchProducts: []
  });

  // === FUNGSI FETCH DENGAN CACHE ===
  const fetchAllRankings = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      // 1. CEK CACHE (Jika tidak dipaksa refresh)
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          const now = Date.now();

          // Jika data masih valid (< 15 menit)
          if (now - timestamp < CACHE_DURATION) {
            console.log("⚡ Mengambil data Ranking dari Cache");
            setRankingData(data);
            setLoading(false);
            return;
          }
        }
      }

      console.log("🔄 Mengambil data Ranking baru dari API...");

      // 2. PANGGIL API
      const [
        resSalesCust,
        resSalesProd,
        resSalesTerr,
        resPurchExp,
        resPurchVend,
        resPurchProd
      ] = await Promise.all([
        axios.get("http://localhost:3001/api/ranking/sales/top-customers"),
        axios.get("http://localhost:3001/api/ranking/sales/top-products-quantity"),
        axios.get("http://localhost:3001/api/ranking/sales/top-territories"),
        axios.get("http://localhost:3001/api/ranking/purchasing/most-expensive-products"),
        axios.get("http://localhost:3001/api/ranking/purchasing/top-vendors-quantity"),
        axios.get("http://localhost:3001/api/ranking/purchasing/top-products-quantity"),
      ]);

      const newData = {
        salesCustomers: resSalesCust.data,
        salesProducts: resSalesProd.data,
        salesTerritories: resSalesTerr.data,
        purchExpensive: resPurchExp.data,
        purchVendors: resPurchVend.data,
        purchProducts: resPurchProd.data
      };

      setRankingData(newData);

      // 3. SIMPAN KE CACHE
      const cachePayload = {
        timestamp: Date.now(),
        data: newData
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));

    } catch (error) {
      console.error("Gagal mengambil data ranking:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRankings();
  }, [fetchAllRankings]);

  // Handle Refresh Manual
  const handleRefresh = () => {
    sessionStorage.removeItem(CACHE_KEY);
    fetchAllRankings(true);
  };

  if (loading && !rankingData.salesCustomers.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Memuat Data Ranking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Detail & Ranking Laporan</h1>
          <p className="text-gray-500 text-sm mt-1">
            Analisis mendalam performa Sales dan Purchasing (Top 10)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            {/* TOMBOL REFRESH */}
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium shadow-sm transition"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh Data
            </button>
            
            <div className="hidden md:block px-4 py-2 bg-white rounded-lg border text-sm shadow-sm text-slate-600">
                Update: {new Date().toLocaleDateString()}
            </div>
        </div>
      </div>

      {/* ================= SECTION 1: SALES RANKING ================= */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-blue-100 rounded text-blue-600">
            <TrendingUp size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Ranking Sales (Penjualan)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Top Customers */}
          <RankingCard 
            title="10 Pelanggan Teratas" 
            data={rankingData.salesCustomers} 
            icon={Trophy} 
            color="bg-blue-500"
            type="currency" 
          />

          {/* 2. Top Products (Laris) */}
          <RankingCard 
            title="10 Produk Terlaris (Qty)" 
            data={rankingData.salesProducts} 
            icon={ShoppingBag} 
            color="bg-indigo-500"
            type="number"
          />

          {/* 3. Top Territories */}
          <RankingCard 
            title="Top Wilayah (Revenue)" 
            data={rankingData.salesTerritories} 
            icon={Map} 
            color="bg-cyan-500"
            type="currency"
          />
        </div>
      </section>

      {/* Separator */}
      <hr className="border-gray-200" />

      {/* ================= SECTION 2: PURCHASING RANKING ================= */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-orange-100 rounded text-orange-600">
            <ArrowUpRight size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Ranking Purchasing (Pembelian)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Most Expensive Products */}
          <RankingCard 
            title="10 Produk Termahal (Avg)" 
            data={rankingData.purchExpensive} 
            icon={Tag} 
            color="bg-orange-500"
            type="currency"
          />

          {/* 2. Top Vendors */}
          <RankingCard 
            title="10 Vendor Teraktif" 
            data={rankingData.purchVendors} 
            icon={Truck} 
            color="bg-amber-500"
            type="number"
          />

          {/* 3. Most Purchased Products */}
          <RankingCard 
            title="10 Produk Paling Banyak Dibeli" 
            data={rankingData.purchProducts} 
            icon={Package} 
            color="bg-red-500"
            type="number"
          />
        </div>
      </section>

    </div>
  );
}