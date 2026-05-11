import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./scores.db', (err) => {
  if (err) {
    console.error('DB error:', err);
    process.exit(1);
  }
});

const nickname = '해현2';

db.run('DELETE FROM scores WHERE nickname = ?', [nickname], (err) => {
  if (err) {
    console.error('Delete scores error:', err);
  } else {
    console.log('Deleted from scores table');
  }
  
  db.run('DELETE FROM players WHERE nickname = ?', [nickname], (err) => {
    if (err) {
      console.error('Delete players error:', err);
    } else {
      console.log(`"${nickname}" deleted from database`);
    }
    
    db.all('SELECT nickname, bestScore, gamesPlayed FROM players ORDER BY bestScore DESC', (err, rows) => {
      console.log('\n=== Updated Rankings ===');
      rows?.forEach((r, i) => {
        console.log(`${i+1}. ${r.nickname} - ${r.bestScore} (${r.gamesPlayed} games)`);
      });
      db.close();
      process.exit(0);
    });
  });
});
