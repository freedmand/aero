export interface Card {
  question: string;
  answer: string;
}

export async function fetchAndMergeDecks(...urls: string[]): Promise<Card[]> {
  const decks = await Promise.all(urls.map((url) => fetchDeck(url)));
  return shuffle(decks.flat());
}

export async function fetchDeck(url: string): Promise<Card[]> {
  const deckResponse = await fetch(url);
  return parseDeck(await deckResponse.text());
}

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export function parseDeck(text: string): Card[] {
  const lines = text.split("\n");
  const deck: Card[] = [];
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (line.trim().length === 0) continue;
    const [question, answer] = line.split("\t");
    deck.push({ question, answer });
  }
  return shuffle(deck);
}
