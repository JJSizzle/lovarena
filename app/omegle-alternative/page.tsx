import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata = {
  title: "Omegle Alternative — Random Video Chat",
  description: `Looking for an Omegle alternative? ${SITE_NAME} offers random video and text chat with moderation, face blur, regional matchmaking, and friends.`,
  alternates: { canonical: `${SITE_URL}/omegle-alternative` },
};

export default function OmegleAlternativePage() {
  return (
    <SeoLandingPage
      title="Omegle alternative"
      headline="A safer Omegle-style video chat"
      description={`${SITE_NAME} is built for adults who want random conversations with real moderation tools — report, block, optional face blur, and orientation-aware matching.`}
      bullets={[
        "18+ verified community",
        "Regional or worldwide matchmaking",
        "Report, block, and admin review",
        "Optional blur until both reveal video",
        "Add friends and message after you connect",
      ]}
      related={[
        { href: "/random-chat", label: "Random chat" },
        { href: "/free-video-chat", label: "Free video chat" },
        { href: "/talk-to-strangers", label: "Talk to strangers" },
      ]}
    />
  );
}
