"use client";

// A conversation the way every messaging app draws one: one card per message, the
// sender's face and name, a run of messages by one sender grouped (the face once, the
// gap tighter), the time, your own messages on your side. Neutral by default (the
// page's own surface, border and foreground tokens) and made to be SKINNED: telegram-chat
// is this component wearing Telegram, and a transcript draws its turns with it.
//
// THE PARTS ARE THE API. `ChatThread` (the list), `ChatMessage` (one listitem: a row
// with the face beside the card, or the card alone), `ChatDay` (the date between two
// days), `ChatFace`, `ChatSender`, `ChatTime`, `ChatPhoto`, `ChatReply`. Each takes
// `className` and a `look` whose `none` keeps the structure (the element, its role, its
// data attributes, the grouping state) and drops every visual class: a skin's own
// stylesheet then owns the part whole, because a utility left behind would beat a
// skin's layered CSS whatever its specificity. That is how telegram-chat keeps every
// pixel and still draws its thread with these parts. `Chat` is the data-driven preset
// over them: messages and people in, grouping and sides computed.
//
// The DOM says what each part is (`data-slot="chat-…"`) and what state it is in:
// `data-side`, `data-continued` (not the first of its sender's run), `data-tail` (the
// last of it), so a skin styles a state from outside without a class to know.
//
// Accessible: the thread is a list and each message a listitem. A grouped message whose
// card shows no name still says who wrote it: `sender` puts the name in front of the
// text for a screen reader alone. Text wraps and is never cut.

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Image, type ImageProps } from "@/components/ui/image";
import { type Person, personColors } from "@/lib/person";
import { cn } from "@/lib/utils";

/** The person's colour, set on every part that wears it; a composition that tints
 *  its own parts (a transcript's speaker strip) sets the same property. */
export const CHAT_COLOR = "--ag-chat-color";
const COLOR = CHAT_COLOR;
/** A wash of the person's colour: a face without a picture, a live word, a reply. */
export const CHAT_WASH =
  "bg-[color-mix(in_oklab,var(--ag-chat-color)_28%,transparent)]";
/** Text in the person's colour: a name. */
export const CHAT_INK = "text-(color:--ag-chat-color)";

// ── the thread ───────────────────────────────────────────────────────────────────

const threadVariants = cva("group/thread flex flex-col", {
  variants: {
    density: { comfortable: "gap-4", compact: "gap-2" },
  },
  defaultVariants: { density: "comfortable" },
});

/** The conversation: a list of messages, oldest first. `look="none"` is the list and
 *  nothing else, for a skin whose stylesheet lays it out. */
