// components/StatCard.jsx
"use client";

import { motion } from "framer-motion";

export default function StatCard({ title, value, icon: Icon, color = "bg-green-500 text-green-600", delay = 0 }) {
  // parse color: expecting "bg-... text-..."
  const textColor = color.split(" ").find(c => c.startsWith("text-")) || "text-green-600";
  const bgColor = color.split(" ").find(c => c.startsWith("bg-")) || "bg-green-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
    >
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <h3 className="text-lg font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20`}>
        {Icon && <Icon className={`w-6 h-6 ${textColor}`} />}
      </div>
    </motion.div>
  );
}
