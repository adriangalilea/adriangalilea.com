import type { Metadata } from "next";

// What the site keeps and what it never does. Every claim here is what the code does
// (components/page-sensor and lib/visits, the ui registry's, the layout's
// Vercel Analytics and Speed Insights, lib/auth and the comments); change one, change
// this page with it.

export const metadata: Metadata = {
  title: "Privacy",
  description: "What this site keeps, and what it never does.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-24">
      <h1 className="font-serif text-4xl">Privacy</h1>
      <div className="prose prose-p:leading-[1.8] prose-p:my-6 mt-8">
        <p>
          This site keeps a record of how visits move through it and through{" "}
          <a href="https://ui.adriangalilea.com/privacy">
            ui.adriangalilea.com
          </a>
          , one record for both: the pages read in order, how long each was on
          screen, how fast it loaded, the requests it made, and the site a visit
          came from. Nothing is stored in your browser. Your address and browser
          are never kept: they are mixed with a random value that changes every
          day and is deleted when the day ends, so a visit can be followed
          within a day but never across days, and once that value is gone no
          record can be traced to anyone, me included. The country is kept, as
          two letters. A browser that asks not to be tracked (Global Privacy
          Control or Do Not Track) is not recorded at all. Visits are kept 180
          days, the requests they made 30.
        </p>
        <p>
          A page&apos;s view count is how many visits opened it: a number per
          day, with nothing of who.
        </p>
        <p>
          Vercel Web Analytics and Speed Insights also count visits and measure
          how fast pages load. Neither sets a cookie.
        </p>
        <p>
          To comment you sign in with GitHub or Telegram. The site then keeps
          your name, picture and email (a Telegram sign-in has no email; its id
          and username are kept instead), your comments, and while you are
          signed in a session cookie with the address and browser it was opened
          from. Ask me and I delete all of it:{" "}
          <a href="mailto:adriangalilea@gmail.com">adriangalilea@gmail.com</a>.
        </p>
      </div>
    </main>
  );
}
