const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// DB Config
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // leave empty if no password
    database: 'db_kutip',
};

// Serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// 📸 Image Routes
// ===============================

// GET all images
app.get('/api/images', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM tb_image ORDER BY i_id DESC');
        await connection.end();

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Run image processing Python script
app.post('/api/refresh', (req, res) => {
    exec('python process_images.py', (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return res.status(500).json({ error: 'Failed to run image processing' });
        }
        res.json({ message: 'Image processing complete' });
    });
});

// ===============================
// 👤 Customer Routes
// ===============================

// GET all customers
app.get('/api/customers', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM tb_customer ORDER BY c_id ASC'); 
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE a customer
app.put('/api/customers/:id', async (req, res) => {
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
        res.json({ message: 'Customer updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE a customer
app.delete('/api/customers/:id', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM tb_customer WHERE c_id = ?', [req.params.id]);
        await connection.end();
        res.json({ message: 'Customer deleted successfully' });
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
