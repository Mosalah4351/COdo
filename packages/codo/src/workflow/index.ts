/**
 * Workflow — Public API exports for the GSD workflow system.
 */

import { join } from "path"

export * from "./types"
export * as StateParser from "./state-parser"
export * as StateQuery from "./state-query"
export * as StateMachine from "./state-machine"
export * as ContextBudget from "./context-budget"
export * as ContextInjector from "./context-injector"
export * as PromptBuilder from "./prompt-builder"
export * as Verification from "./verification"
export * as Rework from "./rework"
export * as Doctor from "./doctor"

/** Path to the templates directory */
export const templatesDir = join(__dirname, "templates")

/** Path to the prompts directory */
export const promptsDir = join(__dirname, "prompts")

/** List all available template names */
export const templateNames = [
  "roadmap",
  "plan",
  "task-plan",
  "summary",
  "task-summary",
  "context",
  "state",
  "requirements",
  "decisions",
  "knowledge",
  "uat",
] as const

/** List all available prompt names */
export const promptNames = [
  "system",
  "execute-task",
  "plan-milestone",
  "plan-slice",
  "complete-slice",
  "complete-milestone",
  "verify",
] as const