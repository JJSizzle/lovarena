import { ContactForm } from "@/components/ContactForm";
import { LegalShell } from "@/components/LegalShell";
import { isContactFormConfigured } from "@/lib/email/resend-config";
import { SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Contact & DMCA",
};

export default function ContactPage() {
  const formEnabled = isContactFormConfigured();

  return (
    <LegalShell title="Contact & DMCA">
      {formEnabled ? (
        <>
          <p className="text-slate-300">
            The fastest way to reach us — pick a topic, send a message, and we
            reply to the email you provide. No app install required.
          </p>
          <ContactForm />
        </>
      ) : (
        <p>For support, safety reports, or legal inquiries, email us below.</p>
      )}

      <details className="mt-8 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-300">
          Direct email addresses (optional)
        </summary>
        <p className="mt-3 text-sm text-slate-500">
          These work once you set up free forwarding (about 5 minutes). Run{" "}
          <code className="text-fuchsia-300">npm run setup:email-aliases</code>{" "}
          locally for step-by-step Cloudflare or ImprovMX instructions. Until
          then, use the form above.
        </p>
        <ul className="list-none space-y-2 mt-4 text-sm">
          <li>
            General:{" "}
            <a href="mailto:support@lovarena.app" className="text-fuchsia-400">
              support@lovarena.app
            </a>
          </li>
          <li>
            Safety / abuse:{" "}
            <a href="mailto:safety@lovarena.app" className="text-fuchsia-400">
              safety@lovarena.app
            </a>
          </li>
          <li>
            Privacy:{" "}
            <a href="mailto:privacy@lovarena.app" className="text-fuchsia-400">
              privacy@lovarena.app
            </a>
          </li>
          <li>
            Legal / DMCA:{" "}
            <a href="mailto:legal@lovarena.app" className="text-fuchsia-400">
              legal@lovarena.app
            </a>
          </li>
        </ul>
      </details>

      <h2 className="text-xl font-semibold text-white mt-8">DMCA & copyright</h2>
      <p className="mt-3 text-slate-400 leading-relaxed">
        To submit a copyright takedown notice under the DMCA, use the contact
        form above (topic: Legal / DMCA) or email{" "}
        <a href="mailto:legal@lovarena.app" className="text-fuchsia-400">
          legal@lovarena.app
        </a>{" "}
        with: your contact information, description of the copyrighted work,
        the URL or room details on {SITE_NAME}, a good-faith statement, and your
        physical or electronic signature. We respond to valid notices promptly.
      </p>

      <p className="mt-8">
        For urgent threats of harm, contact local emergency services first,
        then reach us with any relevant room or username details.
      </p>
    </LegalShell>
  );
}
