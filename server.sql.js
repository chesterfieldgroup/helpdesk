const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const leaderboardRouter = require('./leaderboard');
const generateUniqueId = require('./idGenerator'); // Import the ID generator
const sql = require('mssql');

// Load environment variables from .env file
dotenv.config();

// SQL Server configuration
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: true, // Use encryption for Azure SQL
        enableArithAbort: true
    }
};

// Connect to SQL Azure Server
sql.connect(sqlConfig).then(pool => {
    console.log('Connected to SQL Azure Server');
    return pool;
}).catch(err => {
    console.error('Database connection failed: ', err);
});

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(bodyParser.json());

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// Configure Multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')  // files will be saved in the 'uploads' directory
    },
    filename: function (req, file, cb) {
        // files will have the original file extension
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to check submission rate limit
function checkSubmissionRateLimit(req, res, next) {
    const userIP = req.ip; // Using IP address as identifier for simplicity

    const now = Date.now();
    if (lastSubmissionTime[userIP] && (now - lastSubmissionTime[userIP] < 5 * 60 * 1000)) {
        return res.status(429).json({ message: 'You can only submit one query every 5 minutes.' });
    }

    lastSubmissionTime[userIP] = now;
    next();
}

// In-memory store to track last submission time
const lastSubmissionTime = {};

// Public route to serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to serve the admin page (temporarily without auth)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API endpoint to handle form submission
app.post('/api/submit-form', checkSubmissionRateLimit, upload.array('screenshots', 10), async (req, res) => {
    const { subject, detail } = req.body;
    const screenshotFiles = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    try {
        const pool = await sql.connect(sqlConfig);
        const newRequestId = generateUniqueId();
        await pool.request()
            .input('id', sql.NVarChar, newRequestId)
            .input('user', sql.NVarChar, 'anonymous')
            .input('timestamp', sql.DateTime, new Date())
            .input('subject', sql.NVarChar, subject)
            .input('detail', sql.NVarChar, detail)
            .input('screenshots', sql.NVarChar, screenshotFiles.join(','))
            .input('status', sql.NVarChar, 'Open')
            .input('resolvement', sql.NVarChar, '')
            .query(`
                INSERT INTO Queries (id, [user], timestamp, subject, detail, screenshots, status, resolvement)
                VALUES (@id, @user, @timestamp, @subject, @detail, @screenshots, @status, @resolvement)
            `);
        
        res.json({ message: 'Form submitted successfully!' });
    } catch (err) {
        console.error('Error saving query:', err);
        res.status(500).send('Internal server error');
    }
});

// API endpoint to get all queries
app.get('/api/queries', async (req, res) => {
    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request()
            .query('SELECT * FROM Queries ORDER BY timestamp DESC');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching queries:', err);
        res.status(500).send('Internal server error');
    }
});

// API endpoint to update a query
app.post('/api/update-query/:id', async (req, res) => {
    const { id } = req.params;
    const { status, resolvement, engineer } = req.body;

    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .input('status', sql.NVarChar, status)
            .input('resolvement', sql.NVarChar, resolvement)
            .input('engineer', sql.NVarChar, engineer)
            .query(`
                UPDATE Queries 
                SET status = @status, resolvement = @resolvement, engineer = @engineer 
                WHERE id = @id
            `);

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Query updated successfully!' });
        } else {
            res.status(404).send('Query not found');
        }
    } catch (err) {
        console.error('Error updating query:', err);
        res.status(500).send('Internal server error');
    }
});

// Use the leaderboard routes
app.use('/api', leaderboardRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
