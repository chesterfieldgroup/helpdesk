const express = require('express');
const session = require('express-session');
const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// In-memory user store
const users = [];

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

// Passport Azure AD configuration
passport.use(new OIDCStrategy({
    identityMetadata: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    responseType: 'code',
    responseMode: 'query',
    redirectUrl: 'http://localhost:3000/auth/openid/return',
    allowHttpForRedirectUrl: true,
    validateIssuer: false,
    passReqToCallback: false,
    scope: ['profile', 'offline_access', 'https://graph.microsoft.com/mail.read']
},
function(iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.oid) {
        return done(new Error("No OID found in user profile."));
    }
    process.nextTick(function () {
        let user = users.find(u => u.oid === profile.oid);
        if (!user) {
            user = profile;
            users.push(user);
        }
        return done(null, user);
    });
}));

passport.serializeUser((user, done) => {
    done(null, user.oid);
});

passport.deserializeUser((oid, done) => {
    const user = users.find(u => u.oid === oid);
    done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

// Configure Multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/openid');
}

// Middleware to check if user is an admin
function ensureAdmin(req, res, next) {
    const allowedAdmins = process.env.ALLOWED_ADMINS.split(',');
    if (req.isAuthenticated() && allowedAdmins.includes(req.user._json.preferred_username)) {
        return next();
    }
    res.redirect('/');
}

// Public route to serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Protected route to serve the admin page
app.get('/admin', ensureAuthenticated, ensureAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Endpoint to handle form submission
app.post('/submit-form', upload.single('screenshots'), (req, res) => {
    const { subject, detail } = req.body;
    const screenshotFiles = req.file ? [req.file.filename] : [];

    const filePath = path.join(__dirname, 'queries.json');
    let data = [];
    try {
        data = require(filePath);
    } catch (err) {
        console.error('Error loading data file:', err);
    }

    const newRequest = {
        id: `req-${Date.now()}`,
        user: req.user._json.preferred_username,
        timestamp: new Date().toISOString(),
        subject,
        detail,
        screenshots: screenshotFiles,
        status: "Open",
        resolvement: ""
    };

    data.push(newRequest);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.send('Form submitted successfully!');
});

// Microsoft OAuth login route
app.get('/auth/openid', passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }));

// Microsoft OAuth callback route
app.get('/auth/openid/return',
  passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Logout route
app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});