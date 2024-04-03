const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3000;

// Configure Multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files from the public directory
app.use(express.static('public'));

// Endpoint to handle form submission
app.post('/submit-form', upload.single('screenshots'), (req, res) => {
  // Parse the form data
  const { subject, detail } = req.body;
  const screenshotFiles = req.file ? [req.file.filename] : [];

  // Load existing data from the JSON file
  const filePath = path.join(__dirname, 'queries.json');
  let data = [];
  try {
    data = require(filePath);
  } catch (err) {
    console.error('Error loading data file:', err);
  }

  // Create new request object
  const newRequest = {
    id: `req-${Date.now()}`, // Generate a unique ID (in real app, use UUID or some other reliable ID generation)
    user: "user@example.com", // Placeholder for user data, replace with actual user information
    timestamp: new Date().toISOString(),
    subject,
    detail,
    screenshots: screenshotFiles,
    status: "Open",
    resolvement: ""
  };

  // Add new request to the existing data
  data.push(newRequest);

  // Write updated data back to the JSON file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  // Respond to the client
  res.send('Form submitted successfully!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
