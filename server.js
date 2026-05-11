import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: '*',  // 모든 오리진 허용
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(__dirname));

// Database initialization
const db = new sqlite3.Database(path.join(__dirname, 'scores.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      score INTEGER NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      totalHits INTEGER DEFAULT 0,
      maxCombo INTEGER DEFAULT 0,
      maxBallSpeed REAL DEFAULT 0,
      avgBallSpeed REAL DEFAULT 0,
      accuracy INTEGER DEFAULT 0,
      gameTime INTEGER DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create scores table:', err);
    } else {
      console.log('Scores table initialized');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT UNIQUE NOT NULL,
      bestScore INTEGER DEFAULT 0,
      gamesPlayed INTEGER DEFAULT 0,
      totalScore INTEGER DEFAULT 0,
      lastPlayDate DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create players table:', err);
    } else {
      console.log('Players table initialized');
    }
  });
}

// ===== API Routes =====

// Save score
app.post('/api/scores', (req, res) => {
  const { nickname, score, stats } = req.body;

  if (!nickname || score === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedName = nickname.toUpperCase().trim();

  db.run(`
    INSERT INTO scores (nickname, score, totalHits, maxCombo, maxBallSpeed, avgBallSpeed, accuracy, gameTime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    normalizedName,
    score,
    stats?.totalHits || 0,
    stats?.maxCombo || 0,
    stats?.maxBallSpeed || 0,
    stats?.avgBallSpeed || 0,
    stats?.accuracy || 0,
    stats?.gameTime || 0
  ], function(err) {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).json({ error: 'Failed to save score' });
    }

    // Update or insert player info
    db.run(`
      INSERT INTO players (nickname, bestScore, gamesPlayed, totalScore)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(nickname) DO UPDATE SET
        bestScore = MAX(bestScore, ?),
        gamesPlayed = gamesPlayed + 1,
        totalScore = totalScore + ?,
        lastPlayDate = CURRENT_TIMESTAMP
    `, [normalizedName, score, score, score, score], (err) => {
      if (err) {
        console.error('Player update error:', err);
        return res.status(500).json({ error: 'Failed to update player' });
      }

      // Get current rank
      db.get(`
        SELECT COUNT(*) as rank FROM players WHERE bestScore > ?
      `, [score], (err, rankData) => {
        if (err) {
          return res.json({ success: true, score });
        }
        const rank = (rankData?.rank || 0) + 1;
        res.json({ success: true, score, rank });
      });
    });
  });
});

// Get global rankings
app.get('/api/rankings', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

  db.all(`
    SELECT
      nickname,
      bestScore as score,
      gamesPlayed as games,
      ROUND(totalScore / gamesPlayed, 0) as avgScore
    FROM players
    ORDER BY bestScore DESC
    LIMIT ?
  `, [limit], (err, rows) => {
    if (err) {
      console.error('Rankings query error:', err);
      return res.status(500).json({ error: 'Failed to fetch rankings' });
    }

    const rankings = (rows || []).map((row, idx) => ({
      rank: idx + 1,
      name: row.nickname,
      score: row.score,
      games: row.games,
      avgScore: row.avgScore
    }));

    res.json(rankings);
  });
});

// Get player details
app.get('/api/player/:nickname', (req, res) => {
  const nickname = req.params.nickname.toUpperCase().trim();

  db.get(`
    SELECT
      nickname,
      bestScore,
      gamesPlayed,
      totalScore,
      ROUND(totalScore / gamesPlayed, 0) as avgScore
    FROM players
    WHERE nickname = ?
  `, [nickname], (err, player) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch player' });
    }

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get recent scores
    db.all(`
      SELECT score, totalHits, maxCombo, maxBallSpeed, accuracy, date
      FROM scores
      WHERE nickname = ?
      ORDER BY date DESC
      LIMIT 10
    `, [nickname], (err, scores) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch scores' });
      }

      // Get rank
      db.get(`
        SELECT COUNT(*) as rank FROM players WHERE bestScore > ?
      `, [player.bestScore], (err, rankData) => {
        const rank = (rankData?.rank || 0) + 1;

        res.json({
          nickname: player.nickname,
          bestScore: player.bestScore,
          gamesPlayed: player.gamesPlayed,
          avgScore: player.avgScore,
          rank,
          recentScores: scores || []
        });
      });
    });
  });
});

// Get top 3 players
app.get('/api/top3', (req, res) => {
  db.all(`
    SELECT
      nickname,
      bestScore as score,
      gamesPlayed as games
    FROM players
    ORDER BY bestScore DESC
    LIMIT 3
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch top 3' });
    }

    const top3 = (rows || []).map((row, idx) => ({
      rank: idx + 1,
      name: row.nickname,
      score: row.score,
      games: row.games
    }));

    res.json(top3);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🎾 WAMUSE Tennis Server running on http://localhost:${PORT}`);
  console.log(`📊 API Documentation:`);
  console.log(`   POST   /api/scores         - Save game score`);
  console.log(`   GET    /api/rankings       - Get global rankings`);
  console.log(`   GET    /api/player/:name   - Get player details`);
  console.log(`   GET    /api/top3           - Get top 3 players`);
  console.log(`   GET    /api/health         - Health check\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close();
  process.exit(0);
});
