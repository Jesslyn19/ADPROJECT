﻿const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const multer = require("multer");
const axios = require("axios");
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
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

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

app.post("/api/login", async (req, res) => {
  const { u_name, u_password } = req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT tb_user.u_id, tb_user.role_id, tb_role.role_name 
        FROM tb_user 
        JOIN tb_role ON tb_user.role_id = tb_role.role_id 
        WHERE BINARY tb_user.u_name = ? AND BINARY tb_user.u_password = ? AND tb_user.u_status=1`,
      [u_name, u_password]
    );

    const today = new Date().toISOString().split("T")[0];
    const [missedRows] = await connection.execute(
      `
      SELECT COUNT(*) AS missedCount
      FROM tb_smartbin s
      LEFT JOIN tb_image i ON s.sb_plate = i.i_plate AND DATE(i.i_date) = ?
      WHERE s.sb_status = 1 AND i.i_url IS NULL AND FIND_IN_SET(DAYNAME(CURDATE()), s.sb_day)
      `,
      [today]
    );
    const missedCount = missedRows[0].missedCount || 0;

    await connection.end();
    if (rows.length > 0) {
      res.json({
        success: true,
        role_id: rows[0].role_id,
        u_id: rows[0].u_id,
        role_name: rows[0].role_name,
        missedCount,
      });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    const { date } = req.query;
    const selectedDate = date || new Date().toISOString().split("T")[0];

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `
      SELECT 
        s.sb_id,
        s.sb_plate,
        t.t_plate AS incharge,
        i.i_url,
        i.i_file,
        i.i_time,
        i.i_date
      FROM tb_smartbin s
      LEFT JOIN tb_truck t ON s.t_id = t.t_id
      LEFT JOIN (
        SELECT i1.*
        FROM tb_image i1
        INNER JOIN (
          SELECT i_plate, MAX(CONCAT(i_date, ' ', i_time)) AS max_datetime
          FROM tb_image
          WHERE DATE(i_date) = ?
          GROUP BY i_plate
        ) latest ON i1.i_plate = latest.i_plate AND CONCAT(i1.i_date, ' ', i1.i_time) = latest.max_datetime
      ) i ON s.sb_plate = i.i_plate
      WHERE s.sb_status = 1
        AND FIND_IN_SET(DAYNAME(?), REPLACE(s.sb_day, ' ', ''))
      ORDER BY s.sb_id ASC
      `,
      [selectedDate, selectedDate]
    );

    await connection.end();

    const enrichedRows = rows.map((row) => ({
      ...row,
      status: row.i_url ? "Done" : "Missed",
    }));

    res.json(enrichedRows);
  } catch (error) {
    console.error("Error fetching task list:", error);
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
      `SELECT * FROM tb_customer 
       WHERE c_status = 1 
       ORDER BY c_id ASC`
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
  const {
    c_name,
    c_street,
    c_postcode,
    c_city,
    c_state,
    c_country,
    c_contact,
  } = req.body;

  // Validate all fields including contact
  if (
    !c_name ||
    !c_street ||
    !c_postcode ||
    !c_city ||
    !c_state ||
    !c_country ||
    !c_contact
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  console.log("Received new customer:", req.body);

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      `INSERT INTO tb_customer (c_name, c_street, c_postcode, c_city, c_state, c_country, c_contact) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c_name, c_street, c_postcode, c_city, c_state, c_country, c_contact] // Added c_contact
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
  const {
    c_name,
    c_street,
    c_postcode,
    c_city,
    c_state,
    c_country,
    c_contact,
  } = req.body;
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      `UPDATE tb_customer 
             SET c_name=?, c_street=?, c_postcode=?, c_city=?, c_state=?, c_country=?, c_contact=? 
             WHERE c_id=?`,
      [
        c_name,
        c_street,
        c_postcode,
        c_city,
        c_state,
        c_country,
        c_contact,
        req.params.id,
      ] // Added c_contact
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
    await connection.execute("UPDATE tb_customer SET c_status=2 WHERE c_id=?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  const excludeId = req.query.exclude;
  const u_name = req.query.u_name;

  try {
    const connection = await mysql.createConnection(dbConfig);

    if (u_name) {
      const [existing] = await connection.execute(
        "SELECT u_id FROM tb_user WHERE u_name = ?",
        [u_name]
      );

      if (existing.length > 0) {
        await connection.end();
        return res.status(400).json({
          field: "u_name",
          message: "Username already taken",
        });
      }
    }

    let query = `
      SELECT u.*, r.role_name, s.s_name
      FROM tb_user u
      JOIN tb_role r ON u.role_id = r.role_id
      JOIN tb_status s ON u.u_status = s.s_id
      WHERE u.u_status = 1
    `;

    // Only exclude the user if excludeId is provided
    const params = [];
    if (excludeId) {
      query += ` AND u.u_id != ?`;
      params.push(excludeId);
    }

    query += ` ORDER BY u.u_id ASC`;

    const [rows] = await connection.execute(query, params);
    await connection.end();

    res.json(rows);
  } catch (error) {
    console.error("Error in /api/users:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/roles", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT * FROM tb_role ORDER BY role_id ASC"
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE a new user
app.post("/api/users", async (req, res) => {
  console.log("POST /api/users body:", req.body);

  const {
    u_fname,
    u_lname,
    u_name,
    u_street,
    u_postcode,
    u_city,
    u_state,
    u_country,
    role_id,
    u_password,
    u_contact, // added contact field
  } = req.body;

  // Ensure all fields are provided, including u_contact
  if (
    !u_fname ||
    !u_lname ||
    !u_name ||
    !u_street ||
    !u_postcode ||
    !u_city ||
    !u_state ||
    !u_country ||
    !role_id ||
    !u_password ||
    !u_contact // added contact field validation
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [existing] = await connection.execute(
      "SELECT u_id FROM tb_user WHERE u_name = ?",
      [u_name]
    );

    if (existing.length > 0) {
      await connection.end();
      return res.status(400).json({
        field: "u_name",
        message: "Username already taken",
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO tb_user (u_fname, u_lname, u_name, u_street, u_postcode, u_city, u_state, u_country, role_id, u_password, u_contact) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // added u_contact
      [
        u_fname,
        u_lname,
        u_name,
        u_street,
        u_postcode,
        u_city,
        u_state,
        u_country,
        role_id,
        u_password,
        u_contact, // added u_contact
      ]
    );
    await connection.end();

    res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error inserting user:", error); // <-- log full error here
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a user
app.put("/api/users/:id", async (req, res) => {
  const {
    u_fname,
    u_lname,
    u_name,
    u_street,
    u_postcode,
    u_city,
    u_state,
    u_country,
    role_id,
    u_password,
    u_contact, // added contact field
  } = req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [existing] = await connection.execute(
      "SELECT u_id FROM tb_user WHERE u_name = ? AND u_id != ?",
      [u_name, req.params.id]
    );

    if (existing.length > 0) {
      await connection.end();
      return res
        .status(400)
        .json({ field: "u_name", message: "Username already taken" });
    }
    await connection.execute(
      `UPDATE tb_user 
             SET u_fname=?, u_lname=?, u_name=?, u_street=?, u_postcode=?, u_city=?, u_state=?, u_country=?, role_id=?, u_password=?, u_contact=? 
             WHERE u_id=?`, // added u_contact
      [
        u_fname,
        u_lname,
        u_name,
        u_street,
        u_postcode,
        u_city,
        u_state,
        u_country,
        role_id,
        u_password,
        u_contact, // added u_contact
        req.params.id,
      ]
    );
    await connection.end();
    res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute("UPDATE tb_user SET u_status = 2 WHERE u_id = ?", [
      req.params.id,
    ]);
    await connection.end();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//-----------------------------------------------------------------------
// Bins section
app.get("/api/allsmartbins", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT sb_id, sb_plate, sb_floor, sb_street, sb_postcode, sb_city, sb_state, sb_country, sb_latitude, sb_longitude, c_id, t_id, sb_day 
       FROM tb_smartbin 
       WHERE sb_status = 1`
    );
    await connection.end();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE a new bin
app.post("/api/smartbins", async (req, res) => {
  const {
    sb_plate,
    sb_floor,
    sb_street,
    sb_postcode,
    sb_city,
    sb_state,
    sb_country,
    c_id,
    sb_day,
  } = req.body;

  if (
    !sb_plate ||
    !sb_floor ||
    !sb_street ||
    !sb_postcode ||
    !sb_city ||
    !sb_state ||
    !sb_country ||
    !c_id ||
    !sb_day
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  console.log("Received new bin:", req.body);

  const fullAddress = `${sb_floor}, ${sb_street}, ${sb_postcode}, ${sb_city}, ${sb_state}, ${sb_country}`;
  console.log("Full address to geocode:", fullAddress);

  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json`;

    const response = await axios.get(geocodeUrl, {
      params: {
        address: fullAddress,
        key: "AIzaSyBrtKCsVbb4w8uhYpG4YV84FhOXRiR79eY",
      },
    });

    const results = response.data.results;
    if (
      !results.length ||
      !results[0].geometry ||
      !results[0].geometry.location
    ) {
      console.error("Geocoding failed for address:", fullAddress);
      return res.status(400).json({ error: "Failed to geocode address." });
    }

    const { lat, lng } = results[0].geometry.location;

    const sb_latitude = parseFloat(lat);
    const sb_longitude = parseFloat(lng);

    const connection = await mysql.createConnection(dbConfig);

    const sb_plate_clean = Array.isArray(sb_plate) ? sb_plate[0] : sb_plate;
    const sb_floor_clean = Array.isArray(sb_floor) ? sb_floor[0] : sb_floor;
    const sb_postcode_clean = Array.isArray(sb_postcode)
      ? sb_postcode[0]
      : sb_postcode;
    const sb_city_clean = Array.isArray(sb_city) ? sb_city[0] : sb_city;
    const sb_state_clean = Array.isArray(sb_state) ? sb_state[0] : sb_state;
    const sb_country_clean = Array.isArray(sb_country)
      ? sb_country[0]
      : sb_country;
    const c_id_clean = Array.isArray(c_id) ? parseInt(c_id[0]) : parseInt(c_id);
    const sb_street_clean = Array.isArray(sb_street)
      ? sb_street.join(", ")
      : sb_street;
    const sb_day_string = Array.isArray(sb_day) ? sb_day.join(",") : sb_day;

    const [result] = await connection.execute(
      `INSERT INTO tb_smartbin (sb_plate, sb_floor, sb_street, sb_postcode, sb_city, sb_state, sb_country, sb_latitude, sb_longitude, c_id, sb_day) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sb_plate_clean,
        sb_floor_clean,
        sb_street_clean,
        sb_postcode_clean,
        sb_city_clean,
        sb_state_clean,
        sb_country_clean,
        sb_latitude,
        sb_longitude,
        c_id_clean,
        sb_day_string,
      ]
    );
    await connection.end();

    console.log("Bin inserted with ID:", result.insertId);

    res.status(201).json({
      message: "Bin created successfully",
      binId: result.insertId,
    });
  } catch (error) {
    console.error("Server error in /api/smartbins POST:", error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a smartbin
app.put("/api/smartbins/:id", async (req, res) => {
  const {
    sb_plate,
    sb_floor,
    sb_street,
    sb_postcode,
    sb_city,
    sb_state,
    sb_country,
    c_id,
    t_id,
    sb_day,
  } = req.body;

  // Clean values
  const sb_plate_clean = Array.isArray(sb_plate) ? sb_plate[0] : sb_plate;
  const sb_floor_clean = Array.isArray(sb_floor) ? sb_floor[0] : sb_floor;
  const sb_postcode_clean = Array.isArray(sb_postcode)
    ? sb_postcode[0]
    : sb_postcode;
  const sb_city_clean = Array.isArray(sb_city) ? sb_city[0] : sb_city;
  const sb_state_clean = Array.isArray(sb_state) ? sb_state[0] : sb_state;
  const sb_country_clean = Array.isArray(sb_country)
    ? sb_country[0]
    : sb_country;
  const sb_street_clean = Array.isArray(sb_street)
    ? sb_street.join(", ")
    : sb_street;
  const c_id_clean = Array.isArray(c_id) ? parseInt(c_id[0]) : parseInt(c_id);
  const t_id_clean = t_id
    ? Array.isArray(t_id)
      ? parseInt(t_id[0])
      : parseInt(t_id)
    : null;
  const sb_day_clean = Array.isArray(sb_day) ? sb_day.join(",") : sb_day;
  const sb_id_clean = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  const fullAddress = `${sb_floor_clean}, ${sb_street_clean}, ${sb_postcode_clean}, ${sb_city_clean}, ${sb_state_clean}, ${sb_country_clean}`;
  console.log("Full address to geocode:", fullAddress);

  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json`;
    const response = await axios.get(geocodeUrl, {
      params: {
        address: fullAddress,
        key: "AIzaSyBrtKCsVbb4w8uhYpG4YV84FhOXRiR79eY", // Replace with your actual key
      },
    });

    if (response.data.status !== "OK") {
      console.error("Geocoding failed:", response.data);
      return res.status(400).json({ error: "Failed to geocode address." });
    }

    const { lat, lng } = response.data.results[0].geometry.location;

    const connection = await mysql.createConnection(dbConfig);

    const values = [
      sb_plate_clean,
      sb_floor_clean,
      sb_street_clean,
      sb_postcode_clean,
      sb_city_clean,
      sb_state_clean,
      sb_country_clean,
      lat,
      lng,
      c_id_clean,
      t_id_clean,
      sb_day_clean,
      sb_id_clean,
    ];

    console.log("Final values to update:", values);

    await connection.execute(
      `UPDATE tb_smartbin 
       SET sb_plate=?, sb_floor=?, sb_street=?, sb_postcode=?, sb_city=?, sb_state=?, sb_country=?, sb_latitude=?, sb_longitude=?, c_id=?, t_id=?, sb_day=? 
       WHERE sb_id=?`,
      values
    );

    await connection.end();
    res.json({ message: "Bin updated successfully" });
  } catch (error) {
    console.error("PUT /api/smartbins/:id error:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

// DELETE a smartbin
app.delete("/api/smartbins/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "UPDATE tb_smartbin SET sb_status = 2 WHERE sb_id = ?",
      [req.params.id]
    );
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
      "SELECT COUNT(*) AS total FROM tb_smartbin WHERE sb_status=1"
    );
    await connection.end();

    res.json({ total: rows[0].total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get total bins today
app.get("/api/total-bins-today", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    // Get current day name (e.g., 'Monday', 'Tuesday', etc.)
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const [rows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM tb_smartbin WHERE sb_day LIKE ? AND sb_status=1",
      [`%${today}%`]
    );
    await connection.end();

    res.json({ total: rows[0].total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET trucks with bins assigned for a specific day (for route planning)
app.get("/api/trucks/route", async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: "Missing date parameter" });
  }

  const connection = await mysql.createConnection(dbConfig);

  try {
    // Get all trucks with their driver info (NO latitude/longitude)
    const [trucks] = await connection.execute(`
      SELECT t_id as truck_id, t_plate,
             u_id as driver_id, u_name as driver_name
      FROM tb_truck t
      LEFT JOIN tb_user u ON t.driver_id = u_id
    `);

    // Get all bins for the requested day
    const [bins] = await connection.execute(`
      SELECT sb_id, sb_plate, sb_latitude, sb_longitude, sb_day, t_id as sb_truck_id
      FROM tb_smartbin
    `);

    // Filter bins for the requested day
    const binsForDay = bins.filter((bin) =>
      bin.sb_day
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .includes(date.toLowerCase())
    );

    // Attach bins to their trucks
    const trucksWithBins = trucks.map((truck) => ({
      ...truck,
      bins: binsForDay.filter((bin) => bin.sb_truck_id === truck.truck_id),
    }));

    res.json(trucksWithBins);
  } catch (err) {
    console.error("Error in /api/trucks/route:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    await connection.end();
  }
});
//-----------------------------------------------------------------------
// Maps section
app.put("/api/assign-truck", async (req, res) => {
  const updates = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Invalid request format." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    for (const { sb_id, t_id } of updates) {
      if (!sb_id || !t_id) continue;
      await connection.execute(
        "UPDATE tb_smartbin SET t_id = ? WHERE sb_id = ?",
        [t_id, sb_id]
      );
    }

    await connection.commit();
    await connection.end();

    res.status(200).json({ message: "Truck assignments updated successfully" });
  } catch (error) {
    console.error("Error updating smartbins:", error);
    res.status(500).json({ error: "Failed to update bins" });
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
  const { writer, subject, content, u_id } = req.body;
  const image = req.file
    ? `http://localhost:5000/uploads/${req.file.filename}`
    : null;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      `INSERT INTO tb_report (r_subject, r_content, r_image, r_writer, r_datetime, u_id)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [subject, content, image, writer, u_id]
    );

    await connection.end();

    res.status(201).json({
      message: "Report submitted successfully",
      reportId: result.insertId, // Optional: return the new report ID
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET current user name
app.get("/api/username/:currentuserid", async (req, res) => {
  try {
    const { currentuserid } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT u_fname, u_lname FROM tb_user WHERE u_id = ?`,
      [currentuserid] // 🔥 Add parameter here!
    );
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(rows[0]); // ✅ Send just the first object
  } catch (error) {
    console.error("Error in /api/username/:currentuserid:", error);
    res.status(500).json({ error: error.message });
  }
});

// delete a report
app.delete("/api/reports/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute("UPDATE tb_report SET r_status=2 WHERE r_id = ?", [
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
      `SELECT r_id, r_subject, r_content, r_image, r_writer, r_datetime 
       FROM tb_report 
       WHERE r_status = 1`
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
      WHERE t.t_status = 1
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

  // Check for duplicate number plate before creating
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 1 FROM tb_truck WHERE t_plate = ? AND t_status = 1`,
      [t_plate]
    );

    if (rows.length > 0) {
      // If a truck with the same plate exists
      await connection.end();
      return res
        .status(400)
        .json({ error: "Truck number plate already registered" });
    }

    // No duplicate found, proceed with creation
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

  if (!t_plate) {
    return res.status(400).json({ error: "t_plate is required" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Check if the plate already exists (excluding the current truck's id)
    const [rows] = await connection.execute(
      `SELECT 1 FROM tb_truck WHERE t_plate = ? AND t_status = 1 AND t_id != ?`,
      [t_plate, req.params.id]
    );

    if (rows.length > 0) {
      // If a truck with the same plate exists
      await connection.end();
      return res
        .status(400)
        .json({ error: "Truck number plate already registered" });
    }

    // No duplicate found, proceed with update
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
// DELETE a truck (soft delete by setting t_status to 2)
// ===============================
app.delete("/api/trucks/:id", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "UPDATE tb_truck SET t_status = 2 WHERE t_id = ?",
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
// CHECK if truck number plate is already registered (duplicate check)
// ===============================
app.get("/api/trucks/check-duplicate/:plate", async (req, res) => {
  const { plate } = req.params;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 1 FROM tb_truck WHERE t_plate = ? AND t_status = 1`,
      [plate]
    );
    await connection.end();

    if (rows.length > 0) {
      // If a truck with the same plate exists
      res.json({ exists: true });
    } else {
      // No truck with the same plate
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking for duplicate plate:", error);
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

// USer setting
app.get("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const connection = await mysql.createConnection(dbConfig);

    // Query user with role name and status name
    const [rows] = await connection.execute(
      `SELECT u.*, r.role_name, s.s_name
       FROM tb_user u
       JOIN tb_role r ON u.role_id = r.role_id
       JOIN tb_status s ON u.u_status = s.s_id
       WHERE u.u_id = ?`,
      [userId]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    if (user.u_url) {
      user.u_url = `http://localhost:5000/uploads/${user.u_url}`;
    }

    res.json(user);
  } catch (error) {
    console.error("Error in GET /api/users/:id", error);
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  const {
    u_fname,
    u_lname,
    u_street,
    u_city,
    u_postcode,
    u_state,
    u_country,
    u_password,
    u_url,
    u_contact,
  } = req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      `UPDATE tb_user SET 
         u_fname = ?, 
         u_lname = ?, 
         u_street = ?, 
         u_city = ?, 
         u_postcode = ?, 
         u_state = ?, 
         u_country = ?, 
         u_password = ?, 
         u_url = ?,
         u_contact= ?
       WHERE u_id = ?`,
      [
        u_fname,
        u_lname,
        u_street,
        u_city,
        u_postcode,
        u_state,
        u_country,
        u_password,
        u_url,
        u_contact,
        userId,
      ]
    );

    await connection.end();

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error in PATCH /api/users/:id", error);
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/users/update-password/:id", async (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Get user
    const [rows] = await connection.execute(
      "SELECT u_password FROM tb_user WHERE u_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      await connection.end();
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    if (user.u_password !== currentPassword) {
      await connection.end();
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update password
    await connection.execute(
      "UPDATE tb_user SET u_password = ? WHERE u_id = ?",
      [newPassword, userId]
    );

    await connection.end();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in PATCH /api/users/update-password/:id", error);
    res.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/users/:id/upload-image",
  upload.single("image"),
  async (req, res) => {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const connection = await mysql.createConnection(dbConfig);

      // Save file path or filename in u_url field
      const imageUrl = req.file.filename;

      await connection.execute("UPDATE tb_user SET u_url = ? WHERE u_id = ?", [
        imageUrl,
        userId,
      ]);

      await connection.end();

      const fullImageUrl = `http://localhost:5000/uploads/${imageUrl}`;
      res.json({
        message: "Image uploaded and user updated",
        imageUrl: fullImageUrl,
      });
    } catch (error) {
      console.error("Error uploading image", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
