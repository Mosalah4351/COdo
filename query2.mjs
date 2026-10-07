const Database = require("bun:sqlite").Database;
const db = Database.open("C:/Users/mosal/.local/share/mimocode/mimocode.db", { readonly: true });

// Check message schema
const sample = db.query(
  "SELECT id, session_id, data FROM message WHERE json_extract(data, '$.role') = 'user' ORDER BY time_created DESC LIMIT 5"
).all();
console.log("=== RECENT USER MESSAGES ===");
for (const s of sample) {
  console.log(`\n[${s.session_id}] id=${s.id}`);
  console.log(s.data.substring(0, 800));
  console.log("---");
}
