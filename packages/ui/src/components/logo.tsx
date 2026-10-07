import { type ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="14" height="18" rx="2" fill="var(--icon-base)" opacity="0.2" />
      <rect x="1" y="1" width="14" height="18" rx="2" stroke="var(--icon-strong-base)" stroke-width="1.5" />
      <text x="8" y="13" text-anchor="middle" font-family="monospace" font-weight="800" font-size="8" fill="var(--icon-strong-base)">&gt;_</text>
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10" y="15" width="60" height="70" rx="6" fill="var(--icon-base)" opacity="0.15" />
      <rect x="10" y="15" width="60" height="70" rx="6" stroke="var(--icon-strong-base)" stroke-width="4" />
      <text x="40" y="62" text-anchor="middle" font-family="monospace" font-weight="800" font-size="28" fill="var(--icon-strong-base)">&gt;_</text>
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g>
        {/* C */}
        <path d="M18 30H6V18H18V30Z" fill="var(--icon-weak-base)" />
        <path d="M18 12H6V30H18V12ZM24 36H0V6H24V36Z" fill="var(--icon-strong-base)" />
        {/* O */}
        <path d="M48 30H36V18H48V30Z" fill="var(--icon-weak-base)" />
        <path d="M36 30H48V12H36V30ZM54 36H30V6H54V36Z" fill="var(--icon-strong-base)" />
        {/* d */}
        <path d="M84 30H72V18H84V30Z" fill="var(--icon-weak-base)" />
        <path d="M84 12H72V30H84V36H66V6H84V12Z" fill="var(--icon-strong-base)" />
        {/* o */}
        <path d="M114 30H102V18H114V30Z" fill="var(--icon-weak-base)" />
        <path d="M102 30H114V12H102V30ZM120 36H96V6H120V36Z" fill="var(--icon-strong-base)" />
      </g>
    </svg>
  )
}
