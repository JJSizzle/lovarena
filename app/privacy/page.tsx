import { LegalShell } from "@/components/LegalShell";
import { SITE_NAME, SITE_MARK, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This Privacy Policy explains how {SITE_MARK} (&quot;{SITE_NAME}&quot;,
        {SITE_URL}) collects, uses, and protects information when you use our
        video and text chat service.
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
          <strong>Profile & match preferences:</strong> username, how you
          identify, who you want to meet, interests, languages, and related
          matchmaking settings.
        </li>
        <li>
          <strong>Age confirmation:</strong> we record that you confirmed you are
          18+; we do not verify government ID unless we add a separate service
          later.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">
        Cookies & local storage
      </h2>
      <p className="mt-3 text-slate-400 leading-relaxed">
        {SITE_NAME} uses cookies and browser local storage for features that need
        to work without asking every visit. You can use the service without
        optional analytics.
      </p>
      <ul className="list-disc pl-6 space-y-2 mt-4">
        <li>
          <strong>Authentication (cookies):</strong> Supabase session cookies so
          you stay signed in securely.
        </li>
        <li>
          <strong>Age confirmation (local storage):</strong> remembers that you
          confirmed you are 18+ on this device.
        </li>
        <li>
          <strong>Cookie consent (local storage):</strong> stores your choice on
          this banner, including whether optional analytics are allowed.
        </li>
        <li>
          <strong>Match preferences (local storage):</strong> regional or
          worldwide mode and country selection before you enter chat.
        </li>
        <li>
          <strong>Onboarding & referral (local storage):</strong> first-visit tour
          completion and referral codes during sign-up, where applicable.
        </li>
        <li>
          <strong>Optional analytics (local storage, opt-in only):</strong> we do
          not load third-party analytics scripts unless you opt in. If we enable
          them later, they will respect your saved choice.
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
        We use Supabase (database, authentication) and Vercel (hosting) to run
        the service. These providers process data on our behalf under their own
        terms and security practices. We do not sell your personal information.
        We may disclose data if required by law or to protect rights, safety,
        and security.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Retention</h2>
      <p>
        Stranger chat messages may be deleted when a room ends. Private messages
        and account data are kept while your account is active. Reports and
        moderation records may be retained for safety and legal compliance.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Your choices</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          Use {SITE_NAME} with essential cookies and storage only (decline
          optional analytics on the cookie banner)
        </li>
        <li>Update profile and match preferences from your Profile page</li>
        <li>Delete your account from Profile → Delete account</li>
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
