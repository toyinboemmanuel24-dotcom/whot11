export type CardShape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export interface Card {
  id: string;
  shape: CardShape;
  number: number;
  isSpecial: boolean;
  actionTitle?: string;
  actionDesc?: string;
}

export interface PlayerSummary {
  id: string;
  name: string;
  avatar: string;
  cardCount: number;
  isHost: boolean;
  eliminated: boolean;
  hasTimeoutWarning: boolean;
  consecutiveTimeouts: number;
  isMicActive?: boolean;
  isSpeakerActive?: boolean;
  isBot?: boolean;
}

export interface GameRoom {
  id: string; // Room Code e.g. WOTT-8219
  name: string;
  hostId: string;
  maxPlayers: number; // 2 to 8
  status: 'waiting' | 'in_progress' | 'finished';
  players: PlayerSummary[];
  turnPlayerId: string;
  turnIndex: number;
  direction: 1 | -1;
  activeCard: Card;
  declaredShape: CardShape | null; // Set when Whot 20 is played
  pendingDrawCount: number;
  marketCount: number;
  market: Card[]; // Hidden or authoritative market cards
  discardPile: Card[];
  lastAction: {
    text: string;
    playerId: string;
    playerName: string;
    timestamp: number;
    badgeType?: 'info' | 'alert' | 'market' | 'check' | 'timeout';
  } | null;
  winnerId: string | null;
  winnerName: string | null;
  turnStartedAt: number; // Date.now() timestamp
  turnDuration: number; // 25s normally, 35s if player had a previous timeout warning
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: 'chat' | 'system' | 'action';
  timestamp: number;
  likes?: string[]; // Array of player IDs who liked this message
}

export interface WebRTCSignal {
  id: string;
  roomId: string;
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'candidate';
  payload: string; // JSON stringified data
  timestamp: number;
}
