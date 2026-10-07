import { extend, type TextProps } from "@opentui/solid"
import { createContext, createRenderEffect, splitProps, useContext, type Accessor, type ParentProps } from "solid-js"
import { RtlTextRenderable, type RtlTextOptions } from "../rtl-renderable"

const RtlPolicy = createContext<Accessor<RtlTextOptions["forceShaping"]>>(() => "auto" as const)

export function useRtlPolicy() {
  return useContext(RtlPolicy)
}

export function RtlPolicyProvider(props: ParentProps<Pick<RtlTextOptions, "forceShaping">>) {
  return <RtlPolicy.Provider value={() => props.forceShaping ?? "auto"}>{props.children}</RtlPolicy.Provider>
}

declare module "@opentui/solid" {
  interface OpenTUIComponents {
    rtl_text: typeof RtlTextRenderable
  }
}

extend({ rtl_text: RtlTextRenderable })

export function RtlText(props: Omit<TextProps, "forceShaping">) {
  const policy = useContext(RtlPolicy)
  const [local, rest] = splitProps(props, ["ref", "content"])
  return (
    <rtl_text
      {...rest}
      forceShaping={policy()}
      ref={(node) => {
        createRenderEffect(() => {
          if (local.content !== undefined) node.content = local.content
        })
        if (typeof local.ref === "function") local.ref(node)
      }}
    />
  )
}
