import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260807123904_security_finding",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE \`security_finding\` (
          \`id\` text PRIMARY KEY,
          \`persona\` text NOT NULL,
          \`category\` text NOT NULL,
          \`location\` text NOT NULL,
          \`confidence\` text NOT NULL,
          \`severity\` text NOT NULL,
          \`finding\` text NOT NULL,
          \`evidence\` text NOT NULL,
          \`remediation\` text NOT NULL,
          \`status\` text DEFAULT 'open' NOT NULL,
          \`cvss_score\` real,
          \`cvss_vector\` text,
          \`epss_score\` real,
          \`fingerprint\` text NOT NULL,
          \`project_id\` text NOT NULL,
          \`session_id\` text,
          \`metadata\` text,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          \`time_status_changed\` integer,
          CONSTRAINT \`fk_security_finding_project_id_project_id_fk\` FOREIGN KEY (\`project_id\`) REFERENCES \`project\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_security_finding_session_id_session_id_fk\` FOREIGN KEY (\`session_id\`) REFERENCES \`session\`(\`id\`) ON DELETE SET NULL
        );
      `)
      yield* tx.run(`CREATE INDEX \`security_finding_project_idx\` ON \`security_finding\` (\`project_id\`);`)
      yield* tx.run(`CREATE INDEX \`security_finding_session_idx\` ON \`security_finding\` (\`session_id\`);`)
      yield* tx.run(`CREATE INDEX \`security_finding_status_idx\` ON \`security_finding\` (\`status\`);`)
      yield* tx.run(`CREATE INDEX \`security_finding_severity_idx\` ON \`security_finding\` (\`severity\`);`)
      yield* tx.run(`CREATE INDEX \`security_finding_persona_idx\` ON \`security_finding\` (\`persona\`);`)
      yield* tx.run(`CREATE UNIQUE INDEX \`security_finding_fingerprint_project_idx\` ON \`security_finding\` (\`project_id\`,\`fingerprint\`);`)
    })
  },
} satisfies DatabaseMigration.Migration
