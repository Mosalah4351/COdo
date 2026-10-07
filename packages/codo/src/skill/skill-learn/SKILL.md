---
name: skill-learn
description: "Distill repeated workflows from recent sessions into reusable assets - skills, custom subagents, or commands. Use when the user invokes /skill-learn or asks to 'learn my workflows', 'turn what I keep doing into skills', 'package my repeated work', or 'distill sessions into automation'. Reviews recent session history, finds genuinely repeated procedures, and creates only high-confidence assets. Creating nothing is a valid outcome."
hidden: true
---

# Skill-Learn: Workflow Distillation

You look back over recent work, identify repeated manual workflows worth
packaging, and turn only the high-confidence ones into reusable assets:
skills, custom subagents, or commands.

Default window: review the last 30 days of sessions, or all available history
if shorter.

This command is manual. The user intentionally started it and is watching.
You have bash access for inspection and SQLite queries, but use it carefully.
Read-only against the database at all times.

## Ground Rules

- Raw session trajectory is authoritative; notes and planning files are a
  structured index/cache over it.
- Prefer read-only bash commands for discovery and SQLite queries.
- Do not modify any database.
- Look broadly for work that is repeated, time-consuming, error-prone,
  context-heavy, or that benefits from a consistent process - across coding,
  research, writing, planning, communication, operations, and analysis.
- Default to a compact shortlist and recommendations. Create an asset only when
  the evidence is very strong and the smallest useful form is obvious.
- Do not create speculative, overlapping, or overly broad assets.
- If nothing has actually been repeated, create nothing. Doing zero packaging is
  a valid and expected outcome; say so in the summary rather than manufacturing
  an asset to justify the run.

## Phase 0 - Locate Data

1. Locate the COdo databases (read-only):
   - Default data root: `~/.local/share/codo/` (Windows:
     `%USERPROFILE%\\.local\\share\\codo\\`).
   - `codo.db` is the default instance database; `codo-local.db` holds
     project-local instance data. Inspect whichever exists and has recent rows.
2. Use Glob/Read on project memory and planning files: `.planning/**/*.md`,
   `NOTES.md`, `README.md`, `.agents/skills/**/SKILL.md`.
3. If there is no recent activity at all, report "Nothing to distill - no
   recent workflows found" and stop.

## Phase 1 - Inventory Existing Assets

Before proposing anything, know what already exists so you reuse or extend
rather than duplicate.

- Skills: Glob `{skill,skills}/**/SKILL.md` under the project `.agents/` dir,
  the repo's built-in sources if inspecting COdo itself, and home dirs
  (`.agents/skills/`, `~/.agents/skills/`, `.claude/skills/`). Read each one's
  name + description.
- Custom commands and agents: Glob under the project `.codo/` config dir and
  `~/.config/codo/`.
- Plugins: Glob `.codo/plugin*/**` for existing automation hooks.

Record what each asset already covers. A candidate an existing asset already
handles is an "extend existing" or "skip", not a new asset.

## Phase 2 - Discover Repeated Workflows From Notes

Scan planning/memory artifacts for repeated procedures:

1. `.planning/` phase docs: recurring task shapes, repeated command sequences,
   repeated debugging or setup steps.
2. Session summaries/titles in the DB: recurring topics and task types.
3. Explicitly noted patterns: README/NOTES "always do X" statements.

Prefer recent and repeated signals over exhaustive reading.

## Phase 3 - Confirm Against Raw Trajectory

Use bash with SQLite read-only queries to confirm candidates against what
actually happened. First run `.schema` (or query `sqlite_master`) and adapt -
then use tables roughly like:

- `session`: id/directory/title/time metadata.
- `message`(id, session_id, time_created, data JSON with `$.role`)
- `part`(id, message_id, session_id, time_created, data JSON)

Part data shapes include `{"type":"text","text":"..."}` and
`{"type":"tool","tool":"...","state":{"input":...}}`.

Query template - repeated tool usage across recent sessions:

```sql
SELECT json_extract(p.data, '$.tool') as tool,
       substr(json_extract(p.data, '$.state.input'), 1, 200) as input_preview,
       count(*) as n
FROM message m
JOIN part p ON p.message_id = m.id
WHERE json_extract(m.data, '$.role') = 'assistant'
  AND json_extract(p.data, '$.type') = 'tool'
  AND m.time_created > <CUTOFF_MS>
GROUP BY tool, input_preview
ORDER BY n DESC
LIMIT 50;
```

Useful searches in user turns: "again", "every time", "like last time",
"the usual", "repeat", "same as before". Also look for repeated command
sequences, repeated file paths, and repeated error/fix cycles.

A candidate is only real when it occurred at least twice, or is clearly likely
to recur and costly to repeat.

## Phase 4 - Shortlist

For each candidate include:

- repeated workflow (one line)
- supporting evidence and dates (cite session ids)
- frequency / confidence
- recommended form: skill, subagent, command, extend existing, or skip
- why it is or is not worth creating

Only keep a candidate for action when it:

- occurred at least twice, or is clearly likely to recur and costly to repeat;
- has stable inputs, a repeatable procedure, and a clear output or stopping
  condition;
- would materially improve speed, quality, consistency, or reliability;
- is not already adequately covered by an existing asset.

## Phase 5 - Choose The Smallest Form

For each high-confidence candidate, pick the smallest appropriate form:

- **Skill** - a reusable workflow or playbook. Write `SKILL.md` with YAML
  frontmatter (`name`, `description`) under the project `.agents/skills/<name>/
  ` directory (or `~/.agents/skills/<name>/` if the user asked for global).
  Focused, imperative description so it is discoverable.
- **Custom subagent** - a bounded specialist role suitable for delegation.
  Write the agent markdown with frontmatter (`description`, optional `model`,
  `tools`/permission) and the system prompt as body, under the COdo config
  agents directory.
- **Command** - a parameterized prompt for a recurring task. Write a command
  markdown with frontmatter (`description`) and a template body using
  `$ARGUMENTS`, under the COdo config commands directory.
- **Extend existing** - edit the existing skill/agent/command rather than
  adding a near-duplicate.
- **Skip** - too one-off, ambiguous, sensitive, or poorly evidenced.

COdo has no built-in scheduler. Package recurring work as a command the user
can re-run. Do not invent a scheduler.

## Phase 6 - Create And Validate

Create only the high-confidence missing items. Keep them narrow, practical,
and easy to validate.

- Write to the project directories unless the user asked for global scope.
- Match the structure of comparable assets already present.
- Keep each asset focused on one workflow with a clear stopping condition.
- After writing, verify referenced file paths exist (Glob) and referenced
  function/class names exist (Grep).
- Do not create accounts, send messages, change permissions, or take any
  irreversible external action; assets only describe procedures.

## Output Format

Return a brief summary:

- Shortlist: candidates considered, with evidence, frequency/confidence, and
  recommended form.
- Created or extended: assets written, with paths and one-line purpose. If
  nothing met the bar, say "Created nothing - no repeated workflow worth
  packaging" - that is a complete, successful result.
- Skipped: what you deliberately did not package, and why.
- Needs more evidence: promising candidates lacking repetition, stable inputs,
  or a clear stopping condition.
