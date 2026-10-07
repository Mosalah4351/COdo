import { useCommand, type CommandOption } from "@/context/command"
import { useLanguage } from "@/context/language"
import { useLocal } from "@/context/local"
import { useSettings } from "@/context/settings"
import { useDialog } from "@codo-ai/ui/context/dialog"
import { useSessionLayout } from "./session-layout"
import { createSessionOwnership } from "./session-ownership"
import { usePrompt } from "@/context/prompt"

const withCategory = (category: string) => {
  return (option: Omit<CommandOption, "category">): CommandOption => ({
    ...option,
    category,
  })
}

export const useComposerCommands = () => {
  const command = useCommand()
  const dialog = useDialog()
  const language = useLanguage()
  const local = useLocal()
  const settings = useSettings()
  const prompt = usePrompt()
  const { sessionKey } = useSessionLayout()
  const sessionOwnership = createSessionOwnership(sessionKey)
  const modelCommand = withCategory(language.t("command.category.model"))
  const agentCommand = withCategory(language.t("command.category.agent"))
  const workflowCommand = withCategory("Workflow")
  const skillCommand = withCategory("Prompt")

  const chooseModel = async () => {
    const owner = sessionOwnership.capture()
    const { DialogSelectModel } = await import("@/components/dialog-select-model")
    owner.run(() => {
      void dialog.show(() => <DialogSelectModel model={local.model} />)
    })
  }

  command.register("composer", () => [
    modelCommand({
      id: "model.choose",
      title: language.t("command.model.choose"),
      description: language.t("command.model.choose.description"),
      keybind: "mod+'",
      slash: "model",
      onSelect: chooseModel,
    }),
    modelCommand({
      id: "model.variant.cycle",
      title: language.t("command.model.variant.cycle"),
      description: language.t("command.model.variant.cycle.description"),
      keybind: "shift+mod+d",
      onSelect: () => local.model.variant.cycle(),
    }),
    agentCommand({
      id: "agent.cycle",
      title: language.t("command.agent.cycle"),
      description: language.t("command.agent.cycle.description"),
      keybind: "mod+.",
      slash: "agent",
      disabled: !settings.visibility.customAgents(),
      onSelect: () => local.agent.move(1),
    }),
    agentCommand({
      id: "agent.cycle.reverse",
      title: language.t("command.agent.cycle.reverse"),
      description: language.t("command.agent.cycle.reverse.description"),
      keybind: "shift+mod+.",
      disabled: !settings.visibility.customAgents(),
      onSelect: () => local.agent.move(-1),
    }),
    workflowCommand({
      id: "workflow.select",
      title: "Select development workflow",
      slash: "workflow",
      onSelect: async () => {
        const { DialogWorkflow } = await import("@/components/dialog-workflow")
        dialog.show(() => <DialogWorkflow />)
      },
    }),
    skillCommand({
      id: "prompt.skills",
      title: "Skills",
      slash: "skills",
      onSelect: async () => {
        const { DialogSkill } = await import("@/components/dialog-skill")
        dialog.show(() => (
          <DialogSkill
            onSelect={(skill) => {
              prompt.set([{ type: "text", content: `/${skill} `, start: 0, end: 0 }])
            }}
          />
        ))
      },
    }),
  ])
}
