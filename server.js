// server.js
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const generateUniqueId = require('./public/js/idGenerator');
const auth = require('./public/js/auth');
//const { connectToDatabase, executeQuery } = require('./sql');
const app = express();
const port = 3000;
const hostname = 'localhost';

// Get the list of admin users from the .env file
const adminUsers = process.env.ADMIN_EMAILS.split(',');

// Connect to the database
//connectToDatabase().catch(err => console.error('Database connection failed:', err));

app.use(express.json());
app.use(bodyParser.json());

// Logging middleware for every request
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret_key',  // Provide a default secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false}  // Set to true if using HTTPS
}));

// Middleware to check if the user is an admin
const ensureAdmin = (req, res, next) => {
    if (req.session.account && adminUsers.includes(req.session.account.username)) {
        return next();
    } else {
        return res.status(403).send('Access Denied: You do not have permission to view this page.');
    }
};

// In-memory store to track last submission time (for rate limiting form submissions)
const lastSubmissionTime = {};

// Middleware to check submission rate limit
function checkSubmissionRateLimit(req, res, next) {
    const userIP = req.ip; // Using IP address as identifier for simplicity
    
    const now = Date.now();
    if (lastSubmissionTime[userIP] && (now - lastSubmissionTime[userIP] < 5 * 60 * 1000)) {
        res.status(429).json({ success: false, message: 'You can only submit one query every 5 minutes.' });
    } else {
        lastSubmissionTime[userIP] = now;
        next();
    }
}

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

// Serve static files from the public directory (protected)
app.use('/public', auth.ensureAuthenticated, express.static(path.join(__dirname, 'public')));

// Serve files from the uploads directory (protected)
app.use('/uploads', auth.ensureAuthenticated, express.static(path.join(__dirname, 'uploads')));

// Public route to serve the login page
app.get('/login', auth.authMiddleware);  // This should start the authentication process

app.get('/auth/redirect', auth.handleRedirect);

// Protect all other routes with authentication middleware
app.get('/', auth.ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'index.html'));
});

// Route to serve the FAQ page
app.get('/FAQ', auth.ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'FAQ.html'));
});

// Check if the authenticated user is an admin
app.get('/api/is-admin', auth.ensureAuthenticated, (req, res) => {
    const isAdmin = adminUsers.includes(req.session.account.username);
    res.json({ isAdmin });
});

// Route to serve the admin page (protected)
app.get('/admin', auth.ensureAuthenticated, ensureAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'admin.html'));
});

// API endpoint to handle form submission (protected)
app.post('/api/submit-form', auth.ensureAuthenticated, checkSubmissionRateLimit, upload.array('screenshots', 10), (req, res) => {
    const { subject, detail } = req.body;
    const screenshotFiles = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const filePath = path.join(__dirname, 'queries.json');
    let data = [];
    try {
        if (!subject || !detail) {
            throw new Error('Subject and detail are required fields.');
        }
        data = fs.existsSync(filePath) ? require(filePath) : [];

        const newRequest = {
            id: generateUniqueId(),
            user: req.session.account ? req.session.account.username : "anonymous",
            timestamp: new Date().toISOString(),
            subject,
            detail,
            screenshots: screenshotFiles,
            status: "Open",
            resolvement: ""
        };

        data.push(newRequest);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        res.status(200).json({ success: true, message: 'Form submitted successfully!' });
    } catch (err) {
        console.error('Error handling form submission:', err);
        res.status(400).json({ success: false, message: err.message || 'Failed to process form submission.' });
    }
});

// SQL Example route to execute a query
//app.get('/api/get-data', async (req, res) => {
//    try {
//        const data = await executeQuery('SELECT * FROM your_table'); // Replace 'your_table' with the actual table name
//        res.json(data);
//    } catch (err) {
//        res.status(500).json({ error: 'Database query failed' });
//    }
//});

// API endpoint to get all queries (protected)
app.get('/api/queries', auth.ensureAuthenticated, (req, res) => {
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

// API endpoint to update a query (protected)
app.post('/api/update-query/:id', auth.ensureAuthenticated, (req, res) => {
    const { id } = req.params;
    const { status, resolvement, engineer } = req.body;

    const filePath = path.join(__dirname, 'queries.json');
    let data = [];

    try {
        data = require(filePath);
        const queryIndex = data.findIndex(q => q.id === id);
        if (queryIndex !== -1) {
            data[queryIndex].status = status;
            data[queryIndex].resolvement = resolvement;
            data[queryIndex].engineer = engineer;
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

// Start the server
app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});