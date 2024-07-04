const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

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
const upload = multer({ dest: 'uploads/' });

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
app.post('/api/submit-form', checkSubmissionRateLimit, upload.single('screenshots'), (req, res) => {
    const { subject, detail } = req.body;
    const screenshotFiles = req.file ? [`/uploads/${req.file.filename}`] : [];

    const filePath = path.join(__dirname, 'queries.json');
    let data = [];
    try {
        data = require(filePath);
    } catch (err) {
        console.error('Error loading data file:', err);
    }

    const newRequest = {
        id: `req-${Date.now()}`,
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
    } catch (err) {
        console.error('Error loading data file:', err);
    }
    res.json(data);
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
