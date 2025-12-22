// server.js ======================================================
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());


const JWT_SECRET = "whadv-secret-key-123";

// DATABASE CONNECTION
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "whadv",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper Query
async function query(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
}

// ===============================================================
//  API ENDPOINTS (Updated for Drill Down)
// ===============================================================

// 1. SALES BY CATEGORY (Global - Tidak berubah)
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

// 2. TOP PRODUCTS (BISA FILTER CATEGORY)
app.get("/api/top-products", async (req, res) => {
  try {
    const { category } = req.query; // Ambil parameter ?category=...
    
    // Base Query
    let sql = `
      SELECT p.ProductName AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimproduct p ON f.ProductKey = p.ProductKey
    `;
    
    const params = [];

    // Jika ada filter category, tambahkan WHERE
    if (category) {
      sql += ` WHERE p.Category = ? `;
      params.push(category);
    }

    // Lanjutkan Grouping dan Ordering
    sql += ` GROUP BY p.ProductName ORDER BY value DESC LIMIT 10`;

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. ORDERS TREND (Global - Tidak berubah)
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
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. SALES BY TERRITORY (Global - Tidak berubah)
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

// 5. SALES BY SUBCATEGORY (BISA FILTER CATEGORY)
app.get("/api/subcategory-sales", async (req, res) => {
  try {
    const { category } = req.query;

    let sql = `
      SELECT p.Subcategory AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimproduct p ON f.ProductKey = p.ProductKey
      WHERE p.Subcategory IS NOT NULL
    `;

    const params = [];

    // Tambahkan kondisi AND jika category ada
    if (category) {
      sql += ` AND p.Category = ? `;
      params.push(category);
    }

    sql += ` GROUP BY p.Subcategory ORDER BY value DESC LIMIT 10`;

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. LOGIN (Mock)
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Cari user berdasarkan email
    const users = await query(`SELECT * FROM dimuser WHERE Email = ?`, [email]);

    if (users.length === 0) {
      return res.json({ success: false, message: "Email tidak ditemukan!" });
    }

    const user = users[0];

    // Cek password
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.json({ success: false, message: "Password salah!" });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user.UserID, name: user.Name, email: user.Email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.UserID,
        name: user.Name,
        email: user.Email
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------ NEW PURCHASING ENDPOINTS ------------------

// 1) SUMMARY KPIs for purchasing (totals, orders count, avg lead time if exist)
app.get("/api/purchasing/summary", async (req, res) => {
  try {
    // Adjust field names if your fact table uses different column names
    const rows = await query(`
      SELECT
        COALESCE(SUM(p.SubTotal),0) AS total_purchasing,
        COUNT(DISTINCT p.purchaseOrderID) AS total_orders,
        COALESCE(SUM(p.ReceivedQty),0) AS total_received,
        COALESCE(SUM(p.RejectedQty),0) AS total_rejected
      FROM factpurchasing p
    `);
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) Top vendors by purchasing amount (limit optional)
app.get("/api/purchasing/top-vendors", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "10", 10);
    const rows = await query(`
      SELECT v.VendorName AS name, SUM(p.SubTotal) AS value
      FROM factpurchasing p
      JOIN dimvendor v ON p.VendorKey = v.VendorKey
      GROUP BY v.VendorName
      ORDER BY value DESC
      LIMIT ?
    `, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) Top purchasingd products by spend (limit optional)
app.get("/api/purchasing/top-products", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "10", 10);
    const rows = await query(`
      SELECT pr.ProductName AS name, SUM(p.SubTotal) AS value
      FROM factpurchasing p
      JOIN dimproduct pr ON p.ProductKey = pr.ProductKey
      GROUP BY pr.ProductName
      ORDER BY value DESC
      LIMIT ?
    `, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) purchasing trend (monthly) - last 12 months
app.get("/api/purchasing/trend", async (req, res) => {
  try {
    const rows = await query(`
      SELECT CONCAT(d.MonthName, ' ', d.Year) AS date, d.Year, d.Month,
             COUNT(DISTINCT p.purchaseOrderID) AS orders_count,
             SUM(p.SubTotal) AS total_spend
      FROM factpurchasing p
      JOIN dimdate d ON p.DateKey = d.DateKey
      GROUP BY d.Year, d.Month, d.MonthName
      ORDER BY d.Year DESC, d.Month DESC
      LIMIT 12
    `);
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5) purchasings by vendor region / VendorName (if dimvendor has VendorName)
app.get("/api/purchasing/by-region", async (req, res) => {
  try {
    const rows = await query(`
      SELECT v.VendorName AS name, SUM(p.SubTotal) AS value
      FROM factpurchasing p
      JOIN dimvendor v ON p.VendorKey = v.VendorKey
      GROUP BY v.VendorName
      ORDER BY value DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6) purchasing order status counts (if you have Status column)
app.get("/api/purchasing/status-counts", async (req, res) => {
  try {
    // Adjust `Status` column name if different
    const rows = await query(`
      SELECT COALESCE(p.Status, 'Unknown') AS name, COUNT(*) AS count
      FROM factpurchasing p
      GROUP BY COALESCE(p.Status, 'Unknown')
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Cek email sudah ada atau belum
    const existing = await query(`SELECT * FROM dimuser WHERE Email = ?`, [email]);

    if (existing.length > 0) {
      return res.json({ success: false, message: "Email sudah terdaftar!" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Simpan user
    await query(
      `INSERT INTO dimuser (Name, Email, PasswordHash) VALUES (?, ?, ?)`,
      [name, email, hashed]
    );

    res.json({ success: true, message: "Registrasi berhasil!" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/ranking/sales/top-customers", async (req, res) => {
  try {
    const rows = await query(`
      SELECT c.FullName AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimcustomer c ON f.CustomerKey = c.CustomerKey
      GROUP BY c.FullName
      ORDER BY value DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 10 Produk Terlaris (Top 10 Products by Quantity Sold)
app.get("/api/ranking/sales/top-products-quantity", async (req, res) => {
  try {
    // Asumsi: factsales memiliki kolom OrderQty untuk kuantitas
    const rows = await query(`
      SELECT p.ProductName AS name, SUM(f.OrderQty) AS value
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

// 3. Top Territory Leaders (Top 10 Territories by Revenue)
app.get("/api/ranking/sales/top-territories", async (req, res) => {
  try {
    const rows = await query(`
      SELECT t.Name AS name, SUM(f.LineTotal) AS value
      FROM factsales f
      JOIN dimsalesterritory t ON f.TerritoryKey = t.TerritoryKey
      GROUP BY t.Name
      ORDER BY value DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------ PURCHASING RANKING (factpurchasing) ------------------

// 4. 10 Produk Termahal (Top 10 Products by Average Unit Price)
app.get("/api/ranking/purchasing/most-expensive-products", async (req, res) => {
  try {
    // Menghitung harga rata-rata per unit: SUM(SubTotal) / SUM(ReceivedQty)
    const rows = await query(`
      SELECT pr.ProductName AS name, 
             (SUM(p.SubTotal) / SUM(p.ReceivedQty)) AS value
      FROM factpurchasing p
      JOIN dimproduct pr ON p.ProductKey = pr.ProductKey
      WHERE p.ReceivedQty > 0
      GROUP BY pr.ProductName
      ORDER BY value DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. 10 Vendor yang Produknya Dibeli Terbanyak (Top 10 Vendors by Quantity Received)
app.get("/api/ranking/purchasing/top-vendors-quantity", async (req, res) => {
  try {
    // Asumsi: factpurchasing memiliki kolom ReceivedQty
    const rows = await query(`
      SELECT v.VendorName AS name, SUM(p.ReceivedQty) AS value
      FROM factpurchasing p
      JOIN dimvendor v ON p.VendorKey = v.VendorKey
      GROUP BY v.VendorName
      ORDER BY value DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. 10 Produk Dibeli Terbanyak (Top 10 Products by Quantity Received)
app.get("/api/ranking/purchasing/top-products-quantity", async (req, res) => {
  try {
    // Asumsi: factpurchasing memiliki kolom ReceivedQty
    const rows = await query(`
      SELECT pr.ProductName AS name, SUM(p.ReceivedQty) AS value
      FROM factpurchasing p
      JOIN dimproduct pr ON p.ProductKey = pr.ProductKey
      GROUP BY pr.ProductName
      ORDER BY value DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("✅ Backend berjalan di http://localhost:3001"));