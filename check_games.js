import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./scores.db');

db.all(`
  SELECT 
    nickname, 
    gamesPlayed, 
    bestScore,
    totalScore,
    ROUND(totalScore / gamesPlayed, 1) as avgScore
  FROM players 
  ORDER BY gamesPlayed DESC
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('\n=== 게임 참여 통계 ===\n');
    rows?.forEach((r, i) => {
      console.log(`${i+1}. ${r.nickname}`);
      console.log(`   - 게임 횟수: ${r.gamesPlayed}회`);
      console.log(`   - 최고 점수: ${r.bestScore}`);
      console.log(`   - 평균 점수: ${r.avgScore}`);
      console.log();
    });
  }
  db.close();
});
