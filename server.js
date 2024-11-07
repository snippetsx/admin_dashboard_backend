const express = require('express');
const cors = require('cors');
const app = express();
const os = require('os');

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
    console.log(req.body.password);
    
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





app.listen(8080, () => console.log('API Running on localhost:8080'))