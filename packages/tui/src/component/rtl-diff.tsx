import { BoxRenderable, DiffRenderable, type DiffRenderableOptions } from "@opentui/core"
import { type ExtendedComponentProps } from "@opentui/solid"
import { createMemo, For, Show, splitProps, type Ref } from "solid-js"
import { parsePatch } from "diff"
import { RtlText, useRtlPolicy } from "./rtl-text"
import { hasRtl, shouldShape } from "../util/rtl"

export type RtlDiffProps = Omit<ExtendedComponentProps<typeof DiffRenderable>, "ref"> & {
  ref?: Ref<DiffRenderable | BoxRenderable>
}

type Row = { text: string; kind: " " | "+" | "-" | "\\"; old?: number; next?: number }

export function RtlDiff(props: RtlDiffProps) {
  const policy = useRtlPolicy()
  const [local, rest] = splitProps(props, ["ref"])
  const patches = createMemo(() => {
    if (!shouldShape(policy()) || !hasRtl(props.diff ?? "")) return undefined
    try {
      const parsed = parsePatch(props.diff ?? "")
      return parsed.length && parsed.some((patch) => patch.hunks.length) ? parsed : undefined
    } catch {
      return undefined
    }
  })
  const ref = (node: DiffRenderable | BoxRenderable) => {
    if (typeof local.ref === "function") local.ref(node)
  }
  return <Show when={patches()} fallback={<diff {...rest} ref={ref} />}>
    {(patches) => <box
      id={props.id}
      width={props.width}
      height={props.height}
      flexGrow={props.flexGrow}
      flexShrink={props.flexShrink}
      margin={props.margin}
      marginTop={props.marginTop}
      marginBottom={props.marginBottom}
      visible={props.visible}
      ref={ref}
    >
      <For each={patches()}>{(patch) => <box width="100%" flexShrink={0}>
        <RtlText fg={props.fg} content={`${patch.oldFileName ?? ""} → ${patch.newFileName ?? ""}`} />
        <For each={patch.hunks}>{(hunk) => {
          let old = hunk.oldStart
          let next = hunk.newStart
          const rows = hunk.lines.map((line): Row => {
            const kind = line[0] === "+" || line[0] === "-" || line[0] === " " ? line[0] : "\\"
            return {
              text: line.slice(1), kind,
              old: kind === " " || kind === "-" ? old++ : undefined,
              next: kind === " " || kind === "+" ? next++ : undefined,
            }
          })
          const pairs: { left?: Row; right?: Row }[] = []
          let index = 0
          while (index < rows.length) {
            const row = rows[index]
            if (row.kind !== "-" && row.kind !== "+") {
              pairs.push({ left: row, right: row })
              index++
              continue
            }
            const removed: Row[] = []
            const added: Row[] = []
            while (rows[index]?.kind === "-") removed.push(rows[index++])
            while (rows[index]?.kind === "+") added.push(rows[index++])
            for (let position = 0; position < Math.max(removed.length, added.length); position++) {
              pairs.push({ left: removed[position], right: added[position] })
            }
          }
          return <box width="100%" flexShrink={0}>
            <RtlText fg={props.lineNumberFg ?? "#888888"} content={`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`} />
            <Show when={props.view === "split"} fallback={<For each={rows}>{(row) => <DiffRow row={row} options={props} />}</For>}>
              <For each={pairs}>{(pair) => <box width="100%" flexDirection="row" flexShrink={0}>
                <box width="50%" flexShrink={0}><Show when={pair.left}>{(row) => <DiffRow row={row()} options={props} side="old" />}</Show></box>
                <box width="50%" flexShrink={0}><Show when={pair.right}>{(row) => <DiffRow row={row()} options={props} side="next" />}</Show></box>
              </box>}</For>
            </Show>
          </box>
        }}</For>
      </box>}</For>
    </box>}
  </Show>
}

function DiffRow(props: { row: Row; options: DiffRenderableOptions; side?: "old" | "next" }) {
  const background = () => props.row.kind === "+" ? props.options.addedContentBg ?? props.options.addedBg ?? "#1a4d1a"
    : props.row.kind === "-" ? props.options.removedContentBg ?? props.options.removedBg ?? "#4d1a1a"
    : props.options.contextContentBg ?? props.options.contextBg
  const signColor = () => props.row.kind === "+" ? props.options.addedSignColor ?? "#22c55e"
    : props.row.kind === "-" ? props.options.removedSignColor ?? "#ef4444" : props.options.lineNumberFg
  return <box width="100%" flexDirection="row" flexShrink={0} backgroundColor={background()}>
    <Show when={props.options.showLineNumbers !== false}>
      <RtlText
        selectable={false}
        fg={props.options.lineNumberFg ?? "#888888"}
        bg={props.options.lineNumberBg}
        content={`${props.side ? props.row[props.side] ?? "" : `${props.row.old ?? ""} ${props.row.next ?? ""}`} `}
        width={props.side ? 6 : 12}
      />
    </Show>
    <RtlText selectable={false} content={`${props.row.kind} `} width={2} fg={signColor()} />
    <RtlText
      content={props.row.text}
      flexGrow={1}
      flexShrink={1}
      minWidth={0}
      fg={props.options.fg}
      bg={background()}
      wrapMode={props.options.wrapMode ?? "word"}
      selectionBg={props.options.selectionBg}
      selectionFg={props.options.selectionFg}
    />
  </box>
}
