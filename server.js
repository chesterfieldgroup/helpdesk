const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const mime = require('mime');
const multer = require('multer');
const fs = require('fs');
const generateUniqueId = require('./public/js/idGenerator');
const auth = require('./public/js/auth');
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const { Server } = require('socket.io');

const app = express();
const port = 3000;
const hostname = 'localhost';
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'dist')));

// Set up Azure AD credentials using the Client Secret
const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,      // Your Tenant ID
    process.env.AZURE_CLIENT_ID,      // Your Client ID
    process.env.AZURE_CLIENT_SECRET   // Your Client Secret
);

// Create Microsoft Graph Client
const graphClient = Client.initWithMiddleware({
    authProvider: {
        getAccessToken: async () => {
            const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
            return tokenResponse.token;
        }
    }
});

app.use(express.json());
app.use(bodyParser.json());

// Logging middleware for every request
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    max: 300  // allow 300 requests per IP in 5 minutes
});
app.use(limiter);

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret_key',  // Provide a default secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Middleware to check if the user is an admin
const ensureAdmin = (req, res, next) => {
    const adminUsers = process.env.ADMIN_EMAILS.split(',');
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
    const userIP = req.ip;  // Using IP address as identifier for simplicity
    
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
        cb(null, 'uploads/');  // files will be saved in the 'uploads' directory
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Serve static files from the public directory (protected)
app.use('/public', auth.ensureAuthenticated, express.static(path.join(__dirname, 'public')));
app.use('/uploads', auth.ensureAuthenticated, express.static(path.join(__dirname, 'uploads')));

// Public route to serve the login page
app.get('/login', auth.authMiddleware);

// Handle OAuth redirect after login
app.get('/auth/redirect', auth.handleRedirect);

// Serve the home page (index.html) on the root route
app.get('/', auth.ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'index.html'));  // Adjust the path as needed
});

app.get('/api/user-info', auth.ensureAuthenticated, (req, res) => {
    const name = req.session.account.idTokenClaims.name;  // Access the name from Azure claims
    res.json({ name: name });
});

// Serve the ticket logging page (ticket.html) on the /ticket route
app.get('/ticket', auth.ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'ticket.html'));
});

// Route to serve the FAQ page
app.get('/IT-FAQ', auth.ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/IT-FAQ.html'));
});

// Check if the authenticated user is an admin
app.get('/api/is-admin', auth.ensureAuthenticated, (req, res) => {
    const isAdmin = process.env.ADMIN_EMAILS.split(',').includes(req.session.account.username);
    res.json({ isAdmin });
});

app.get('/api/queries', (req, res) => {
    const filePath = path.join(__dirname, 'queries.json');
    try {
        // Read file contents each time to avoid caching
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // Sort queries by timestamp from most recent to least recent
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(data);
    } catch (err) {
        console.error('Error loading data file:', err);
        res.status(500).json({ success: false, message: 'Failed to load queries.' });
    }
});


// Route to serve the admin page (protected)
app.get('/admin', auth.ensureAuthenticated, ensureAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/admin.html'));
});

app.get('/test', auth.ensureAuthenticated, ensureAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/test.html'));
});

// Route to serve the contact cards page
app.get('/contact-book', auth.ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/contact-book.html'));
});

// Serve the user ticket view page
app.get('/user-tickets', auth.ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages', 'user-tickets.html'));  // Adjust path if needed
});

// API route to fetch the user's tickets
app.get('/api/user-tickets', auth.ensureAuthenticated, (req, res) => {
    console.log('API Route /api/user-tickets hit');  // Add this at the very start!

    res.set('Cache-Control', 'no-store');  // Disable caching

    const userEmail = req.session.account.username;  // Get the user's email from the session
    console.log('User email:', userEmail);  // Debugging log

    const filePath = path.join(__dirname, 'queries.json');
    let data = [];
    try {
        data = require(filePath);
        const userTickets = data.filter(ticket => ticket.user === userEmail);
        console.log('User tickets:', userTickets);  // Debugging log
        res.json(userTickets);
    } catch (err) {
        console.error('Error loading user tickets:', err);
        res.status(500).json({ success: false, message: 'Failed to load tickets.' });
    }
});

// API route to update a ticket
app.post('/api/update-ticket/:id', auth.ensureAuthenticated, (req, res) => {
    const { id } = req.params;
    const updatedTicket = req.body;  // Get the updated ticket data from the request body

    const filePath = path.join(__dirname, 'queries.json');
    let tickets = require(filePath);

    // Find the ticket by ID and update it
    const ticketIndex = tickets.findIndex(ticket => ticket.id === id);
    if (ticketIndex !== -1) {
        tickets[ticketIndex] = { ...tickets[ticketIndex], ...updatedTicket };  // Merge the updates
        fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2));  // Save the updated tickets to file
        res.json({ success: true, message: 'Ticket updated successfully.' });
    } else {
        res.status(404).json({ success: false, message: 'Ticket not found' });
    }
});

