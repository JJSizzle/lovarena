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
      <p>For support, safety reports, or legal inquiries:</p>
      <ul className="list-none space-y-3 mt-4">
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

      {formEnabled ? (
        <>
          <h2 className="text-xl font-semibold text-white mt-8">Send a message</h2>
          <p className="text-slate-400">
            Or use the form below — we reply to the email you provide.
          </p>
          <ContactForm />
        </>
      ) : null}

      <h2 className="text-xl font-semibold text-white mt-8">DMCA & copyright</h2>
      <p className="mt-3 text-slate-400 leading-relaxed">
        To submit a copyright takedown notice under the DMCA, email{" "}
        <a href="mailto:legal@lovarena.app" className="text-fuchsia-400">
          legal@lovarena.app
        </a>{" "}
        with: your contact information, description of the copyrighted work,
        the URL or room details on {SITE_NAME}, a good-faith statement, and your
        physical or electronic signature. We respond to valid notices promptly.
      </p>

      <p className="mt-8">
        For urgent threats of harm, contact local emergency services first,
        then email us with any relevant room or username details.
      </p>
    </LegalShell>
  );
}
