import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SeoLandingPage } from "@/components/SeoLandingPage";

export const metadata = {
  title: "Random Chat — Meet New People Online",
  description: `Start a random chat on ${SITE_NAME}. Meet new people worldwide or in your region with video, text, and smart match preferences.`,
  alternates: { canonical: `${SITE_URL}/random-chat` },
};

export default function RandomChatPage() {
  return (
    <SeoLandingPage
      title="Random chat"
      headline="Random chat with real people"
      description={`Skip the small talk roulette — ${SITE_NAME} matches you using orientation preferences, interests, and languages so random chats feel more relevant.`}
      bullets={[
        "Worldwide arena or regional matchmaking",
        "Interest and language tags on your profile",
        "Thumbs up/down feedback after chats",
        "Daily streaks and reputation score",
        "Private messages with friends you connect with",
      ]}
      related={[
        { href: "/talk-to-strangers", label: "Talk to strangers" },
        { href: "/free-video-chat", label: "Free video chat" },
        { href: "/blog/ice-breaker-questions", label: "Ice breaker ideas" },
      ]}
    />
  );
}