// API endpoint to handle form submission (protected)
app.post('/api/submit-form', auth.ensureAuthenticated, checkSubmissionRateLimit, upload.array('screenshots', 10), async (req, res) => {
    console.log('Received fields:', req.body);
console.log('Received files:', req.files);

    const { category, subcategory, detail } = req.body;
    const screenshotFiles = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const userEmail = req.session.account.username;  // Get the user's email from the session

    if (!category || !subcategory || !detail) {
        return res.status(400).json({ success: false, message: 'Category, subcategory, and detail are required fields.' });
    }

    const newRequest = {
        id: generateUniqueId(),
        user: userEmail,
        timestamp: new Date().toISOString(),
        category,
        subcategory,
        detail,
        screenshots: screenshotFiles,
        status: "Open",
        resolvement: ""
    };

    try {
        const filePath = path.join(__dirname, 'queries.json');
        let data = fs.existsSync(filePath) ? require(filePath) : [];
        data.push(newRequest);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        // Prepare the email for the IT support team
        const itSupportMessage = {
            message: {
                subject: `New IT Support Ticket from ${userEmail}`,
                body: {
                    contentType: "Text",
                    content: `A new IT support ticket has been submitted by ${userEmail}.\n\nCategory: ${category}\nSubcategory: ${subcategory}\nDetails: ${detail}\n\nScreenshots: ${screenshotFiles.join(', ')}`
                },
                toRecipients: [{
                    emailAddress: {
                        address: 'it-support@chesterfieldgroup.co.uk'
                    }
                }],
                attachments: screenshotFiles.map(file => ({
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    name: file,
                    contentBytes: fs.readFileSync(path.join(__dirname, file)).toString('base64'),
                    contentType: 'application/octet-stream'
                }))
            }
        };

        const userConfirmationMessage = {
            message: {
            subject: `Your IT Support Ticket has been logged: ${category} - ${subcategory}`,
            body: {
                contentType: "HTML",
                content: `
                    <p>Dear ${userEmail},</p>
                    <p>Thank you for submitting a support request. Here are the details:</p>
                    <p><strong>Category:</strong> ${category}<br>
                    <strong>Subcategory:</strong> ${subcategory}<br>
                    <strong>Details:</strong> ${detail}</p>
                    <p>Your request is now being handled. You will be contacted by a member of the IT Team shortly.</p>
                    <br>
                    <p>Kind regards,</p>
                    <p>Kaufman London IT Support</p>
                    <br>
                    <img src="cid:chesterfieldLogo" alt="H.W. Kaufman Logo" class="logo">
                `
            },
            toRecipients: [{
                emailAddress: {
                    address: userEmail
                }
            }],
            attachments: screenshotFiles.map(file => ({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: file,
                contentBytes: fs.readFileSync(path.join(__dirname, file)).toString('base64'),
                contentType: 'application/octet-stream'
            })).concat([{
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: "kfg-logo-lg.jpg",
                contentBytes: fs.readFileSync(path.join(__dirname, 'public/img/H.W.-Kaufman.jpg')).toString('base64'),
                contentType: 'image/jpeg',
                contentId: "chesterfieldLogo"
            }]),
            internetMessageHeaders: [
                { name: "x-Content-ID", value: "chesterfieldLogo" }
            ]
            }
        };

        const emailMessages = [itSupportMessage, userConfirmationMessage];
        await Promise.all(emailMessages.map(message => 
        graphClient.api(`/users/it-support@chesterfieldgroup.co.uk/sendMail`).post(message)
        ));

        // Respond to the client after both emails are sent
        res.status(200).json({ success: true, message: 'Your ticket has been successfully logged. Wait for a reply from the IT team.' });

    } catch (err) {
        console.error('Error handling form submission:', err);
        res.status(400).json({ success: false, message: err.message || 'Failed to process form submission.' });
    }
});

app.post('/api/update-queries', (req, res) => {
    const updates = req.body.updates;
    const filePath = path.join(__dirname, 'queries.json');

    try {
        let queries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        updates.forEach(update => {
            const queryIndex = queries.findIndex(query => query.id === update.id);
            if (queryIndex !== -1) {
                queries[queryIndex] = update;
            }
        });

        fs.writeFileSync(filePath, JSON.stringify(queries, null, 2));

        // Emit update to all clients through WebSocket
        io.emit('queriesUpdated', queries);
        console.log('Emitting queriesUpdated event');  // Log for debugging

        res.json({ success: true, message: 'All changes saved successfully.' });
    } catch (err) {
        console.error('Error saving updates:', err);
        res.status(500).json({ success: false, message: 'Failed to save changes.' });
    }
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

app.delete('/api/withdraw-ticket/:id', auth.ensureAuthenticated, (req, res) => {
    const { id } = req.params;
    const userEmail = req.session.account.username;  // Get the user's email from the session

    const filePath = path.join(__dirname, 'queries.json');

    console.log('Received request to delete ticket:', id, 'for user:', userEmail); // Log request info

    try {
        // Load existing tickets without caching
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Filter out the ticket with the matching id and user email
        const updatedData = data.filter(ticket => !(ticket.id === id && ticket.user === userEmail));

        if (updatedData.length !== data.length) {
            console.log('Ticket found and deleted. Saving updated data...');
            // Write the updated data back to the file
            fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
            io.emit('ticketWithdrawn', id);  // Notify clients in real-time
            console.log(`Emitting ticketWithdrawn for ticket ID: ${id}`);
            res.json({ success: true, message: 'Ticket successfully withdrawn and deleted.' });
        } else {
            console.log('Ticket not found or not authorized');
            res.status(404).json({ success: false, message: 'Ticket not found or not authorized.' });
        }
    } catch (err) {
        console.error('Error withdrawing ticket:', err);
        res.status(500).json({ success: false, message: 'Failed to withdraw ticket.' });
    }
});



// Start the server
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
