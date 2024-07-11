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

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;
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
app.post('/api/submit-form', checkSubmissionRateLimit, upload.array('screenshots', 10), (req, res) => {
    const { subject, detail } = req.body;
    const screenshotFiles = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const filePath = path.join(__dirname, 'queries.json');
    let data = [];
    try {
        data = require(filePath);
    } catch (err) {
        console.error('Error loading data file:', err);
    }

    const newRequest = {
        id: generateUniqueId(), // Use the new ID generator
        user: "anonymous",
        timestamp: new Date().toISOString(),
        subject,
        detail,
        screenshots: screenshotFiles,
        status: "Open",
        resolvement: ""
    };

    data.push(newRequest);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ message: 'Form submitted successfully!' });
});

// API endpoint to get all queries
app.get('/api/queries', (req, res) => {
    const filePath = path.join(__dirname, 'queries.json');
    let data = [];
    try {
        data = require(filePath);
        // Sort queries by timestamp from most recent to least recent
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (err) {
        console.error('Error loading data file:', err);
    }
    res.json(data);
});

app.post('/api/update-query/:id', (req, res) => {
    const { id } = req.params;
    const { status, resolvement, engineer } = req.body;  // Add engineer here to be updated
  
    const filePath = path.join(__dirname, 'queries.json');
    let data = [];
  
    try {
        data = require(filePath);
        const queryIndex = data.findIndex(q => q.id === id);
        if(queryIndex !== -1) {
            data[queryIndex].status = status;
            data[queryIndex].resolvement = resolvement;  // Ensure this is updated
            data[queryIndex].engineer = engineer;  // Update engineer in the data
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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
