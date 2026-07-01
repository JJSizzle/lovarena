import { LegalShell } from "@/components/LegalShell";
import { SITE_NAME, SITE_MARK, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        By using {SITE_MARK} (&quot;{SITE_NAME}&quot;) at {SITE_URL}, you agree to
        these Terms. If you do not agree, do not use the service.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Eligibility</h2>
      <p>
        You must be at least <strong>18 years old</strong> to use {SITE_NAME}.
        By confirming your age and creating an account, you represent that you
        meet this requirement.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Acceptable use</h2>
      <p>You agree not to:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Harass, threaten, or harm others</li>
        <li>Share hate speech, slurs, or illegal content</li>
        <li>Share sexual content involving minors (zero tolerance)</li>
        <li>Spam, scrape, or attack the platform</li>
        <li>Impersonate others or evade bans</li>
        <li>Record or distribute others&apos; chats without consent where prohibited by law</li>
      </ul>
      <p>
        See our{" "}
        <a href="/community" className="text-sky-400">
          Community Guidelines
        </a>{" "}
        for details.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Account &amp; moderation</h2>
      <p>
        We may suspend or terminate accounts, end chats, filter messages, or
        restrict access if you violate these Terms or our guidelines. Automated
        and human review may be used.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Stranger chat disclaimer</h2>
      <p>
        {SITE_NAME} connects you with random strangers. We do not control user
        behavior. Use at your own risk. Do not share personal information
        (address, financial details, passwords) with strangers.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Disclaimer of warranties</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of any kind.
        We do not guarantee uninterrupted or error-free operation.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {SITE_NAME} and its operators
        are not liable for indirect, incidental, or consequential damages
        arising from your use of the service or interactions with other users.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Changes</h2>
      <p>
        We may update these Terms. Continued use after changes constitutes
        acceptance. Material changes will be reflected on this page.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Contact</h2>
      <p>
        <a href="mailto:legal@lovarena.app" className="text-sky-400">
          legal@lovarena.app
        </a>
      </p>

      <p className="text-xs text-slate-500 mt-10">
        Not legal advice. Have a lawyer review before relying on this for
        commercial or regulated use.
      </p>
    </LegalShell>
  );
}
