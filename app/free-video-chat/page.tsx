import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata = {
  title: "Free Video Chat with Strangers",
  description: `Free random video chat on ${SITE_NAME}. No download required — talk to strangers in your browser with text and video.`,
  alternates: { canonical: `${SITE_URL}/free-video-chat` },
};

export default function FreeVideoChatPage() {
  return (
    <SeoLandingPage
      title="Free video chat"
      headline="Free video chat in your browser"
      description={`${SITE_NAME} runs in the browser on desktop and mobile. Start a free random video or text chat — no app install required.`}
      bullets={[
        "Works on iPhone, Android, and desktop",
        "Text-only fallback if camera is denied",
        "Ice breakers and interest tags",
        "Voice-only mode available",
        "Add to Home Screen for app-like access",
      ]}
      related={[
        { href: "/video-chat", label: "Random video chat" },
        { href: "/omegle-alternative", label: "Omegle alternative" },
        { href: "/random-chat", label: "Random chat" },
      ]}
    />
  );
}