export function ChatThread({
  look = "default",
  density = "comfortable",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof threadVariants> & { look?: "default" | "none" }) {
  return (
    // ROLES ON DIVS, not <ol>/<li>: a skin's stylesheet (telegram-chat's) lays out
    // these elements as blocks and flex rows, and a list element's own box (markers,
    // list-item display, an <ol>'s inset) is one more thing a skin would have to undo.
    // biome-ignore lint/a11y/useSemanticElements: see above
    <div
      role="list"
      data-slot="chat-thread"
      data-density={look === "none" ? undefined : (density ?? undefined)}
      className={
        look === "none" ? className : cn(threadVariants({ density }), className)
      }
      {...props}
    />
  );
}

// ── a message ────────────────────────────────────────────────────────────────────

const rowVariants = cva("flex max-w-[min(100%,42rem)] items-end gap-2", {
  variants: {
    side: { other: "self-start", self: "flex-row-reverse self-end" },
  },
});

const cardVariants = cva(
  "relative min-w-0 max-w-full text-pretty break-words [overflow-wrap:anywhere]",
  {
    variants: {
      look: {
        bubble: "rounded-2xl px-3.5 py-2",
        card: "rounded-lg border border-border bg-card px-4 py-3 text-card-foreground shadow-xs",
        plain: "py-0.5",
        none: "",
      },
      // Whose it is, apart from where it sits: an interview puts a guest on your
      // side, and painting by side handed them your colour. Your own bubble is a
      // wash of YOUR colour over the muted surface, never the page's primary: in the
      // dark that was a white slab among grey ones.
      own: { true: "", false: "" },
    },
    compoundVariants: [
      { look: "bubble", own: false, className: "bg-muted" },
      {
        look: "bubble",
        own: true,
        className:
          "bg-[color-mix(in_oklab,var(--ag-chat-color,var(--primary))_28%,var(--muted))]",
      },
    ],
    defaultVariants: { look: "bubble", own: false },
  },
);

/** The grouping, said on the card: a sender's run opens with a full gap above and
 *  closes with the corner on the face's side; inside the run the gap closes up. */
const RUN = {
  continued: "-mt-2.5 group-data-[density=compact]/thread:-mt-1",
} as const;

export type ChatSide = "self" | "other";
export type ChatLook = "bubble" | "card" | "plain" | "none";

export interface ChatMessageProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Your side or theirs. A conversation with no "you" (a transcript, a channel) puts
   *  everyone on `other`, or alternates by speaker: the caller's choice. */
  side?: ChatSide;
  /** Yours: drawn in your colour whichever side it sits on (`data-own`). */
  own?: boolean;
  look?: ChatLook;
  /** Beside the card (a `ChatFace`, or a skin's own). Absent, the card is the listitem
   *  itself, with no row around it. */
  face?: React.ReactNode;
  /** Keep the face's room but draw nothing in it: a run of one sender shows its face
   *  once and the rest line up under it. */
  faceHidden?: boolean;
  /** Not the first of its sender's run. */
  continued?: boolean;
  /** The last of its sender's run: the card that carries the tail or corner. */
  tail?: boolean;
  /** The person's colour (any CSS colour), for the parts that wear it. */
  color?: string;
  /** Who wrote it, for a screen reader alone, when the card shows no name. */
  sender?: string;
  /** On the card, not the row. */
  cardRef?: React.Ref<HTMLDivElement>;
  cardClassName?: string;
  /** On the row, when there is a face. */
  rowClassName?: string;
  /** Attributes for the card itself (data-*, handlers, style). */
  cardProps?: React.ComponentProps<"div"> & Record<`data-${string}`, unknown>;
  children?: React.ReactNode;
}

/** One message: the card, and the face beside it when there is one. A listitem either
 *  way; the grouping state lands on the card as `data-continued` and `data-tail`. */
export function ChatMessage({
  side = "other",
  own = false,
  look = "bubble",
  face,
  faceHidden = false,
  continued = false,
  tail = true,
  color,
  sender,
  cardRef,
  cardClassName,
  rowClassName,
  cardProps,
  className,
  style,
  children,
  ...props
}: ChatMessageProps) {
  const bare = look === "none";
  const tint = color
    ? ({ [COLOR]: color, ...style } as React.CSSProperties)
    : style;
  const cardStyle = { ...(face ? undefined : tint), ...cardProps?.style };
  const card = (
    <div
      {...cardProps}
      ref={cardRef}
      data-slot="chat-message"
      data-side={side}
      data-own={own || undefined}
      data-continued={continued || undefined}
      data-tail={tail || undefined}
      className={
        bare
          ? cn(cardClassName, !face && className)
          : cn(
              cardVariants({ look, own }),
              !face && side === "self" && "self-end",
              !face && side === "other" && "self-start",
              !face && continued && RUN.continued,
              cardClassName,
              !face && className,
            )
      }
      style={Object.keys(cardStyle).length ? cardStyle : undefined}
      {...(face ? {} : { role: "listitem", ...props })}
    >
      {sender && <span className="sr-only">{sender}: </span>}
      {children}
    </div>
  );
  if (!face) return card;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a div for skins, as ChatThread says
    <div
      role="listitem"
      data-slot="chat-row"
      data-side={side}
      className={
        bare
          ? cn(rowClassName, className)
          : cn(
              rowVariants({ side }),
              continued && RUN.continued,
              rowClassName,
              className,
            )
      }
      style={tint}
      {...props}
    >
      {faceHidden ? (
        <span aria-hidden className="invisible flex">
          {face}
        </span>
      ) : (
        face
      )}
      {card}
    </div>
  );
}

// ── the parts inside a card ──────────────────────────────────────────────────────

/** A day between two days of messages ("23 July 2024"), centred. A listitem, so the
 *  list stays a list of rows. */
export function ChatDay({
  look = "default",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { look?: "default" | "none" }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a div for skins, as ChatThread says
    <div
      role="listitem"
      data-slot="chat-day"
      className={
        look === "none" ? className : cn("flex justify-center", className)
      }
      {...props}
    >
      <span
        className={
          look === "none"
            ? undefined
            : "rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs"
        }
      >
        {children}
      </span>
    </div>
  );
}

