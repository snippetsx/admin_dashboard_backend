const express = require('express');
const cors = require('cors');
const app = express();
const os = require('os');
const fs = require('fs');

app.use(cors());
app.use(express.json())


const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: '1234',
  database: 'app'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.get('/system-stats', (req, res) => {
    // Get CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
        // Calculate idle time and total time for each CPU core
        const idle = cpu.times.idle;
        const user = cpu.times.user;
        const nice = cpu.times.nice;
        const sys = cpu.times.sys;
        const irq = cpu.times.irq;
        
        // Calculate total time by summing all CPU states
        const total = user + nice + sys + idle + irq;
        
        // Add to running totals to get average across all cores
        totalTick += total;
        totalIdle += idle;
    });

    const cpuUsage = 100 - (totalIdle / totalTick * 100);

    // Get memory usage
    const totalMemory = os.totalmem() / 1024 / 1024 / 1024;

    const freeMemory = os.freemem()  / 1024 / 1024 / 1024;
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory * 100);

    res.json({
        cpu: Math.round(cpuUsage * 100) / 100,
        memory: Math.round(memoryUsage * 100) / 100,
        totalMemory: totalMemory.toFixed(2),
        freeMemory: freeMemory.toFixed(2)
    });
});

app.use('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(req.body.username, req.body.password);
    
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const user = results[0];
        
        if (password !== user.password_hash) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        res.json({
            token: username,
        });
    });
})

app.use('/check-perms', (req, res) => {
    const username = req.body.username;
    console.log(req.body);
    const query = 'SELECT perms FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            permissions: results[0].perms
        });
    });
});

app.use('/config', (req, res) => {
    const result = req.headers['x-username'];

    console.log(req.headers['x-username']);
    if (!result) {
        return res.status(400).json({ error: "x-username header is required" });
    }
    const pre_username = JSON.parse(result);
    const username = pre_username.token;
    // Check if user exists and has permissions
    console.log(username);
    const query = 'SELECT perms FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const perms = results[0].perms;
        if (perms !== 'admin') {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        // Handle config updates
        if (req.method === 'POST') {
            try {
                const newConfig = req.body;
                console.log(newConfig);
                fs.writeFileSync('config.json', JSON.stringify(newConfig));
                res.json({ message: "Config updated successfully" });
            } catch (error) {
                console.error('Error writing config:', error);
                res.status(500).json({ error: "Failed to update config" });
            }
        }
        
        // Handle config reads
        else if (req.method === 'GET') {
            try {
                const configData = fs.readFileSync('config.json', 'utf8');
                if (!configData) {
                    return res.status(500).json({ error: "Config file is empty" });
                }
                const config = JSON.parse(configData);
                res.json(config);
            } catch (error) {
                console.error('Error reading config:', error);
                res.status(500).json({ error: "Failed to read config" });
            }
        }
        
        else {
            res.status(405).json({ error: "Method not allowed" });
        }
    });
});





app.listen(8080, () => console.log('API Running on localhost:8080'))