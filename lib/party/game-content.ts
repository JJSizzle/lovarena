export const PARTY_PROMPTS = [
  "What's a hill you'll die on that most people disagree with?",
  "What's the most unhinged thing you've done for a crush?",
  "If your life were a movie genre, what would it be?",
  "What's a skill you pretend to have but absolutely don't?",
  "What's your most controversial food opinion?",
  "What's the weirdest compliment you've ever received?",
  "If you could swap lives with a friend for a day, who and why?",
  "What's something you believed way too long as a kid?",
  "What's your go-to karaoke song — be honest?",
  "What's a trend you secretly love but won't admit?",
  "What's the best advice you've ignored?",
  "If you had to delete one app forever, which one goes?",
  "What's your toxic trait — but make it cute?",
  "What's a place that changed how you see the world?",
  "What's something you're proud of that sounds small?",
  "Who in this room would survive longest in a zombie apocalypse?",
  "What's your most used emoji and what does it say about you?",
  "What's a friendship rule you live by?",
  "What's the pettiest reason you've stopped talking to someone?",
  "If you could add one rule to Lovarena, what would it be?",
  "What's a song that instantly changes your mood?",
  "What's something you wish people asked you about more?",
  "What's your comfort show when everything's chaotic?",
  "What's the best spontaneous decision you've ever made?",
  "What's a hot take about dating in 2026?",
] as const;

export type TriviaQuestion = {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctId: string;
};

export const PARTY_TRIVIA: TriviaQuestion[] = [
  {
    id: "t1",
    question: "Which planet is known as the Red Planet?",
    options: [
      { id: "a", text: "Venus" },
      { id: "b", text: "Mars" },
      { id: "c", text: "Jupiter" },
      { id: "d", text: "Saturn" },
    ],
    correctId: "b",
  },
  {
    id: "t2",
    question: "What year did the first iPhone launch?",
    options: [
      { id: "a", text: "2005" },
      { id: "b", text: "2007" },
      { id: "c", text: "2009" },
      { id: "d", text: "2011" },
    ],
    correctId: "b",
  },
  {
    id: "t3",
    question: "Which animal is the largest mammal on Earth?",
    options: [
      { id: "a", text: "African elephant" },
      { id: "b", text: "Blue whale" },
      { id: "c", text: "Giraffe" },
      { id: "d", text: "Polar bear" },
    ],
    correctId: "b",
  },
  {
    id: "t4",
    question: "What does 'HTTP' stand for?",
    options: [
      { id: "a", text: "HyperText Transfer Protocol" },
      { id: "b", text: "High Tech Transfer Process" },
      { id: "c", text: "Home Tool Transfer Protocol" },
      { id: "d", text: "Hyperlink Text Transmission" },
    ],
    correctId: "a",
  },
  {
    id: "t5",
    question: "Which country invented pizza as we know it today?",
    options: [
      { id: "a", text: "USA" },
      { id: "b", text: "Greece" },
      { id: "c", text: "Italy" },
      { id: "d", text: "France" },
    ],
    correctId: "c",
  },
  {
    id: "t6",
    question: "How many continents are there?",
    options: [
      { id: "a", text: "5" },
      { id: "b", text: "6" },
      { id: "c", text: "7" },
      { id: "d", text: "8" },
    ],
    correctId: "c",
  },
  {
    id: "t7",
    question: "What gas do plants absorb from the atmosphere?",
    options: [
      { id: "a", text: "Oxygen" },
      { id: "b", text: "Nitrogen" },
      { id: "c", text: "Carbon dioxide" },
      { id: "d", text: "Hydrogen" },
    ],
    correctId: "c",
  },
  {
    id: "t8",
    question: "Which streaming platform released 'Stranger Things'?",
    options: [
      { id: "a", text: "Hulu" },
      { id: "b", text: "Netflix" },
      { id: "c", text: "Disney+" },
      { id: "d", text: "HBO Max" },
    ],
    correctId: "b",
  },
  {
    id: "t9",
    question: "What's the capital of Australia?",
    options: [
      { id: "a", text: "Sydney" },
      { id: "b", text: "Melbourne" },
      { id: "c", text: "Canberra" },
      { id: "d", text: "Brisbane" },
    ],
    correctId: "c",
  },
  {
    id: "t10",
    question: "Which element has the chemical symbol 'Au'?",
    options: [
      { id: "a", text: "Silver" },
      { id: "b", text: "Gold" },
      { id: "c", text: "Aluminum" },
      { id: "d", text: "Argon" },
    ],
    correctId: "b",
  },
  {
    id: "t11",
    question: "In chess, which piece can only move diagonally?",
    options: [
      { id: "a", text: "Rook" },
      { id: "b", text: "Knight" },
      { id: "c", text: "Bishop" },
      { id: "d", text: "Queen" },
    ],
    correctId: "c",
  },
  {
    id: "t12",
    question: "What is the hardest natural substance on Earth?",
    options: [
      { id: "a", text: "Gold" },
      { id: "b", text: "Iron" },
      { id: "c", text: "Diamond" },
      { id: "d", text: "Quartz" },
    ],
    correctId: "c",
  },
];

export function pickPrompt(roundIndex: number, usedIndices: number[]): string {
  const available = PARTY_PROMPTS.map((_, i) => i).filter(
    (i) => !usedIndices.includes(i)
  );
  const pool =
    available.length > 0
      ? available
      : PARTY_PROMPTS.map((_, i) => i);
  const idx = pool[roundIndex % pool.length] ?? 0;
  return PARTY_PROMPTS[idx] ?? PARTY_PROMPTS[0];
}

export function pickTrivia(roundIndex: number): TriviaQuestion {
  return PARTY_TRIVIA[roundIndex % PARTY_TRIVIA.length] ?? PARTY_TRIVIA[0];
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
