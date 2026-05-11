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

  db.run(`
    CREATE TABLE IF NOT EXISTS brick_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      stage INTEGER NOT NULL,
      score INTEGER NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create brick_scores table:', err);
    } else {
      console.log('Brick scores table initialized');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS brick_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT UNIQUE NOT NULL,
      bestStage INTEGER DEFAULT 1,
      bestScore INTEGER DEFAULT 0,
      gamesPlayed INTEGER DEFAULT 0,
      lastPlayDate DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create brick_players table:', err);
    } else {
      console.log('Brick players table initialized');
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

// ===== BRICK BREAKER API =====

// Save brick game score
app.post('/api/brick/scores', (req, res) => {
  const { nickname, stage, score } = req.body;

  if (!nickname || stage === undefined || score === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedName = nickname.toUpperCase().trim();

  db.run(`
    INSERT INTO brick_scores (nickname, stage, score)
    VALUES (?, ?, ?)
  `, [normalizedName, stage, score], function(err) {
    if (err) {
      console.error('Brick score insert error:', err);
      return res.status(500).json({ error: 'Failed to save brick score' });
    }

    // Update or insert brick player info
    db.run(`
      INSERT INTO brick_players (nickname, bestStage, bestScore, gamesPlayed)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(nickname) DO UPDATE SET
        bestStage = MAX(bestStage, ?),
        bestScore = CASE
          WHEN ? > bestStage THEN ?
          WHEN ? = bestStage AND ? > bestScore THEN ?
          ELSE bestScore
        END,
        gamesPlayed = gamesPlayed + 1,
        lastPlayDate = CURRENT_TIMESTAMP
    `, [normalizedName, stage, score, stage, stage, score, stage, score, score], (err) => {
      if (err) {
        console.error('Brick player update error:', err);
        return res.status(500).json({ error: 'Failed to update brick player' });
      }

      // Get current rank
      db.get(`
        SELECT COUNT(*) as rank FROM brick_players
        WHERE bestStage > ? OR (bestStage = ? AND bestScore > ?)
      `, [stage, stage, score], (err, rankData) => {
        if (err) {
          return res.json({ success: true, stage, score });
        }
        const rank = (rankData?.rank || 0) + 1;
        res.json({ success: true, stage, score, rank });
      });
    });
  });
});

// Get brick game rankings
app.get('/api/brick/rankings', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

  db.all(`
    SELECT
      nickname,
      bestStage as stage,
      bestScore as score,
      gamesPlayed as games
    FROM brick_players
    ORDER BY bestStage DESC, bestScore DESC
    LIMIT ?
  `, [limit], (err, rows) => {
    if (err) {
      console.error('Brick rankings query error:', err);
      return res.status(500).json({ error: 'Failed to fetch brick rankings' });
    }

    const rankings = (rows || []).map((row, idx) => ({
      rank: idx + 1,
      name: row.nickname,
      stage: row.stage,
      score: row.score,
      games: row.games
    }));

    res.json(rankings);
  });
});

// Get brick player details
app.get('/api/brick/player/:nickname', (req, res) => {
  const nickname = req.params.nickname.toUpperCase().trim();

  db.get(`
    SELECT
      nickname,
      bestStage,
      bestScore,
      gamesPlayed
    FROM brick_players
    WHERE nickname = ?
  `, [nickname], (err, player) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch brick player' });
    }

    if (!player) {
      return res.status(404).json({ error: 'Brick player not found' });
    }

    // Get recent scores
    db.all(`
      SELECT stage, score, date
      FROM brick_scores
      WHERE nickname = ?
      ORDER BY date DESC
      LIMIT 10
    `, [nickname], (err, scores) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch scores' });
      }

      // Get rank
      db.get(`
        SELECT COUNT(*) as rank FROM brick_players
        WHERE bestStage > ? OR (bestStage = ? AND bestScore > ?)
      `, [player.bestStage, player.bestStage, player.bestScore], (err, rankData) => {
        const rank = (rankData?.rank || 0) + 1;

        res.json({
          nickname: player.nickname,
          bestStage: player.bestStage,
          bestScore: player.bestScore,
          gamesPlayed: player.gamesPlayed,
          rank,
          recentScores: scores || []
        });
      });
    });
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
  console.log(`   POST   /api/scores              - Save tennis game score`);
  console.log(`   GET    /api/rankings            - Get tennis rankings`);
  console.log(`   GET    /api/player/:name        - Get tennis player details`);
  console.log(`   GET    /api/top3                - Get top 3 tennis players`);
  console.log(`   POST   /api/brick/scores        - Save brick game score`);
  console.log(`   GET    /api/brick/rankings      - Get brick rankings`);
  console.log(`   GET    /api/brick/player/:name  - Get brick player details`);
  console.log(`   GET    /api/health              - Health check\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close();
  process.exit(0);
});
