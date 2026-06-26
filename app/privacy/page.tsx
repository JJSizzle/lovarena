import { LegalShell } from "@/components/LegalShell";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This Privacy Policy explains how {SITE_NAME} ({SITE_URL}) collects, uses,
        and protects information when you use our video and text chat service.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Information we collect</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Account data:</strong> email address, username, and authentication
          identifiers when you create an account.
        </li>
        <li>
          <strong>Chat data:</strong> messages in stranger rooms (until the room
          ends), private messages between friends, and moderation flags.
        </li>
        <li>
          <strong>Technical data:</strong> IP address, browser type, device
          information, and logs for security and rate limiting.
        </li>
        <li>
          <strong>Video:</strong> WebRTC video streams are peer-to-peer where
          possible and are not stored on our servers by default.
        </li>
        <li>
          <strong>Age confirmation:</strong> we record that you confirmed you are
          18+; we do not verify government ID unless we add a separate service
          later.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">How we use information</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Provide matching, chat, friends, and account features</li>
        <li>Enforce Community Guidelines and block abusive content</li>
        <li>Investigate reports and protect user safety</li>
        <li>Prevent spam, fraud, and attacks (rate limiting)</li>
        <li>Improve and secure the service</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">Sharing</h2>
      <p>
        We use Supabase and Vercel to host the service. We do not sell your
        personal information. We may disclose data if required by law or to
        protect rights, safety, and security.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Retention</h2>
      <p>
        Stranger chat messages may be deleted when a room ends. Private messages
        and account data are kept while your account is active. Reports and
        moderation records may be retained for safety and legal compliance.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Your choices</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Delete your account by contacting us (see Contact page)</li>
        <li>Block users you do not wish to interact with</li>
        <li>Report users who violate our rules</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">Children</h2>
      <p>
        {SITE_NAME} is for adults 18+ only. We do not knowingly collect data
        from anyone under 18. If you believe a minor is using the service,
        report it immediately.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:privacy@lovarena.app" className="text-sky-400">
          privacy@lovarena.app
        </a>
      </p>

      <p className="text-xs text-slate-500 mt-10">
        This document is provided for transparency and is not legal advice.
        Consult a qualified attorney for compliance in your jurisdiction.
      </p>
    </LegalShell>
  );
}
