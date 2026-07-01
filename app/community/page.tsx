import { LegalShell } from "@/components/LegalShell";
import { SITE_NAME, SITE_MARK } from "@/lib/site";

export const metadata = {
  title: "Community Guidelines",
};

export default function CommunityPage() {
  return (
    <LegalShell title="Community Guidelines">
      <p>
        {SITE_MARK} (&quot;{SITE_NAME}&quot;) is built for respectful adult
        conversation. These rules apply to stranger chat, video, and private
        messages.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Be respectful</h2>
      <p>
        Treat others as you would in public. Disagreement is fine; targeted
        harassment is not.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Zero tolerance</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Hate speech and slurs</li>
        <li>Threats of violence</li>
        <li>Child sexual abuse material or grooming</li>
        <li>Non-consensual intimate imagery</li>
        <li>Illegal activity</li>
      </ul>
      <p>
        Severe violations may result in immediate chat termination and account
        restriction.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Video &amp; nudity</h2>
      <p>
        Do not broadcast illegal or non-consensual content. Indecent exposure
        may violate local laws and our Terms.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Report &amp; block</h2>
      <p>
        Use in-chat <strong>Report</strong> and <strong>Block</strong> if
        someone makes you uncomfortable. Reports are reviewed by moderators.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Friends &amp; Connect</h2>
      <p>
        Only use ❤️ Connect when you genuinely want to stay in touch. Do not
        pressure others. Private messages must follow the same rules.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Enforcement</h2>
      <p>
        We use automated filters, user reports, and admin review. Penalties
        include warnings, temporary limits, permanent bans, and cooperation
        with law enforcement where required.
      </p>
    </LegalShell>
  );
}
