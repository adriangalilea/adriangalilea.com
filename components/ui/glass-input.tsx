"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  GlassButton,
  type GlassButtonCorners,
  type GlassButtonProps,
  type GlassTone,
  glassVariants,
} from "@/components/ui/liquid-glass"

// A text field made of glass, at the button's heights and corners, so a field and
// the button that submits it sit as one row. Focused, the rim catches more light
// and the glass's fine focus line appears; never a coloured border.
//
// It validates the way the page already does, whichever that is:
//   schema    any Standard Schema (zod, valibot, arktype: `z.email("…")`)
//   validate  a function, value → message or undefined
//   neither   the browser's own rules (type, required, pattern…) and messages
//   error     a message from outside (the server said no), shown as is
// The browser's rules hold beside a schema or function and speak when those are
// satisfied. The pattern that keeps one truth: one schema for the whole form,
// the one the server parses too, each field given its own part
// (`schema={signup.shape.email}`), and the input's own attributes kept for what
// only they do (the email keyboard, autofill).
// It checks every value as it is typed and tells the form (the browser's own
// validity, so `form:valid` and a GlassSubmit know at once), but it does not nag:
// it SAYS what is wrong only once you leave the field or the form is submitted,
// and from then on on every keystroke, so a message clears the moment the value
// is right. Wrong, the rim catches red light and the body takes a faint red (red
// mixed deep into dark glass reads brown, so the colour lives on the edge), and
// the message hangs from the field's edge on a tag of the same glass, its own
// blur behind the words so they read over any background. The tag floats over
// what is below, so nothing moves; it is announced (role=alert) and tied to the
// field (aria-invalid, describedby).
//
// GlassSubmit is the button that sends such a form: locked until every field in
// it is right, and saying so (see below).

/** The one method of the Standard Schema interface this reads (standardschema.dev):
 *  zod, valibot and arktype all carry it. Copied, as the spec intends, so the
 *  field depends on no library. */
export interface StandardSchema {
  "~standard": {
    validate: (
      value: unknown,
    ) =>
      | { issues?: readonly { message: string }[] }
      | Promise<{ issues?: readonly { message: string }[] }>
  }
}

/** Fired (bubbling) on a field each time its value has been checked, so whatever
 *  watches the form reads its validity after a schema's answer, not before. */
const CHECKED = "glass-input-checked"

export type GlassInputProps = Omit<
  React.ComponentPropsWithRef<"input">,
  "size"
> & {
  size?: "sm" | "md" | "lg"
  corners?: GlassButtonCorners
  tone?: GlassTone
  /** Judged against this schema; its first issue's message is shown. */
  schema?: StandardSchema
  /** Or judged by this: a message when wrong, undefined when right. */
  validate?: (value: string) => string | undefined
  /** A message from outside (a server's answer), shown whatever the field says. */
  error?: string
}

