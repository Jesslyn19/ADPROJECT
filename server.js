const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Enable CORS for frontend access
app.use(cors());

// DB Config
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_kutip',
};

// Static files (if any)
app.use(express.static(path.join(__dirname, 'public')));

// API Route: Get images
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

// API Route: Run Python script
app.post('/api/refresh', (req, res) => {
    const { exec } = require('child_process');
    exec('python process_images.py', (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return res.status(500).json({ error: 'Failed to run image processing' });
        }
        res.json({ message: 'Image processing complete' });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
