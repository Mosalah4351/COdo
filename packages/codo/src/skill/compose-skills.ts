import askContent from "./compose/ask/SKILL.md" with { type: "text" }
import brainstormContent from "./compose/brainstorm/SKILL.md" with { type: "text" }
import debugContent from "./compose/debug/SKILL.md" with { type: "text" }
import executeContent from "./compose/execute/SKILL.md" with { type: "text" }
import feedbackContent from "./compose/feedback/SKILL.md" with { type: "text" }
import mergeContent from "./compose/merge/SKILL.md" with { type: "text" }
import newSkillContent from "./compose/new-skill/SKILL.md" with { type: "text" }
import parallelContent from "./compose/parallel/SKILL.md" with { type: "text" }
import planContent from "./compose/plan/SKILL.md" with { type: "text" }
import reportContent from "./compose/report/SKILL.md" with { type: "text" }
import reviewContent from "./compose/review/SKILL.md" with { type: "text" }
import selfExtendContent from "./compose/self-extend/SKILL.md" with { type: "text" }
import subagentContent from "./compose/subagent/SKILL.md" with { type: "text" }
import tddContent from "./compose/tdd/SKILL.md" with { type: "text" }
import verifyContent from "./compose/verify/SKILL.md" with { type: "text" }
import worktreeContent from "./compose/worktree/SKILL.md" with { type: "text" }

export interface ComposeSkill {
  name: string
  description: string
  content: string
}

export const composeSkills: ComposeSkill[] = [
  { name: "compose:ask", description: "Use whenever you need a decision, clarification, or approval from the user", content: askContent },
  { name: "compose:brainstorm", description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior", content: brainstormContent },
  { name: "compose:debug", description: "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes", content: debugContent },
  { name: "compose:execute", description: "Use when you have a written implementation plan to execute in a separate session with review checkpoints", content: executeContent },
  { name: "compose:feedback", description: "Use when receiving code review feedback, before implementing suggestions", content: feedbackContent },
  { name: "compose:merge", description: "Use when implementation is complete, all tests pass, and you need to decide how to integrate the work", content: mergeContent },
  { name: "compose:new-skill", description: "Use when creating new skills, editing existing skills, or verifying skills work before deployment", content: newSkillContent },
  { name: "compose:parallel", description: "Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies", content: parallelContent },
  { name: "compose:plan", description: "Use when you have a spec or requirements for a multi-step task, before touching code", content: planContent },
  { name: "compose:report", description: "Use after implementation is verified and before merge — consolidates multiple spec iterations into a single final-state report", content: reportContent },
  { name: "compose:review", description: "Use when completing tasks, implementing major features, or before merging to verify work meets requirements", content: reviewContent },
  { name: "self-extend", description: "Use when you want to evolve your own capabilities — create new tools, hooks, skills, or override built-in tools", content: selfExtendContent },
  { name: "compose:subagent", description: "Use when executing implementation plans with independent tasks in the current session", content: subagentContent },
  { name: "compose:tdd", description: "Use when implementing any feature or bugfix, before writing implementation code", content: tddContent },
  { name: "compose:verify", description: "Use when about to claim work is complete, fixed, or passing, before committing or creating PRs", content: verifyContent },
  { name: "compose:worktree", description: "Use when starting feature work that needs isolation from current workspace or before executing implementation plans", content: worktreeContent },
]

export const COMPOSE_SKILL_NAMES = new Set(composeSkills.map((s) => s.name))

export function isComposeSkill(name: string): boolean {
  return name.startsWith("compose:") || name === "self-extend"
}
