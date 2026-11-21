import type { Metadata } from "next"
import Link from "next/link"
import { BintangLogo } from "@/components/crm/brand"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Bintang CRM collects, uses and protects customer conversation data.",
}

const CONTACT_EMAIL = "mr.syahrilidris@gmail.com"
const UPDATED = "21 November 2026"

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#F5F6FA] px-5 py-12 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
    <article className="mx-auto max-w-[680px]">
      <Link href="/" className="inline-flex"><BintangLogo tone="light" /></Link>
      <h1 className="mt-10 text-[32px] font-bold tracking-[-0.03em] text-[#0E1430] dark:text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-[15px] leading-[1.75]">
        <Section title="Who we are">
          <p>Bintang CRM is a customer messaging workspace operated by Bintang Kids (&ldquo;we&rdquo;, &ldquo;us&rdquo;). It lets our team read and reply to messages that customers send to our business on WhatsApp, Facebook Messenger, Instagram and email, in one place.</p>
        </Section>

        <Section title="Information we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Messages you send us</strong> on WhatsApp, Messenger or Instagram, including text and a description of any attachment (for example &ldquo;Photo&rdquo;).</li>
            <li><strong>Profile details those platforms share with us</strong>: your name, your WhatsApp phone number, or your Messenger / Instagram user ID and username.</li>
            <li><strong>Notes our team adds</strong>, such as support cases, call notes and tags linked to your conversation.</li>
            <li><strong>Our staff accounts</strong>: the name and email address our team members use to sign in.</li>
          </ul>
          <p className="mt-3">We do not collect payment card details, and we do not use cookies for advertising.</p>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc space-y-2 pl-5">
            <li>To read and reply to your messages and keep a history of our conversation.</li>
            <li>To track and resolve your questions, orders and complaints.</li>
            <li>To keep the service secure and working properly.</li>
          </ul>
          <p className="mt-3">We do not sell your information, and we do not use it for advertising.</p>
        </Section>

        <Section title="Where it is stored and who can see it">
          <p>Data is stored with Supabase (database, Singapore region) and served through Vercel (hosting). Messages travel through Meta Platforms (WhatsApp, Messenger, Instagram) under Meta&rsquo;s own terms. Access tokens for our Meta accounts are encrypted. Only authorised Bintang Kids staff can view conversations, and each staff workspace only sees its own data.</p>
        </Section>

        <Section title="How long we keep it">
          <p>We keep conversations and related notes for as long as we need them to support you, or until you ask us to delete them.</p>
        </Section>

        <Section title="Your choices and data deletion" id="data-deletion">
          <p>You can ask to see, correct or delete the information we hold about you. Email <a className="font-semibold text-indigo-700 underline dark:text-indigo-400" href={`mailto:${CONTACT_EMAIL}?subject=Bintang%20CRM%20data%20request`}>{CONTACT_EMAIL}</a> with the phone number or social account you messaged us from. We will confirm and complete deletion within 30 days. You can also stop messaging us at any time, or block our business account in WhatsApp, Messenger or Instagram.</p>
        </Section>

        <Section title="Changes">
          <p>If we change this policy we will update the date at the top of this page.</p>
        </Section>

        <Section title="Contact">
          <p>Bintang Kids · <a className="font-semibold text-indigo-700 underline dark:text-indigo-400" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </Section>
      </div>
    </article>
  </main>
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6">
    <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-[#0E1430] dark:text-white">{title}</h2>
    {children}
  </section>
}