/** Faces on the avatar rungs: a caption's line, a message. */
const FACE_SIZES = { sm: "1.5rem", md: "2.5rem" } as const;
export type ChatFaceSize = keyof typeof FACE_SIZES;

/** A person's face: their picture, or their initial on a wash of their colour, and a
 *  ring in their colour that pulses while they talk (`talking`; the ring is always
 *  there and only its opacity moves, so a face that starts talking moves nothing;
 *  reduced motion keeps the ring and drops the pulse). Decorative: the name always
 *  stands somewhere beside it. */
export function ChatFace({
  person,
  color,
  size = "md",
  talking = false,
  className,
}: {
  person: Person;
  /** Any CSS colour: the ring and the placeholder's wash. Default: the person's. */
  color?: string;
  size?: ChatFaceSize;
  talking?: boolean;
  className?: string;
}) {
  const tone = color ?? person.color;
  return (
    <span
      data-slot="chat-face"
      data-talking={talking || undefined}
      aria-hidden
      // The ring's room is inside the face's own box: a ring drawn past its box was
      // clipped by any scroller the face stood at the edge of (a transcript's).
      className={cn(
        "relative inline-flex size-[calc(var(--ag-chat-face)+6px)] shrink-0 rounded-full p-[3px]",
        className,
      )}
      style={
        {
          "--ag-chat-face": FACE_SIZES[size],
          ...(tone ? { [COLOR]: tone } : {}),
        } as React.CSSProperties
      }
    >
      {person.avatar ? (
        <Image
          src={person.avatar}
          alt=""
          sizes={FACE_SIZES[size]}
          className="size-full rounded-full"
          draggable={false}
        />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center rounded-full font-medium text-foreground",
            size === "md" ? "text-sm" : "text-[0.625rem]",
            tone ? CHAT_WASH : "bg-muted",
          )}
        >
          {person.name.slice(0, 1)}
        </span>
      )}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full border-(color:--ag-chat-color) border-2 transition-opacity duration-200",
          talking ? "opacity-100 motion-safe:animate-pulse" : "opacity-0",
        )}
      />
    </span>
  );
}

/** The sender's name at the head of a card, in their colour (`--ag-chat-color` from the
 *  message, or `color`). */
export function ChatSender({
  look = "default",
  color,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  look?: "default" | "none";
  color?: string;
}) {
  return (
    <div
      data-slot="chat-sender"
      className={
        look === "none"
          ? className
          : cn(
              "mb-0.5 font-medium text-(color:--ag-chat-color) text-xs",
              className,
            )
      }
      style={color ? { ...style, color } : style}
      {...props}
    />
  );
}

/** When it was said, at the card's foot: a clock (`0:52`), an hour (`00:27`), a date. */
export function ChatTime({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chat-time"
      className={cn(
        "ml-2 font-mono text-[0.6875rem] tabular-nums opacity-55",
        className,
      )}
      {...props}
    />
  );
}

/** A picture at the head of a card, edge to edge, at its own aspect. */
export function ChatPhoto({
  look = "default",
  className,
  alt = "",
  ...props
}: ImageProps & { look?: "default" | "none" }) {
  return (
    <Image
      data-slot="chat-photo"
      alt={alt}
      className={
        look === "none"
          ? className
          : cn("mt-1 mb-2 block rounded-lg", className)
      }
      {...props}
    />
  );
}

/** The message this one answers: who, and what they said, quoted in their colour. */
export function ChatReply({
  look = "default",
  who,
  text,
  color,
  className,
  style,
}: {
  look?: "default" | "none";
  who: string;
  text: string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-slot="chat-reply"
      className={
        look === "none"
          ? className
          : cn(
              "mb-1 rounded-md border-(color:--ag-chat-color) border-l-2 px-2 py-1 text-xs",
              CHAT_WASH,
              className,
            )
      }
      style={
        color ? ({ ...style, [COLOR]: color } as React.CSSProperties) : style
      }
    >
      <strong className={look === "none" ? undefined : "block font-medium"}>
        {who}
      </strong>
      <span className={look === "none" ? undefined : "line-clamp-none"}>
        {text}
      </span>
    </div>
  );
}

// ── the preset ───────────────────────────────────────────────────────────────────

