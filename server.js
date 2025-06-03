const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const multer = require("multer");
const bodyParser = require("body-parser");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
const PORT = 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

app.put("/api/images/:id", async (req, res) => {
  const { id } = req.params;
  const { i_plate } = req.body;

  if (!i_plate) {
    return res.status(400).json({ error: "Plate number is required" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "UPDATE tb_image SET i_plate = ? WHERE i_id = ?",
      [i_plate, id]
    );
    await connection.end();
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.status(200).json({ message: "Plate number updated successfully" });
  } catch (error) {
    console.error("Error updating plate number:", error);
    res.status(500).json({ error: "Failed to update plate number" });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(`
      SELECT 
        s.sb_id,
        s.sb_plate,
        i.i_url,
        i.i_time
      FROM tb_smartbin s
      LEFT JOIN tb_image i 
        ON s.sb_id = i.sb_id 
        AND i.i_date = CURDATE()
      ORDER BY s.sb_id ASC
    `);

    await connection.end();

    const enrichedRows = rows.map((row) => ({
      ...row,
      status: row.i_url ? "Done" : "Missed",
    }));

    res.json(enrichedRows);
  } catch (error) {
    console.error("Error fetching merged smartbin/image data:", error);
    res.status(500).json({ error: error.message });
  }
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

//-----------------------------------------------------------------------
// Bins section
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

// CREATE a new bin
app.post("/api/smartbins", async (req, res) => {
  const { sb_plate, sb_latitude, sb_longitude, c_id, t_id } = req.body;

  if (!sb_plate || !sb_latitude || !sb_longitude || !c_id || !t_id) {
    return res.status(400).json({ error: "All fields are required" });
  }
  console.log("Received new bin:", req.body);

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      `INSERT INTO tb_smartbin (sb_plate, sb_latitude, sb_longitude, c_id, t_id) 
         VALUES (?, ?, ?, ?, ?)`,
      [sb_plate, sb_latitude, sb_longitude, c_id, t_id]
    );
    await connection.end();

    console.log("Bin inserted with ID:", result.insertId);

    res.status(201).json({
      message: "Bin created successfully",
      binId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a smartbin
app.put("/api/smartbins/:id", async (req, res) => {
  const { sb_plate, sb_latitude, sb_longitude, c_id, t_id } = req.body;
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      `UPDATE tb_smartbin 
             SET sb_plate=?, sb_latitude=?, sb_longitude=?, c_id=?, t_id=? 
             WHERE sb_id=?`,
      [sb_plate, sb_latitude, sb_longitude, c_id, t_id, req.params.id]
    );
    await connection.end();
    res.json({ message: "Bin updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a smartbin
app.delete("/api/smartbins/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM tb_smartbin WHERE sb_id = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "Bin deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get total bins
app.get("/api/total-bins", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM tb_smartbin"
    );
    await connection.end();

    res.json({ total: rows[0].total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get total collected bins
app.get("/api/collected-bins", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM tb_smartbin WHERE sb_status='Collected'"
    );
    await connection.end();

    res.json({ total: rows[0].total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get total missed bins
app.get("/api/missed-bins", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM tb_smartbin WHERE sb_status='Missed'"
    );
    await connection.end();

    res.json({ total: rows[0].total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get total customer
app.get("/api/total-customers", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM tb_customer"
    );
    await connection.end();

    res.json({ total: rows[0].total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//-----------------------------------------------------------------------
// Reports section
// Multer setup
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage: storage });

// Create new report
app.post("/api/create_report", upload.single("image"), async (req, res) => {
  const { writer, subject, content } = req.body;
  const image = req.file
    ? `http://localhost:3001/uploads/${req.file.filename}`
    : null;

  const connection = await mysql.createConnection(dbConfig);
  const sql = `INSERT INTO tb_report (r_subject, r_content, r_image, r_writer, r_datetime)
               VALUES (?, ?, ?, ?, NOW())`;

  connection.query(sql, [subject, content, image, writer], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: "Report submitted successfully." });
  });
});

// delete a report
app.delete("/api/reports/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM tb_report WHERE r_id = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// view reports
app.get("/api/reports", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT r_id, r_subject, r_content, r_image, r_writer, r_datetime FROM tb_report"
    );
    await connection.end();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// 🚛 Truck Routes with Driver from tb_user where role_id = 2
// ===============================

// GET all trucks with driver names (from tb_user with role_id=2)
app.get("/api/trucks", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT 
        t.t_id, 
        t.t_plate, 
        t.t_capacity, 
        u.u_id AS driver_id, 
        u.u_name AS driver_name
      FROM tb_truck t
      LEFT JOIN tb_user u ON t.driver_id = u.u_id AND u.role_id = 2
      ORDER BY t.t_id ASC
    `);
    await connection.end();

    console.log("Fetched trucks:", rows);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching trucks:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// CREATE a new truck with optional driver_id (mapped to t.driver_id)
// ===============================
app.post("/api/trucks", async (req, res) => {
  const { t_plate, t_capacity, driver_id } = req.body;

  if (!t_plate) {
    return res.status(400).json({ error: "t_plate is required" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      `INSERT INTO tb_truck (t_plate, t_capacity, driver_id) VALUES (?, ?, ?)`,
      [t_plate, t_capacity || null, driver_id || null]
    );
    await connection.end();

    res.status(201).json({
      message: "Truck created successfully",
      truckId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating truck:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// UPDATE a truck including driver assignment
// ===============================
app.put("/api/trucks/:id", async (req, res) => {
  const { t_plate, t_capacity, driver_id } = req.body;
  console.log("Request body:", req.body);

  if (!t_plate) {
    return res.status(400).json({ error: "t_plate is required" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      `UPDATE tb_truck 
       SET t_plate = ?, t_capacity = ?, driver_id = ?
       WHERE t_id = ?`,
      [t_plate, t_capacity || null, driver_id || null, req.params.id]
    );
    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Truck not found" });
    }

    res.json({ message: "Truck updated successfully" });
  } catch (error) {
    console.error("Error updating truck:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// DELETE a truck
// ===============================
app.delete("/api/trucks/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "DELETE FROM tb_truck WHERE t_id = ?",
      [req.params.id]
    );
    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Truck not found" });
    }

    res.json({ message: "Truck deleted successfully" });
  } catch (error) {
    console.error("Error deleting truck:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// GET all drivers (users with role_id=2)
// ===============================
app.get("/api/drivers", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT u_id, u_name FROM tb_user WHERE role_id = ? ORDER BY u_name ASC",
      [2]
    );
    await connection.end();

    console.log("Fetched drivers:", rows);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ error: error.message });
  }
});
// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
