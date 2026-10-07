import skillLearnContent from "./skill-learn/SKILL.md" with { type: "text" }

export interface StandaloneSkill {
  name: string
  description: string
  content: string
}

export const standaloneSkills: StandaloneSkill[] = [
  {
    name: "skill-learn",
    description:
      "Distill repeated workflows from recent sessions into reusable skills, subagents, or commands",
    content: skillLearnContent,
  },
]
