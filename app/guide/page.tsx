import type { Metadata } from "next"
import Link from "next/link"
import { BintangLogo } from "@/components/crm/brand"

export const metadata: Metadata = {
  title: "User guide",
  description: "How to connect WhatsApp, Messenger and Instagram to Bintang CRM, where customers send messages, and how to reply.",
}

const APP_URL = "https://crm.bintangkids.com"
const META_APP = "https://developers.facebook.com/apps/1657213349196348"
const WA_TEST_NUMBER = "+1 555 146 0030"
const WA_PHONE_ID = "1527810797078470"
const WA_ACCOUNT_ID = "1092532777167028"

const sections = [
  { id: "start", title: "Sign in" },
  { id: "connect", title: "Connect your channels" },
  { id: "where", title: "Where customers send messages" },
  { id: "testers", title: "Add testers" },
  { id: "inbox", title: "Reply from the inbox" },
  { id: "workspace", title: "Contacts, cases and dashboard" },
  { id: "trouble", title: "Troubleshooting" },
  { id: "public", title: "Before going public" },
]

export default function GuidePage() {
  return <main className="min-h-screen bg-[#F5F6FA] text-slate-700 dark:bg-slate-950 dark:text-slate-300">
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-4">
        <Link href="/inbox"><BintangLogo tone="light" /></Link>
        <Link href="/inbox" className="rounded-lg bg-indigo-700 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-800">Open inbox</Link>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1080px] gap-10 px-5 py-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-6">
          <p className="mb-3 text-[13px] font-semibold text-slate-900 dark:text-white">On this page</p>
          <ol className="space-y-2 text-[13px]">
            {sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="text-slate-500 hover:text-indigo-700 dark:hover:text-indigo-300">{section.title}</a></li>)}
          </ol>
        </div>
      </nav>

      <article className="max-w-[700px] text-[15px] leading-[1.75]">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-[#0E1430] dark:text-white">Bintang CRM user guide</h1>
        <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-400">Bintang CRM puts every customer chat from WhatsApp, Facebook Messenger and Instagram into one inbox. This guide covers connecting your accounts, where customers message you, and how to reply.</p>

        <Section id="start" title="Sign in">
          <p>Go to <A href={APP_URL}>crm.bintangkids.com</A> and sign in with your work email. New team members can create an account from the sign-in page. Each account has its own private workspace.</p>
          <p>Want to look around first? <A href="/demo">Preview with sample data</A> opens a demo workspace. Nothing you do there is saved.</p>
        </Section>

        <Section id="connect" title="Connect your channels">
          <p>Go to <A href="/settings#integrations">Settings → Integrations</A>. Each channel only needs to be connected once.</p>

          <Step n={1} title="Messenger and Instagram">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Click <b>Continue with Facebook</b>.</li>
              <li>Sign in to Facebook if asked, then tick the <b>Bintang Kids Facebook Page</b>. If an Instagram professional account is linked to that Page, tick it too.</li>
              <li>Approve the permissions. You return to Bintang CRM with a &ldquo;Connected&rdquo; message, and the Page and Instagram account appear in their cards.</li>
            </ol>
            <Note>Your Instagram account must be a <b>professional</b> (business or creator) account and linked to the Facebook Page. In the Instagram app: Settings → Account type and tools, and Page → Settings → Linked accounts.</Note>
          </Step>

          <Step n={2} title="WhatsApp">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>In the WhatsApp card, click <b>Add phone number</b>.</li>
              <li>Enter the <b>Phone number ID</b> and <b>WhatsApp Business Account ID</b>. For the test number these are <Code>{WA_PHONE_ID}</Code> and <Code>{WA_ACCOUNT_ID}</Code>.</li>
              <li>Paste an <b>access token</b>. Get one from the <A href={`${META_APP}/use_cases/customize/api-testing-v2/`}>Meta app → WhatsApp → Step 1. Try it out</A> page with <b>Generate token</b>.</li>
              <li>Click <b>Connect number</b>. Bintang CRM checks the details with Meta before saving.</li>
            </ol>
            <Note>Tokens from <b>Generate token</b> expire after about 24 hours, which is fine for testing. For everyday use, create a permanent token: Meta Business Settings → Users → System users → Add, give it the Bintang CRM app and your WhatsApp account, then Generate new token with the <Code>whatsapp_business_messaging</Code> and <Code>whatsapp_business_management</Code> permissions. Paste it with <b>Add phone number</b> again to replace the old one.</Note>
          </Step>
        </Section>

        <Section id="where" title="Where customers send messages">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-slate-50 text-[13px] text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-2.5 font-semibold">Channel</th><th className="px-4 py-2.5 font-semibold">Customers message…</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr><td className="px-4 py-3 font-medium">Messenger</td><td className="px-4 py-3">Your Facebook Page: the <b>Message</b> button on the Page, or <Code>m.me/</Code> followed by your Page username.</td></tr>
                <tr><td className="px-4 py-3 font-medium">Instagram</td><td className="px-4 py-3">A direct message to your Instagram professional account.</td></tr>
                <tr><td className="px-4 py-3 font-medium">WhatsApp (test)</td><td className="px-4 py-3">The test number <b>{WA_TEST_NUMBER}</b>. It only accepts messages from up to 5 phone numbers you register under <b>To</b> on the Step 1 page.</td></tr>
                <tr><td className="px-4 py-3 font-medium">WhatsApp (live)</td><td className="px-4 py-3">Your own business number, once you register it in WhatsApp → Step 2. Production setup.</td></tr>
              </tbody>
            </table>
          </div>
          <p>New messages appear in the <A href="/inbox">Inbox</A> within about 8 seconds, without reloading. A first-time sender is added to Contacts automatically, tagged <b>New lead</b>.</p>
          <Note>Customers must message you first on Messenger and Instagram. On WhatsApp you can reply freely for <b>24 hours</b> after the customer&rsquo;s last message. After that, Meta only allows pre-approved template messages.</Note>
        </Section>

        <Section id="testers" title="Add testers">
          <p>Until Meta approves the app (see <a className="font-semibold text-indigo-700 underline dark:text-indigo-400" href="#public">Before going public</a>), only people with a role on the app can message you through it and have it show up in the CRM.</p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Open <A href={`${META_APP}/roles/roles/`}>Meta app → App roles → Roles</A> and click <b>Add people</b>.</li>
            <li>Choose <b>Tester</b> and enter their Facebook name or ID.</li>
            <li>They accept the invite at <A href="https://developers.facebook.com/requests/">developers.facebook.com/requests</A>.</li>
            <li>For WhatsApp, also add their phone number under <b>To</b> on the WhatsApp Step 1 page. Meta sends them a verification code.</li>
          </ol>
        </Section>

        <Section id="inbox" title="Reply from the inbox">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><b>Open a chat</b>: click it in the list. On a phone it opens full-screen; use the back arrow, or your phone&rsquo;s back button, to return.</li>
            <li><b>Reply</b>: type and press <b>Enter</b> (Shift + Enter for a new line). A chat marked <b>Live</b> sends straight to the customer; other chats are saved as notes.</li>
            <li><b>Message status</b>: &ldquo;Sending…&rdquo; while it goes out, then ✓ sent, ✓✓ delivered, and blue ✓✓ read. The Send button locks while a reply is sending, so you can&rsquo;t send it twice.</li>
            <li><b>Not sent</b>: the message turns red with the reason. Click <b>Retry</b>, or <b>Remove</b> to put the text back in the box and edit it.</li>
            <li><b>Contact details</b>: the panel icon at the top right of a chat shows the customer&rsquo;s details, tags and open cases.</li>
            <li><b>Create case</b> turns a chat into a support case; the phone icon logs a call.</li>
          </ul>
        </Section>

        <Section id="workspace" title="Contacts, cases and dashboard">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><A href="/contacts">Contacts</A>: everyone who has messaged you, plus anyone you add. Add tags such as VIP or Wholesale, and log calls, meetings and notes.</li>
            <li><A href="/cases">Cases</A>: track issues from Open to In progress, Waiting on customer and Resolved, with a priority level.</li>
            <li><A href="/dashboard">Dashboard</A>: unread chats, open cases and activity by channel at a glance.</li>
            <li><A href="/settings">Settings</A>: your profile, connected channels, notifications, which channels show in the inbox, and light or dark mode.</li>
          </ul>
        </Section>

        <Section id="trouble" title="Troubleshooting">
          <dl className="space-y-4">
            <Faq q="A customer messaged us but nothing appears in the inbox">Check that the channel shows a green dot in Settings → Integrations. Until App Review is approved, the sender must have a role on the Meta app (see <a className="font-semibold text-indigo-700 underline dark:text-indigo-400" href="#testers">Add testers</a>). For the WhatsApp test number, their phone must be registered under <b>To</b>.</Faq>
            <Faq q="A reply says Not sent">Read the reason under the message. The most common is WhatsApp&rsquo;s 24-hour rule: the customer needs to message you again before you can reply freely.</Faq>
            <Faq q="A channel shows a red dot or 'Needs reconnecting'">Its access token expired or was revoked. For Messenger or Instagram, click <b>Reconnect</b>. For WhatsApp, click <b>Add phone number</b> and paste a new token.</Faq>
            <Faq q="Continue with Facebook shows an error">Make sure you are an admin of the Facebook Page and that you approve every permission in the pop-up. Then try again.</Faq>
            <Faq q="I can't sign in">Use <b>Create an account</b> if you&rsquo;re new. For anything else, ask the workspace owner.</Faq>
          </dl>
        </Section>

        <Section id="public" title="Before going public">
          <p>Right now the app works for you and your testers. To receive messages from every customer:</p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li><b>Verify the business</b> in Meta Business Settings → Security Centre (company registration documents).</li>
            <li><b>Submit App Review</b> in the Meta app for <Code>pages_messaging</Code>, <Code>instagram_manage_messages</Code> and the WhatsApp permissions, with a short screen recording of replying from Bintang CRM.</li>
            <li><b>Register your real WhatsApp business number</b> and add a payment method in WhatsApp Manager.</li>
            <li>Replace the 24-hour WhatsApp token with a <b>permanent system-user token</b>.</li>
          </ol>
          <p className="text-[14px] text-slate-500">Questions about your data? See the <A href="/privacy">privacy policy</A>.</p>
        </Section>
      </article>
    </div>
  </main>
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="mt-12 scroll-mt-6 space-y-4 border-t border-slate-200 pt-8 dark:border-slate-800">
    <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0E1430] dark:text-white">{title}</h2>
    {children}
  </section>
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0E1430] text-[14px] font-bold text-[#F5B301]">{n}</span>
    <div className="min-w-0 space-y-3"><h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">{title}</h3>{children}</div>
  </div>
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border-l-4 border-[#F5B301] bg-amber-50/70 px-4 py-3 text-[14px] leading-relaxed text-slate-700 dark:bg-amber-400/5 dark:text-slate-300">{children}</p>
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return <div><dt className="font-semibold text-slate-900 dark:text-white">{q}</dt><dd className="mt-1">{children}</dd></div>
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">{children}</code>
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http")
  return external
    ? <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-700 dark:text-indigo-400">{children}</a>
    : <Link href={href} className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-700 dark:text-indigo-400">{children}</Link>
}
