const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
const PORT = 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// DB Config
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "", // leave empty if no password
  database: "db_kutip",
};

// Serve static files (optional)
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// 📸 Image Routes
// ===============================

// GET all images
app.get("/api/images", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT * FROM tb_image ORDER BY i_id DESC"
    );
    await connection.end();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run image processing Python script
app.post("/api/refresh", (req, res) => {
  exec("python process_images.py", (err, stdout, stderr) => {
    if (err) {
      console.error(stderr);
      return res.status(500).json({ error: "Failed to run image processing" });
    }
    res.json({ message: "Image processing complete" });
  });
});

// ===============================
// 👤 Customer Routes
// ===============================

// GET all customers
app.get("/api/customers", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT * FROM tb_customer ORDER BY c_id ASC"
    );
    await connection.end();

    console.log("Fetched from DB:", rows);
    res.json(rows);
  } catch (error) {
    console.error("Error in /api/customers:", error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE a new customer
app.post("/api/customers", async (req, res) => {
  const { c_name, c_street, c_postcode, c_city, c_state, c_country } = req.body;

  if (
    !c_name ||
    !c_street ||
    !c_postcode ||
    !c_city ||
    !c_state ||
    !c_country
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  console.log("Received new customer:", req.body);

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      `INSERT INTO tb_customer (c_name, c_street, c_postcode, c_city, c_state, c_country) 
         VALUES (?, ?, ?, ?, ?, ?)`,
      [c_name, c_street, c_postcode, c_city, c_state, c_country]
    );
    await connection.end();

    console.log("Customer inserted with ID:", result.insertId);

    res.status(201).json({
      message: "Customer created successfully",
      customerId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a customer
app.put("/api/customers/:id", async (req, res) => {
  const { c_name, c_street, c_postcode, c_city, c_state, c_country } = req.body;
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      `UPDATE tb_customer 
             SET c_name=?, c_street=?, c_postcode=?, c_city=?, c_state=?, c_country=? 
             WHERE c_id=?`,
      [c_name, c_street, c_postcode, c_city, c_state, c_country, req.params.id]
    );
    await connection.end();
    res.json({ message: "Customer updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a customer
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM tb_customer WHERE c_id = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/smartbins", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT sb_id, sb_plate, sb_latitude, sb_longitude, sb_status, c_id, t_id FROM tb_smartbin"
    );
    await connection.end();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// 🚛 Truck Routes
// ===============================
// GET all trucks
app.get("/api/trucks", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT t_id, t_plate FROM tb_truck ORDER BY t_id ASC"
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE a new truck (t_id is auto-incremented)
app.post("/api/trucks", async (req, res) => {
  const { t_plate } = req.body;

  if (!t_plate) {
    return res.status(400).json({ error: "t_plate is required" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [
      result,
    ] = await connection.execute(`INSERT INTO tb_truck (t_plate) VALUES (?)`, [
      t_plate,
    ]);
    await connection.end();

    res.status(201).json({
      message: "Truck created successfully",
      truckId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a truck
app.put("/api/trucks/:id", async (req, res) => {
  const { t_plate } = req.body;

  if (!t_plate) {
    return res.status(400).json({ error: "t_plate is required" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(`UPDATE tb_truck SET t_plate = ? WHERE t_id = ?`, [
      t_plate,
      req.params.id,
    ]);
    await connection.end();

    res.json({ message: "Truck updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a truck
app.delete("/api/trucks/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM tb_truck WHERE t_id = ?", [
      req.params.id,
    ]);
    await connection.end();

    res.json({ message: "Truck deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
