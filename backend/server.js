// =========================================
//  GigGear Backend API
// =========================================

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();

app.use(cors());
app.use(express.json());

// =========================================
//  DATABASE CONNECTION
// =========================================
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "db_giggear"  // pastikan nama DB benar
});

// TEST CONNECTION
db.getConnection((err) => {
  if (err) {
    console.log("❌ Database gagal konek:", err);
  } else {
    console.log("✅ Terhubung ke database db_giggear");
  }
});

// =========================================
//  1. SALES PER CATEGORY (DONUT CHART)
// =========================================
// Menghitung total penjualan berdasarkan kategori produk
app.get("/api/category-sales", (req, res) => {
  const sql = `
    SELECT c.name AS category,
           SUM(oi.quantity * oi.price) AS total_sales
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.name
    ORDER BY total_sales DESC;
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// =========================================
//  2. TOP PRODUCTS (BAR CHART)
// =========================================
app.get("/api/top-products", (req, res) => {
  const sql = `
    SELECT p.name AS product,
           SUM(oi.quantity * oi.price) AS value
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY p.id
    ORDER BY value DESC
    LIMIT 10;
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// =========================================
//  3. ORDERS TREND (LINE CHART)
// =========================================
app.get("/api/orders-trend", (req, res) => {
  const sql = `
    SELECT DATE(created_at) AS date,
           COUNT(*) AS total_orders
    FROM orders
    GROUP BY DATE(created_at)
    ORDER BY date ASC;
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// =========================================
//  4. PAYMENT METHOD DISTRIBUTION (PIE CHART)
// =========================================
app.get("/api/payment-method", (req, res) => {
  const sql = `
    SELECT payment_method,
           COUNT(*) AS count
    FROM orders
    GROUP BY payment_method;
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// =========================================
//  5. LOGIN SIMPLE (username: admin, pass: admin123)
// =========================================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    return res.json({
      success: true,
      token: "dummy-token-example"
    });
  }

  return res.json({ success: false, message: "Login gagal" });
});

// =========================================
//  SERVER RUN
// =========================================
app.listen(3001, () => {
  console.log("🚀 Backend berjalan di http://localhost:3001");
});
