import React, { useState, useEffect, useRef } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  db,
  auth,
  signInWithGoogle,
  logOut,
  onAuthUserChanged,
  testConnection,
  handleFirestoreError,
  OperationType,
} from './firebase/config';
import { User } from 'firebase/auth';
import { Card, CardShape, GameRoom, PlayerSummary } from './types/wott';
import {
  dealNewGame,
  drawCardsWithRecycle,
  canPlayCard,
} from './utils/wottDeck';
import { LobbyView } from './components/LobbyView';
import { GameBoard } from './components/GameBoard';
import { ChatVoiceBar } from './components/ChatVoiceBar';
import { RulesModal } from './components/RulesModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('wott_player_name') || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem('wott_player_avatar') || '🦁';
  });

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);

  const [isCreatingOrJoining, setIsCreatingOrJoining] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const botTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Firebase Auth & test connection on mount
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthUserChanged((user) => {
      setCurrentUser(user);
      if (user) {
        setCurrentUserId(user.uid);
        if (!localStorage.getItem('wott_player_name') && user.displayName) {
          setUserName(user.displayName);
        }
      } else {
        setCurrentUserId('');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsCreatingOrJoining(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      setCurrentUserId(user.uid);
      if (user.displayName) {
        setUserName(user.displayName);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (!errorMsg.includes('popup-closed-by-user')) {
        setErrorMessage('Google Sign-In failed or was cancelled. Please try again.');
      }
    } finally {
      setIsCreatingOrJoining(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setCurrentUser(null);
      setCurrentUserId('');
      setRoom(null);
      setCurrentRoomId(null);
    } catch {
      // Ignore
    }
  };

  // Save profile to local storage
  useEffect(() => {
    localStorage.setItem('wott_player_name', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('wott_player_avatar', userAvatar);
  }, [userAvatar]);

  // Subscribe to real-time room updates in Firestore
  useEffect(() => {
    if (!currentRoomId) return;

    const roomRef = doc(db, 'rooms', currentRoomId);
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRoom(snapshot.data() as GameRoom);
        } else {
          setErrorMessage('Game room does not exist or has closed.');
          setRoom(null);
          setCurrentRoomId(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `rooms/${currentRoomId}`);
      }
    );

    return () => unsubscribe();
  }, [currentRoomId]);

  // Subscribe to player's private hand in subcollection
  useEffect(() => {
    if (!currentRoomId || !currentUserId) return;

    const handRef = doc(db, `rooms/${currentRoomId}/playerHands`, currentUserId);
    const unsubscribe = onSnapshot(
      handRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setPlayerHand(data.cards || []);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `rooms/${currentRoomId}/playerHands/${currentUserId}`);
      }
    );

    return () => unsubscribe();
  }, [currentRoomId, currentUserId]);

  // AI Bot automated moves (Host acts as executor for AI bots)
  useEffect(() => {
    if (!room || room.status !== 'in_progress' || room.hostId !== currentUserId) {
      return;
    }

    const currentTurnPlayer = room.players.find((p) => p.id === room.turnPlayerId);
    if (!currentTurnPlayer || !currentTurnPlayer.isBot || currentTurnPlayer.eliminated) {
      return;
    }

    // Schedule realistic bot move
    if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);

    botTurnTimeoutRef.current = setTimeout(async () => {
      try {
        // Fetch bot's hand
        const botHandRef = doc(db, `rooms/${room.id}/playerHands`, currentTurnPlayer.id);
        const snap = await getDoc(botHandRef);
        if (!snap.exists()) return;

        const botCards: Card[] = snap.data().cards || [];
        const playable = botCards.filter((c) =>
          canPlayCard(c, room.activeCard, room.declaredShape)
        );

        if (playable.length > 0) {
          // Bot prefers special cards or matching number/shape
          const cardToPlay = playable.find((c) => c.isSpecial) || playable[0];
          let declared: CardShape | undefined = undefined;
          if (cardToPlay.number === 20) {
            const shapes: CardShape[] = ['circle', 'triangle', 'cross', 'square', 'star'];
            declared = shapes[Math.floor(Math.random() * shapes.length)];
          }
          await executePlayerMove(currentTurnPlayer.id, botCards, cardToPlay, declared);
        } else {
          // Bot goes to market
          await executeDrawAction(currentTurnPlayer.id, botCards);
        }
      } catch (err) {
        console.error('Bot turn failed:', err);
      }
    }, 1800);

    return () => {
      if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
    };
  }, [room?.turnPlayerId, room?.status, room?.hostId, currentUserId]);

  // Create Room
  const handleCreateRoom = async (maxPlayers: number) => {
    setErrorMessage(null);
    let uid = currentUserId;

    if (!currentUser || !uid) {
      setIsCreatingOrJoining(true);
      try {
        const user = await signInWithGoogle();
        setCurrentUser(user);
        setCurrentUserId(user.uid);
        uid = user.uid;
        if (user.displayName) {
          setUserName(user.displayName);
        }
      } catch {
        setIsCreatingOrJoining(false);
        setErrorMessage('Please sign in with Google to create a room.');
        return;
      }
    }

    setIsCreatingOrJoining(true);

    try {
      const roomCode = `WOTT-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPlayer: PlayerSummary = {
        id: uid,
        name: userName.trim() || 'Player 1',
        avatar: userAvatar,
        cardCount: 5,
        isHost: true,
        eliminated: false,
        hasTimeoutWarning: false,
        consecutiveTimeouts: 0,
        isMicActive: false,
        isSpeakerActive: true,
      };

      const newRoom: GameRoom = {
        id: roomCode,
        name: `Wott Table ${roomCode}`,
        hostId: uid,
        maxPlayers,
        status: 'waiting',
        players: [newPlayer],
        turnPlayerId: uid,
        turnIndex: 0,
        direction: 1,
        activeCard: {
          id: 'starter',
          shape: 'circle',
          number: 7,
          isSpecial: false,
        },
        declaredShape: null,
        pendingDrawCount: 0,
        marketCount: 30,
        market: [],
        discardPile: [],
        lastAction: null,
        winnerId: null,
        winnerName: null,
        turnStartedAt: Date.now(),
        turnDuration: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'rooms', roomCode), newRoom);
      setCurrentRoomId(roomCode);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'rooms');
      setErrorMessage('Could not create game room. Please try again.');
    } finally {
      setIsCreatingOrJoining(false);
    }
  };

  // Join Room
  const handleJoinRoom = async (roomCode: string) => {
    if (!roomCode.trim()) return;
    const cleanCode = roomCode.trim().toUpperCase();
    setErrorMessage(null);
    let uid = currentUserId;

    if (!currentUser || !uid) {
      setIsCreatingOrJoining(true);
      try {
        const user = await signInWithGoogle();
        setCurrentUser(user);
        setCurrentUserId(user.uid);
        uid = user.uid;
        if (user.displayName) {
          setUserName(user.displayName);
        }
      } catch {
        setIsCreatingOrJoining(false);
        setErrorMessage('Please sign in with Google to enter a room.');
        return;
      }
    }

    setIsCreatingOrJoining(true);

    try {
      const roomRef = doc(db, 'rooms', cleanCode);
      const snapshot = await getDoc(roomRef);

      if (!snapshot.exists()) {
        setErrorMessage(`Room "${cleanCode}" was not found. Please check the code.`);
        return;
      }

      const existingRoom = snapshot.data() as GameRoom;

      // Check if player is already in room
      const alreadyIn = existingRoom.players.some((p) => p.id === uid);

      if (!alreadyIn) {
        if (existingRoom.status !== 'waiting') {
          setErrorMessage('This game is already in progress.');
          return;
        }

        if (existingRoom.players.length >= existingRoom.maxPlayers) {
          setErrorMessage('This room is full.');
          return;
        }

        const newPlayer: PlayerSummary = {
          id: uid,
          name: userName.trim() || `Player ${existingRoom.players.length + 1}`,
          avatar: userAvatar,
          cardCount: 5,
          isHost: false,
          eliminated: false,
          hasTimeoutWarning: false,
          consecutiveTimeouts: 0,
          isMicActive: false,
          isSpeakerActive: true,
        };

        await updateDoc(roomRef, {
          players: [...existingRoom.players, newPlayer],
          updatedAt: new Date().toISOString(),
        });
      }

      setCurrentRoomId(cleanCode);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${cleanCode}`);
      setErrorMessage('Could not join room. Please check permissions.');
    } finally {
      setIsCreatingOrJoining(false);
    }
  };

  // Add AI Bot to room (Host only)
  const handleAddBot = async () => {
    if (!room || room.hostId !== currentUserId) return;
    if (room.players.length >= room.maxPlayers) return;

    try {
      const botIndex = room.players.length;
      const botNames = ['Kemi Bot', 'Chidi AI', 'Amina Bot', 'Emeka AI', 'Zainab Bot'];
      const botAvatars = ['🤖', '🦊', '🦉', '🐺', '🐉'];

      const botPlayer: PlayerSummary = {
        id: `bot_${Date.now()}_${botIndex}`,
        name: botNames[botIndex % botNames.length],
        avatar: botAvatars[botIndex % botAvatars.length],
        cardCount: 5,
        isHost: false,
        eliminated: false,
        hasTimeoutWarning: false,
        consecutiveTimeouts: 0,
        isBot: true,
      };

      await updateDoc(doc(db, 'rooms', room.id), {
        players: [...room.players, botPlayer],
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // Start Game (Deals 5 cards each, sets up 30 card market)
  const handleStartGame = async () => {
    if (!room || room.hostId !== currentUserId) return;

    try {
      const playerIds = room.players.map((p) => p.id);
      const { hands, activeCard, discardPile, market } = dealNewGame(playerIds);

      // Save each player's private hand
      for (const pid of playerIds) {
        await setDoc(doc(db, `rooms/${room.id}/playerHands`, pid), {
          playerId: pid,
          roomId: room.id,
          cards: hands[pid] || [],
          updatedAt: new Date().toISOString(),
        });
      }

      // Update room state
      const updatedPlayers: PlayerSummary[] = room.players.map((p) => ({
        ...p,
        cardCount: 5,
        eliminated: false,
        hasTimeoutWarning: false,
        consecutiveTimeouts: 0,
      }));

      await updateDoc(doc(db, 'rooms', room.id), {
        status: 'in_progress',
        players: updatedPlayers,
        turnPlayerId: room.players[0].id,
        turnIndex: 0,
        direction: 1,
        activeCard,
        declaredShape: null,
        pendingDrawCount: 0,
        marketCount: market.length,
        market,
        discardPile,
        turnStartedAt: Date.now(),
        turnDuration: 25,
        lastAction: {
          text: `Game started! First card is ${activeCard.number} ${activeCard.shape}`,
          playerId: room.players[0].id,
          playerName: room.players[0].name,
          timestamp: Date.now(),
          badgeType: 'info',
        },
        winnerId: null,
        winnerName: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // Helper to get next active player
  const getNextPlayerIndex = (
    currentIndex: number,
    players: PlayerSummary[],
    skipCount: number = 1
  ): number => {
    const total = players.length;
    let nextIdx = currentIndex;

    for (let step = 0; step < skipCount; step++) {
      let count = 0;
      do {
        nextIdx = (nextIdx + 1) % total;
        count++;
      } while (players[nextIdx].eliminated && count <= total);
    }

    return nextIdx;
  };

  // Execute Player Move
  const executePlayerMove = async (
    actingPlayerId: string,
    actingHand: Card[],
    card: Card,
    declaredShape?: CardShape
  ) => {
    if (!room) return;

    try {
      const remainingHand = actingHand.filter((c) => c.id !== card.id);

      // Update player's private hand
      await setDoc(doc(db, `rooms/${room.id}/playerHands`, actingPlayerId), {
        playerId: actingPlayerId,
        roomId: room.id,
        cards: remainingHand,
        updatedAt: new Date().toISOString(),
      });

      const currentIdx = room.players.findIndex((p) => p.id === actingPlayerId);
      const actingPlayer = room.players[currentIdx];

      // Check win condition (CHECK!)
      if (remainingHand.length === 0) {
        const updatedPlayers = room.players.map((p) =>
          p.id === actingPlayerId ? { ...p, cardCount: 0 } : p
        );

        await updateDoc(doc(db, 'rooms', room.id), {
          status: 'finished',
          winnerId: actingPlayerId,
          winnerName: actingPlayer.name,
          players: updatedPlayers,
          activeCard: card,
          discardPile: [...room.discardPile, card],
          lastAction: {
            text: `🏆 CHECK! ${actingPlayer.name} emptied their hand and won!`,
            playerId: actingPlayerId,
            playerName: actingPlayer.name,
            timestamp: Date.now(),
            badgeType: 'check',
          },
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      // Handle Special Card Effects
      let newMarket = [...room.market];
      let newDiscardPile = [...room.discardPile, card];
      let nextIndex = currentIdx;
      let actionText = `${actingPlayer.name} played ${card.shape} ${card.number}`;

      // Reset timeout warnings on successful play
      let updatedPlayers = room.players.map((p) => {
        if (p.id === actingPlayerId) {
          return {
            ...p,
            cardCount: remainingHand.length,
            hasTimeoutWarning: false,
            consecutiveTimeouts: 0,
          };
        }
        return p;
      });

      // Special Rules
      if (card.number === 1) {
        // HOLD ON: Same player plays again!
        actionText = `✋ HOLD ON! ${actingPlayer.name} plays again!`;
        nextIndex = currentIdx;
      } else if (card.number === 2) {
        // PICK 2: Next player draws 2 cards from General Market
        const targetIdx = getNextPlayerIndex(currentIdx, updatedPlayers, 1);
        const targetPlayer = updatedPlayers[targetIdx];

        const drawRes = drawCardsWithRecycle(newMarket, newDiscardPile, 2);
        newMarket = drawRes.newMarket;
        newDiscardPile = drawRes.newDiscardPile;

        // Add 2 cards to target's hand
        const targetHandSnap = await getDoc(
          doc(db, `rooms/${room.id}/playerHands`, targetPlayer.id)
        );
        const currentTargetCards: Card[] = targetHandSnap.exists()
          ? targetHandSnap.data().cards || []
          : [];

        await setDoc(doc(db, `rooms/${room.id}/playerHands`, targetPlayer.id), {
          playerId: targetPlayer.id,
          roomId: room.id,
          cards: [...currentTargetCards, ...drawRes.drawnCards],
          updatedAt: new Date().toISOString(),
        });

        updatedPlayers = updatedPlayers.map((p) =>
          p.id === targetPlayer.id
            ? { ...p, cardCount: currentTargetCards.length + drawRes.drawnCards.length }
            : p
        );

        actionText = `✌️ PICK 2! ${targetPlayer.name} drew 2 cards from General Market!`;
        nextIndex = getNextPlayerIndex(targetIdx, updatedPlayers, 1);
      } else if (card.number === 5) {
        // PICK 3: Next player draws 3 cards from General Market
        const targetIdx = getNextPlayerIndex(currentIdx, updatedPlayers, 1);
        const targetPlayer = updatedPlayers[targetIdx];

        const drawRes = drawCardsWithRecycle(newMarket, newDiscardPile, 3);
        newMarket = drawRes.newMarket;
        newDiscardPile = drawRes.newDiscardPile;

        const targetHandSnap = await getDoc(
          doc(db, `rooms/${room.id}/playerHands`, targetPlayer.id)
        );
        const currentTargetCards: Card[] = targetHandSnap.exists()
          ? targetHandSnap.data().cards || []
          : [];

        await setDoc(doc(db, `rooms/${room.id}/playerHands`, targetPlayer.id), {
          playerId: targetPlayer.id,
          roomId: room.id,
          cards: [...currentTargetCards, ...drawRes.drawnCards],
          updatedAt: new Date().toISOString(),
        });

        updatedPlayers = updatedPlayers.map((p) =>
          p.id === targetPlayer.id
            ? { ...p, cardCount: currentTargetCards.length + drawRes.drawnCards.length }
            : p
        );

        actionText = `🔥 PICK 3! ${targetPlayer.name} drew 3 cards from General Market!`;
        nextIndex = getNextPlayerIndex(targetIdx, updatedPlayers, 1);
      } else if (card.number === 8) {
        // SUSPENSION: Skip next player
        const skippedIdx = getNextPlayerIndex(currentIdx, updatedPlayers, 1);
        const skippedPlayer = updatedPlayers[skippedIdx];
        nextIndex = getNextPlayerIndex(currentIdx, updatedPlayers, 2);
        actionText = `⛔️ SUSPENSION! ${skippedPlayer.name} was skipped!`;
      } else if (card.number === 14) {
        // GENERAL MARKET: All active opponents draw 1 card each!
        for (let i = 0; i < updatedPlayers.length; i++) {
          const opp = updatedPlayers[i];
          if (opp.id !== actingPlayerId && !opp.eliminated) {
            const drawRes = drawCardsWithRecycle(newMarket, newDiscardPile, 1);
            newMarket = drawRes.newMarket;
            newDiscardPile = drawRes.newDiscardPile;

            const oppHandSnap = await getDoc(
              doc(db, `rooms/${room.id}/playerHands`, opp.id)
            );
            const oppCards: Card[] = oppHandSnap.exists()
              ? oppHandSnap.data().cards || []
              : [];

            await setDoc(doc(db, `rooms/${room.id}/playerHands`, opp.id), {
              playerId: opp.id,
              roomId: room.id,
              cards: [...oppCards, ...drawRes.drawnCards],
              updatedAt: new Date().toISOString(),
            });

            updatedPlayers = updatedPlayers.map((p) =>
              p.id === opp.id
                ? { ...p, cardCount: oppCards.length + drawRes.drawnCards.length }
                : p
            );
          }
        }
        actionText = `🛒 GENERAL MARKET! Everyone drew 1 card from Market!`;
        nextIndex = getNextPlayerIndex(currentIdx, updatedPlayers, 1);
      } else if (card.number === 20) {
        // WOTT WILDCARD: Shape declared
        actionText = `👑 WOTT 20! ${actingPlayer.name} called for ${declaredShape?.toUpperCase()}!`;
        nextIndex = getNextPlayerIndex(currentIdx, updatedPlayers, 1);
      } else {
        // Normal card
        nextIndex = getNextPlayerIndex(currentIdx, updatedPlayers, 1);
      }

      const nextPlayer = updatedPlayers[nextIndex];
      // If next player has timeout warning, grant them 35s grace; otherwise normal 25s
      const nextTurnDuration = nextPlayer.hasTimeoutWarning ? 35 : 25;

      await updateDoc(doc(db, 'rooms', room.id), {
        activeCard: card,
        declaredShape: card.number === 20 ? declaredShape || null : null,
        discardPile: newDiscardPile,
        market: newMarket,
        marketCount: newMarket.length,
        players: updatedPlayers,
        turnPlayerId: nextPlayer.id,
        turnIndex: nextIndex,
        turnStartedAt: Date.now(),
        turnDuration: nextTurnDuration,
        lastAction: {
          text: actionText,
          playerId: actingPlayerId,
          playerName: actingPlayer.name,
          timestamp: Date.now(),
          badgeType: 'info',
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // Draw Card action (Go to General Market)
  const executeDrawAction = async (actingPlayerId: string, actingHand: Card[]) => {
    if (!room) return;

    try {
      const drawRes = drawCardsWithRecycle(room.market, room.discardPile, 1);
      const updatedHand = [...actingHand, ...drawRes.drawnCards];

      await setDoc(doc(db, `rooms/${room.id}/playerHands`, actingPlayerId), {
        playerId: actingPlayerId,
        roomId: room.id,
        cards: updatedHand,
        updatedAt: new Date().toISOString(),
      });

      const currentIdx = room.players.findIndex((p) => p.id === actingPlayerId);
      const actingPlayer = room.players[currentIdx];

      // Reset timeout warning upon voluntary draw
      let updatedPlayers = room.players.map((p) =>
        p.id === actingPlayerId
          ? {
              ...p,
              cardCount: updatedHand.length,
              hasTimeoutWarning: false,
              consecutiveTimeouts: 0,
            }
          : p
      );

      const nextIndex = getNextPlayerIndex(currentIdx, updatedPlayers, 1);
      const nextPlayer = updatedPlayers[nextIndex];
      const nextTurnDuration = nextPlayer.hasTimeoutWarning ? 35 : 25;

      let recycleNote = drawRes.didRecycle ? ' (Market reshuffled from discard pile!)' : '';

      await updateDoc(doc(db, 'rooms', room.id), {
        market: drawRes.newMarket,
        discardPile: drawRes.newDiscardPile,
        marketCount: drawRes.newMarket.length,
        players: updatedPlayers,
        turnPlayerId: nextPlayer.id,
        turnIndex: nextIndex,
        turnStartedAt: Date.now(),
        turnDuration: nextTurnDuration,
        lastAction: {
          text: `${actingPlayer.name} drew 1 card from General Market${recycleNote}`,
          playerId: actingPlayerId,
          playerName: actingPlayer.name,
          timestamp: Date.now(),
          badgeType: 'market',
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // Handle Timeout (25s with +1 card and 35s grace round, 2nd consecutive timeout eliminates)
  const handleTimeout = async (timedOutPlayerId: string) => {
    if (!room || room.status !== 'in_progress') return;

    try {
      const playerIdx = room.players.findIndex((p) => p.id === timedOutPlayerId);
      if (playerIdx === -1) return;

      const player = room.players[playerIdx];
      if (player.eliminated) return;

      // Check if player already had a timeout warning (Consecutive timeout in their 35s round!)
      if (player.hasTimeoutWarning) {
        // ELIMINATE PLAYER!
        const updatedPlayers = room.players.map((p) =>
          p.id === timedOutPlayerId ? { ...p, eliminated: true } : p
        );

        // Check if only 1 active player remains
        const activeRemaining = updatedPlayers.filter((p) => !p.eliminated);
        if (activeRemaining.length <= 1) {
          const winner = activeRemaining[0] || player;
          await updateDoc(doc(db, 'rooms', room.id), {
            status: 'finished',
            winnerId: winner.id,
            winnerName: winner.name,
            players: updatedPlayers,
            lastAction: {
              text: `🚨 ${player.name} timed out twice consecutively and was ELIMINATED! ${winner.name} wins by default!`,
              playerId: timedOutPlayerId,
              playerName: player.name,
              timestamp: Date.now(),
              badgeType: 'timeout',
            },
            updatedAt: new Date().toISOString(),
          });
          return;
        }

        // Advance to next active player
        const nextIndex = getNextPlayerIndex(playerIdx, updatedPlayers, 1);
        const nextPlayer = updatedPlayers[nextIndex];
        const nextDuration = nextPlayer.hasTimeoutWarning ? 35 : 25;

        await updateDoc(doc(db, 'rooms', room.id), {
          players: updatedPlayers,
          turnPlayerId: nextPlayer.id,
          turnIndex: nextIndex,
          turnStartedAt: Date.now(),
          turnDuration: nextDuration,
          lastAction: {
            text: `🚨 ${player.name} ran out of 35s time and was ELIMINATED!`,
            playerId: timedOutPlayerId,
            playerName: player.name,
            timestamp: Date.now(),
            badgeType: 'timeout',
          },
          updatedAt: new Date().toISOString(),
        });
      } else {
        // First timeout: +1 penalty card, flag with hasTimeoutWarning = true, next round timer will be 35s!
        const drawRes = drawCardsWithRecycle(room.market, room.discardPile, 1);

        const handSnap = await getDoc(
          doc(db, `rooms/${room.id}/playerHands`, timedOutPlayerId)
        );
        const currentCards: Card[] = handSnap.exists()
          ? handSnap.data().cards || []
          : [];

        const updatedCards = [...currentCards, ...drawRes.drawnCards];

        await setDoc(doc(db, `rooms/${room.id}/playerHands`, timedOutPlayerId), {
          playerId: timedOutPlayerId,
          roomId: room.id,
          cards: updatedCards,
          updatedAt: new Date().toISOString(),
        });

        const updatedPlayers = room.players.map((p) =>
          p.id === timedOutPlayerId
            ? {
                ...p,
                cardCount: updatedCards.length,
                hasTimeoutWarning: true,
                consecutiveTimeouts: 1,
              }
            : p
        );

        const nextIndex = getNextPlayerIndex(playerIdx, updatedPlayers, 1);
        const nextPlayer = updatedPlayers[nextIndex];
        const nextDuration = nextPlayer.hasTimeoutWarning ? 35 : 25;

        await updateDoc(doc(db, 'rooms', room.id), {
          market: drawRes.newMarket,
          discardPile: drawRes.newDiscardPile,
          marketCount: drawRes.newMarket.length,
          players: updatedPlayers,
          turnPlayerId: nextPlayer.id,
          turnIndex: nextIndex,
          turnStartedAt: Date.now(),
          turnDuration: nextDuration,
          lastAction: {
            text: `⏱️ ${player.name} ran out of time! +1 penalty card added. Next round timer: 35s`,
            playerId: timedOutPlayerId,
            playerName: player.name,
            timestamp: Date.now(),
            badgeType: 'timeout',
          },
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // Rematch / New Round
  const handleRematch = async () => {
    if (!room || room.hostId !== currentUserId) return;
    await handleStartGame();
  };

  // Sync mic/speaker status to room doc
  const handlePlayerVoiceUpdate = async (micActive: boolean, speakerActive: boolean) => {
    if (!room || !currentUserId) return;

    try {
      const updatedPlayers = room.players.map((p) =>
        p.id === currentUserId
          ? { ...p, isMicActive: micActive, isSpeakerActive: speakerActive }
          : p
      );

      await updateDoc(doc(db, 'rooms', room.id), {
        players: updatedPlayers,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Non-critical update
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Background African geometric ambient design */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-2 sm:p-4 z-10">
        {!room || room.status === 'waiting' ? (
          <LobbyView
            room={room}
            currentUser={currentUser}
            currentUserId={currentUserId}
            userName={userName}
            setUserName={setUserName}
            userAvatar={userAvatar}
            setUserAvatar={setUserAvatar}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartGame={handleStartGame}
            onAddBot={handleAddBot}
            onOpenRules={() => setShowRulesModal(true)}
            onSignInWithGoogle={handleGoogleSignIn}
            onSignOut={handleSignOut}
            isCreatingOrJoining={isCreatingOrJoining}
            errorMessage={errorMessage}
            clearError={() => setErrorMessage(null)}
          />
        ) : (
          <GameBoard
            room={room}
            currentPlayerId={currentUserId}
            playerHand={playerHand}
            onPlayCard={(card, declaredShape) =>
              executePlayerMove(currentUserId, playerHand, card, declaredShape)
            }
            onDrawFromMarket={() => executeDrawAction(currentUserId, playerHand)}
            onHandleTimeout={handleTimeout}
            onRematch={handleRematch}
            onOpenRules={() => setShowRulesModal(true)}
            isHost={room.hostId === currentUserId}
          />
        )}
      </main>

      {/* Chat & Voice Floating Bar (Active whenever inside a room) */}
      {room && (
        <ChatVoiceBar
          roomId={room.id}
          currentPlayer={{
            id: currentUserId,
            name: userName,
            avatar: userAvatar,
          }}
          players={room.players}
          onPlayerVoiceUpdate={handlePlayerVoiceUpdate}
        />
      )}

      {/* Rules Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
