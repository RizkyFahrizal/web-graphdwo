// server.js ======================================================
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// ===============================================================
//  DATABASE CONNECTION POOL (SUPER FAST & EFFICIENT)
// ===============================================================
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "whadv",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper: fungsi query universal (lebih cepat & lebih pendek)
async function query(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
}

// ===============================================================
//  API ENDPOINTS — EFISIEN & BERSIH
// ===============================================================

// 1. SALES BY CATEGORY
app.get("/api/category-sales", async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.Category AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimproduct p ON f.ProductKey = p.ProductKey
      WHERE p.Category IS NOT NULL
      GROUP BY p.Category
      ORDER BY value DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TOP 10 PRODUCTS
app.get("/api/top-products", async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.ProductName AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimproduct p ON f.ProductKey = p.ProductKey
      GROUP BY p.ProductName
      ORDER BY value DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. ORDERS TREND (12 Bulan Terakhir)
app.get("/api/orders-trend", async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        CONCAT(d.MonthName, ' ', d.Year) AS date,
        COUNT(f.SalesOrderID) AS total_orders,
        SUM(f.LineTotal) AS total_revenue
      FROM factsales f
      JOIN dimdate d ON f.DateKey = d.DateKey
      GROUP BY d.Year, d.Month, d.MonthName
      ORDER BY d.Year DESC, d.Month DESC
      LIMIT 12
    `);
    res.json(rows.reverse()); // Urut dari lama ke baru
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. SALES BY TERRITORY
app.get("/api/territory-sales", async (req, res) => {
  try {
    const rows = await query(`
      SELECT t.Name AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimsalesterritory t ON f.TerritoryKey = t.TerritoryKey
      GROUP BY t.Name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. SALES BY SUBCATEGORY
app.get("/api/subcategory-sales", async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.Subcategory AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimproduct p ON f.ProductKey = p.ProductKey
      WHERE p.Subcategory IS NOT NULL
      GROUP BY p.Subcategory
      ORDER BY value DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. LOGIN (Mock)
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    return res.json({ success: true, token: "whadv-token-123" });
  }

  return res.json({ success: false, message: "Username/Password salah!" });
});

// ===============================================================
app.listen(3001, () => console.log("✅ Backend berjalan di http://localhost:3001"));
