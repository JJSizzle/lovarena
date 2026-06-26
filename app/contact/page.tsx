import { LegalShell } from "@/components/LegalShell";

export const metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <LegalShell title="Contact">
      <p>For support, safety reports, or legal inquiries:</p>
      <ul className="list-none space-y-3 mt-4">
        <li>
          General:{" "}
          <a href="mailto:support@lovarena.app" className="text-sky-400">
            support@lovarena.app
          </a>
        </li>
        <li>
          Safety / abuse:{" "}
          <a href="mailto:safety@lovarena.app" className="text-sky-400">
            safety@lovarena.app
          </a>
        </li>
        <li>
          Privacy:{" "}
          <a href="mailto:privacy@lovarena.app" className="text-sky-400">
            privacy@lovarena.app
          </a>
        </li>
        <li>
          Legal:{" "}
          <a href="mailto:legal@lovarena.app" className="text-sky-400">
            legal@lovarena.app
          </a>
        </li>
      </ul>
      <p className="mt-8">
        For urgent threats of harm, contact local emergency services first,
        then email us with any relevant room or username details.
      </p>
    </LegalShell>
  );
}
