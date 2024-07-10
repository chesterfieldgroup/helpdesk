const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const scoresFilePath = path.join(__dirname, 'scores.json');

// Ensure the scores file exists
if (!fs.existsSync(scoresFilePath)) {
  fs.writeFileSync(scoresFilePath, JSON.stringify([]));
}

// Endpoint to get leaderboard
router.get('/leaderboard', (req, res) => {
  fs.readFile(scoresFilePath, (err, data) => {
    if (err) {
      return res.status(500).send('Error reading scores');
    }
    const scores = JSON.parse(data);
    res.json(scores);
  });
});

// Endpoint to submit score
router.post('/submit-score', (req, res) => {
  const newScore = req.body;

  fs.readFile(scoresFilePath, (err, data) => {
    if (err) {
      return res.status(500).send('Error reading scores');
    }
    const scores = JSON.parse(data);
    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 10);

    fs.writeFile(scoresFilePath, JSON.stringify(topScores, null, 2), (err) => {
      if (err) {
        return res.status(500).send('Error saving scores');
      }
      res.status(201).send('Score submitted successfully');
    });
  });
});

module.exports = router;