export function GlassInput({
  size = "md",
  corners = "pill",
  tone,
  schema,
  validate,
  error,
  className,
  onBlur,
  onChange,
  ref,
  ...props
}: GlassInputProps) {
  const [own, setOwn] = React.useState<string | undefined>()
  const [judged, setJudged] = React.useState(false)
  const id = React.useId()
  const message = error ?? (judged ? own : undefined)

  // What is wrong with the value now, told to the browser (so the form will not
  // submit and `:invalid` holds) and kept, shown or not.
  const check = async (el: HTMLInputElement) => {
    const value = el.value
    let next: string | undefined
    if (schema) {
      const result = await schema["~standard"].validate(value)
      if (el.value !== value) return // typed past while the schema answered
      next = result.issues?.[0]?.message
    } else if (validate) next = validate(value)
    if (schema || validate) el.setCustomValidity(next ?? "")
    // The browser's own rules still hold beside a schema (type, required,
    // minLength); when the schema has nothing to say, they speak.
    if (!next && !el.validity.valid) next = el.validationMessage
    setOwn(next)
    el.dispatchEvent(new Event(CHECKED, { bubbles: true }))
  }
  const judge = (el: HTMLInputElement) => {
    setJudged(true)
    void check(el)
  }

  const input = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(ref, () => input.current as HTMLInputElement, [])
  // Checked as it arrives, so the form knows an empty required field is wrong
  // before anyone has touched it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on arrival
  React.useEffect(() => {
    if (input.current) void check(input.current)
  }, [])

  return (
    <span
      data-slot="glass-input"
      className={cn("relative inline-flex min-w-0", className)}
    >
      {/* The glass is this span, not the input: an input draws no ::before,
          where the glass's rim lives, so a field made of the input itself
          would be the one control without a rim. The input inside is bare. */}
      <span
        data-invalid={message ? "" : undefined}
        className={cn(
          glassVariants({ shape: "surface", tone }),
          corners === "pill" ? "rounded-full" : "rounded-[10px]",
          size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-10",
          // A field's focus is its rim catching more light: a text field is
          // focus-visible to a click as much as to Tab (you type where it is),
          // so a ring here would show to everyone; the lit rim is the field's.
          "flex w-full min-w-0 transition-[box-shadow,background-color] duration-200 focus-within:[--glass-rim:1.6]",
          "data-[invalid]:[--glass-hue-amount:8%] data-[invalid]:[--glass-hue:var(--destructive)] data-[invalid]:[--glass-rim-color:var(--destructive)] data-[invalid]:[--glass-rim:2.4]",
        )}
      >
        <input
          {...props}
          ref={input}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-message` : undefined}
          onBlur={(e) => {
            judge(e.currentTarget)
            onBlur?.(e)
          }}
          onChange={(e) => {
            void check(e.currentTarget)
            onChange?.(e)
          }}
          onInvalid={(e) => {
            // A submit that found it wrong: say why here, not in the browser's bubble.
            e.preventDefault()
            judge(e.currentTarget)
          }}
          className={cn(
            "size-full min-w-0 rounded-[inherit] bg-transparent outline-none placeholder:text-current/40",
            size === "sm"
              ? "px-3 text-xs"
              : size === "lg"
                ? "px-5 text-base"
                : "px-4 text-sm",
          )}
        />
      </span>
      {message && (
        <span
          id={`${id}-message`}
          role="alert"
          className={cn(
            glassVariants({ shape: "surface", tone }),
            "pointer-events-none absolute top-full left-0 z-20 mt-1 w-max max-w-72 rounded-[8px] rounded-tl-[3px] px-2 py-1 text-[11px] leading-snug",
            "[--glass-blur:10px] [--glass-hue-amount:8%] [--glass-hue:var(--destructive)] [--glass-rim-color:var(--destructive)] [--glass-rim:2.4]",
            "transition-[opacity,translate] duration-200 ease-out starting:-translate-y-1 starting:opacity-0",
          )}
        >
          {message}
        </span>
      )}
    </span>
  )
}

// The button that sends a form of glass fields. Until every field in its form is
// right it is locked: its words dim and its rim goes dull, but it still takes a
// press, because a dead button explains nothing. Pressed while locked it shakes
// its head and every wrong field says why, the first one taking focus. The
// moment the last field comes right it unlocks: the glass brightens and what it
// holds nudges forward once, toward where the form goes. It reads the form's own
// validity (`form:valid`), so any field the browser can judge counts, glass or not.

const SHAKE: Keyframe[] = [
  { translate: "0" },
  { translate: "-4px" },
  { translate: "3.5px" },
  { translate: "-2.5px" },
  { translate: "1.5px" },
  { translate: "0" },
]
const NUDGE: Keyframe[] = [
  { translate: "0" },
  { translate: "3px" },
  { translate: "0" },
]

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches

export function GlassSubmit({
  className,
  onClick,
  children,
  ...props
}: Omit<GlassButtonProps<"button">, "as" | "type">) {
  const button = React.useRef<HTMLButtonElement>(null)
  const [ready, setReady] = React.useState(false)
  const was = React.useRef(ready)

  React.useEffect(() => {
    const form = button.current?.form
    if (!form) throw new Error("GlassSubmit must sit inside a <form>")
    const read = () => setReady(form.matches(":valid"))
    read()
    form.addEventListener("input", read)
    form.addEventListener(CHECKED, read)
    return () => {
      form.removeEventListener("input", read)
      form.removeEventListener(CHECKED, read)
    }
  }, [])

  React.useEffect(() => {
    if (ready && !was.current && !still())
      for (const child of button.current?.children ?? [])
        child.animate(NUDGE, {
          duration: 420,
          easing: "cubic-bezier(0.34,1.56,0.64,1)",
        })
    was.current = ready
  }, [ready])

  return (
    <GlassButton
      {...props}
      ref={button}
      type="submit"
      aria-disabled={ready ? undefined : true}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ready) {
          e.preventDefault()
          const form = e.currentTarget.form
          // Constraint validation fires `invalid` on every wrong field: each
          // glass field says why. Then the first takes focus.
          form?.checkValidity()
          form?.querySelector<HTMLElement>(":invalid")?.focus()
          if (!still())
            e.currentTarget.animate(SHAKE, {
              duration: 380,
              easing: "ease-out",
            })
          return
        }
        onClick?.(e)
      }}
      className={cn(
        "[&>*]:transition-opacity [&>*]:duration-300",
        "aria-disabled:cursor-not-allowed aria-disabled:[--glass-rim:0.5] aria-disabled:hover:[--glass-rim:0.5] aria-disabled:active:scale-100 aria-disabled:[&>*]:opacity-35",
        className,
      )}
    >
      {children}
    </GlassButton>
  )
}