/** One message for `Chat`: who sent it, its body, and what goes around it. */
export interface ChatItem {
  /** A key into `people`: you are a person too. */
  from: string;
  /** The text, or anything (a rich body, an attachment). */
  body: React.ReactNode;
  /** At the card's foot: an hour, a clock. */
  time?: string;
  /** A day starts at this message ("23 July"). */
  day?: string;
  photo?: { src: string; width: number; height: number; alt?: string };
  reply?: { from: string; text: string };
}

export interface ChatProps {
  messages: readonly ChatItem[];
  /** Everyone in it, you included, by the key a message names them with (lib/person:
   *  name, picture, colour; a person with no colour takes the palette's). */
  people: Record<string, Person>;
  /** Your key in `people`, when you are in it: your messages are drawn in your colour
   *  and, laid out as a messaging app, on your side. */
  self?: string;
  /** `sides`: yours on the right, theirs on the left (a messaging app). For a
   *  conversation you only read, where no side is yours: `start`, everyone on the left
   *  (a transcript, a channel), or `alternate`, speakers taking turns sides by order of
   *  first message (an interview). */
  align?: "sides" | "start" | "alternate";
  look?: ChatLook;
  density?: "comfortable" | "compact";
  /** Faces beside the cards. Under `sides` your own messages go without yours, as
   *  messaging apps draw them. */
  faces?: boolean;
  /** The accessible name of the conversation. */
  label?: string;
  className?: string;
}

/** A conversation from data: runs of one sender grouped (name and face once), sides by
 *  `align`, each person in their colour. */
export function Chat({
  messages,
  people,
  self,
  align = "sides",
  look = "bubble",
  density = "comfortable",
  faces = true,
  label = "conversation",
  className,
}: ChatProps) {
  const order = messages.map((m) => m.from);
  const named = messages.flatMap((m) => (m.reply ? [m.reply.from] : []));
  for (const from of [...order, ...named, ...(self ? [self] : [])])
    if (!people[from]) throw new Error(`chat: "${from}" is not in people`);
  const mine = (from: string) => from === self;
  const colors = personColors(order, people);
  const firsts = [...new Set(order)];
  const sideOf = (from: string): ChatSide => {
    if (align === "start") return "other";
    if (align === "alternate")
      return firsts.indexOf(from) % 2 === 1 ? "self" : "other";
    return mine(from) ? "self" : "other";
  };
  return (
    <section aria-label={label} className={className}>
      <ChatThread density={density}>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const continued = !!prev && prev.from === m.from && !m.day;
          const tail = !next || next.from !== m.from || !!next.day;
          const person = people[m.from] as Person;
          const side = sideOf(m.from);
          // Laid out as a messaging app, your own messages go bare: your side says
          // whose they are. Laid out any other way you are one more speaker, named
          // and faced like the rest, so every card's text starts on one line.
          const bare = mine(m.from) && align === "sides";
          const showFace = faces && !bare;
          return (
            <React.Fragment
              // biome-ignore lint/suspicious/noArrayIndexKey: a conversation's order is its identity
              key={i}
            >
              {m.day && <ChatDay>{m.day}</ChatDay>}
              <ChatMessage
                side={side}
                own={mine(m.from)}
                look={look}
                color={colors[m.from]}
                continued={continued}
                tail={tail}
                face={
                  showFace ? (
                    <ChatFace person={person} color={colors[m.from]} />
                  ) : undefined
                }
                // The face rides the run's last card, the way the apps draw it.
                faceHidden={showFace && !tail}
                // Said to a screen reader on every message; the visible name below
                // is the same words for the eye, so it is hidden from the reader.
                sender={person.name}
              >
                {!continued && !bare && (
                  <ChatSender aria-hidden>{person.name}</ChatSender>
                )}
                {m.photo && (
                  <ChatPhoto
                    src={m.photo.src}
                    width={m.photo.width}
                    height={m.photo.height}
                    alt={m.photo.alt}
                  />
                )}
                {m.reply && (
                  <ChatReply
                    who={(people[m.reply.from] as Person).name}
                    text={m.reply.text}
                    color={colors[m.reply.from]}
                  />
                )}
                {m.body}
                {m.time && <ChatTime>{m.time}</ChatTime>}
              </ChatMessage>
            </React.Fragment>
          );
        })}
      </ChatThread>
    </section>
  );
}
