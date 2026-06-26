export const iceBreakers = [
  "If you could only eat one food for the rest of your life, what is it?",
  "What is the most bizarre dream you've ever had?",
  "Would you rather travel 100 years into the past or 100 years into the future?",
  "What is your absolute biggest pet peeve?",
  "If you won the lottery tomorrow, what is the very first thing you would buy?",
  "What is a movie you can watch over and over without getting tired of it?",
  "If you could have any superpower, but it only worked for 5 minutes a day, what would it be?",
  "What's the most spontaneous thing you've ever done?",
];

export function randomIceBreaker(): string {
  return iceBreakers[Math.floor(Math.random() * iceBreakers.length)];
}
