const Database = require("bun:sqlite").Database;
const db = Database.open("C:/Users/mosal/.local/share/mimocode/mimocode.db", { readonly: true });

const sessions = db.query(
  "SELECT id, directory, title, time_created FROM session WHERE title NOT LIKE 'checkpoint-writer:%' AND title NOT LIKE 'Auto Dream%' ORDER BY time_created DESC LIMIT 10"
).all();
console.log("=== USER SESSIONS ===");
console.log(JSON.stringify(sessions, null, 2));

// Also check the most recent 5 sessions (including checkpoint writers) for user messages
const recent = db.query(
  "SELECT id, time_created FROM session ORDER BY time_created DESC LIMIT 5"
).all();
console.log("\n=== RECENT SESSION IDS ===");
for (const s of recent) {
  const msgCount = db.query(
    "SELECT COUNT(*) as cnt FROM message WHERE session_id = ? AND json_extract(data, '$.role') = 'user'"
  ).get(s.id);
  console.log(`${s.id}: ${msgCount.cnt} user messages`);
}
