const msal = require('@azure/msal-node');

const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        }
    }
};

const pca = new msal.ConfidentialClientApplication(msalConfig);

const authMiddleware = async (req, res, next) => {
    try {
        if (req.session.tokenCache) {
            pca.getTokenCache().deserialize(req.session.tokenCache);
        }

        if (req.session.account) {
            req.user = req.session.account;
            return next();
        }

        const authCodeUrlParameters = {
            scopes: ["user.read"],
            redirectUri: process.env.AZURE_REDIRECT_URL,  // Use the .env value
        };

        const authCodeUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
        return res.redirect(authCodeUrl);
    } catch (error) {
        console.log("Error in authMiddleware:", error);
        return res.status(500).send('Error in authentication flow');
    }
};

const handleRedirect = async (req, res) => {
    const tokenRequest = {
        code: req.query.code,
        scopes: ["user.read"],
        redirectUri: process.env.AZURE_REDIRECT_URL,  // Use the .env value
    };

    try {
        const response = await pca.acquireTokenByCode(tokenRequest);

        const emailDomain = response.account.username.split('@')[1];
        const authorizedDomains = process.env.AUTHORIZED_DOMAINS.split(',');

        if (!authorizedDomains.includes(emailDomain)) {
            return res.status(403).send('Access Denied: Unauthorized domain');
        }

        req.session.tokenCache = pca.getTokenCache().serialize();
        req.session.account = response.account;

        console.log("Authentication successful, user:", response.account);
        res.redirect('/');
    } catch (error) {
        console.log("Error acquiring token by code:", error);
        res.status(500).send('Error acquiring token');
    }
};

const ensureAuthenticated = (req, res, next) => {
    console.log("Checking authentication for request:", req.url);
    if (req.session.account) {
        console.log("User is authenticated:", req.session.account);
        return next();
    } else {
        console.log("User not authenticated, redirecting to /login");
        return res.redirect('/login');
    }
};

module.exports = {
    authMiddleware,
    handleRedirect,
    ensureAuthenticated
};
