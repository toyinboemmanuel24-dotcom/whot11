import { Card, CardShape } from '../types/wott';

// Shapes configuration with colors, symbols and display names
export const SHAPE_CONFIG: Record<CardShape, { name: string; symbol: string; color: string; bgClass: string; textClass: string; borderClass: string }> = {
  circle: {
    name: 'Circle',
    symbol: '●',
    color: '#EF4444',
    bgClass: 'bg-red-500',
    textClass: 'text-red-500',
    borderClass: 'border-red-500',
  },
  triangle: {
    name: 'Triangle',
    symbol: '▲',
    color: '#3B82F6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
    borderClass: 'border-blue-500',
  },
  cross: {
    name: 'Cross',
    symbol: '✚',
    color: '#F59E0B',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-500',
    borderClass: 'border-amber-500',
  },
  square: {
    name: 'Square',
    symbol: '■',
    color: '#10B981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-500',
    borderClass: 'border-emerald-500',
  },
  star: {
    name: 'Star',
    symbol: '★',
    color: '#8B5CF6',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-500',
    borderClass: 'border-purple-500',
  },
  whot: {
    name: 'Wott 20',
    symbol: '👑',
    color: '#EC4899',
    bgClass: 'bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-500',
    textClass: 'text-pink-500',
    borderClass: 'border-pink-500',
  },
};

// Check if a card number has special Wott rules
export function getCardAction(num: number): { title?: string; desc?: string; isSpecial: boolean } {
  switch (num) {
    case 1:
      return { isSpecial: true, title: 'Hold On', desc: 'Player plays again' };
    case 2:
      return { isSpecial: true, title: 'Pick 2', desc: 'Next player draws 2 cards' };
    case 5:
      return { isSpecial: true, title: 'Pick 3', desc: 'Next player draws 3 cards' };
    case 8:
      return { isSpecial: true, title: 'Suspension', desc: 'Next player skipped' };
    case 14:
      return { isSpecial: true, title: 'General Market', desc: 'All opponents draw 1' };
    case 20:
      return { isSpecial: true, title: 'Wott (Wildcard)', desc: 'Choose any shape' };
    default:
      return { isSpecial: false };
  }
}

// Generate complete authentic 54-card Nigerian Whot/Wott deck
export function createWottDeck(): Card[] {
  const cards: Card[] = [];
  let idCounter = 1;

  const standardShapes: { shape: CardShape; numbers: number[] }[] = [
    { shape: 'circle', numbers: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14] },
    { shape: 'triangle', numbers: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14] },
    { shape: 'cross', numbers: [1, 2, 3, 5, 7, 10, 11, 13, 14] },
    { shape: 'square', numbers: [1, 2, 3, 5, 7, 10, 11, 13, 14] },
    { shape: 'star', numbers: [1, 2, 3, 4, 5, 7, 8] },
  ];

  // Populate shape cards
  for (const group of standardShapes) {
    for (const num of group.numbers) {
      const action = getCardAction(num);
      cards.push({
        id: `card_${idCounter++}`,
        shape: group.shape,
        number: num,
        isSpecial: action.isSpecial,
        actionTitle: action.title,
        actionDesc: action.desc,
      });
    }
  }

  // Populate 5 Wott 20 wildcard cards
  for (let i = 0; i < 5; i++) {
    const action = getCardAction(20);
    cards.push({
      id: `card_${idCounter++}`,
      shape: 'whot',
      number: 20,
      isSpecial: true,
      actionTitle: action.title,
      actionDesc: action.desc,
    });
  }

  return cards;
}

// Fisher-Yates shuffle
export function shuffleCards(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal 5 cards each and setup market and starter discard
export function dealNewGame(playerIds: string[]): {
  hands: Record<string, Card[]>;
  activeCard: Card;
  discardPile: Card[];
  market: Card[];
} {
  // If player count is high (e.g. 7-8 players), ensure enough cards by combining 1.5 decks
  let deck: Card[] = [];
  if (playerIds.length > 5) {
    deck = [...createWottDeck(), ...createWottDeck().map(c => ({ ...c, id: `${c.id}_alt` }))];
  } else {
    deck = createWottDeck();
  }

  let shuffled = shuffleCards(deck);

  const hands: Record<string, Card[]> = {};
  for (const pid of playerIds) {
    hands[pid] = [];
  }

  // 5 cards each as required by the user prompt
  for (let r = 0; r < 5; r++) {
    for (const pid of playerIds) {
      if (shuffled.length > 0) {
        hands[pid].push(shuffled.pop()!);
      }
    }
  }

  // Pick an active starter card that is not a special action card (e.g. not 1, 2, 5, 8, 14, 20)
  let starterIndex = shuffled.findIndex(c => !c.isSpecial);
  if (starterIndex === -1) starterIndex = 0;

  const activeCard = shuffled.splice(starterIndex, 1)[0];
  const discardPile = [activeCard];

  // The remaining cards form the General Market (at least 30 cards for 2-4 players)
  const market = [...shuffled];

  return {
    hands,
    activeCard,
    discardPile,
    market,
  };
}

// Recycled market draw: if market runs dry, recycle discard pile (excluding top active card)
export function drawCardsWithRecycle(
  currentMarket: Card[],
  currentDiscardPile: Card[],
  count: number
): { drawnCards: Card[]; newMarket: Card[]; newDiscardPile: Card[]; didRecycle: boolean } {
  let market = [...currentMarket];
  let discardPile = [...currentDiscardPile];
  const drawnCards: Card[] = [];
  let didRecycle = false;

  for (let i = 0; i < count; i++) {
    if (market.length === 0) {
      // Recycle discard pile (preserve top card)
      if (discardPile.length > 1) {
        const topCard = discardPile[discardPile.length - 1];
        const cardsToRecycle = discardPile.slice(0, discardPile.length - 1);
        market = shuffleCards(cardsToRecycle);
        discardPile = [topCard];
        didRecycle = true;
      }
    }

    if (market.length > 0) {
      drawnCards.push(market.pop()!);
    } else {
      // No more cards can be drawn even after recycle
      break;
    }
  }

  return {
    drawnCards,
    newMarket: market,
    newDiscardPile: discardPile,
    didRecycle,
  };
}

// Check if a card is legal to play
export function canPlayCard(
  card: Card,
  activeCard: Card,
  declaredShape: CardShape | null
): boolean {
  // Wott 20 wildcard can ALWAYS be played on any card
  if (card.number === 20 || card.shape === 'whot') {
    return true;
  }

  // If Whot 20 was previously played and a shape was declared
  if (declaredShape) {
    return card.shape === declaredShape;
  }

  // Normal matching rule: match either the Shape or the Number
  return card.shape === activeCard.shape || card.number === activeCard.number;
}
