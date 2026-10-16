import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { ChatMessage, PlayerSummary } from '../types/wott';
import { VoiceChatController } from '../utils/audio';

interface ChatVoiceBarProps {
  roomId: string;
  currentPlayer: { id: string; name: string; avatar: string };
  players: PlayerSummary[];
  onPlayerVoiceUpdate?: (micActive: boolean, speakerActive: boolean) => void;
}

const QUICK_SHOUTS = [
  'General Market! 🛒',
  'Pick 3! 🔥',
  'Pick 2! ✌️',
  'Hold On! ✋',
  'Last Card! 🃏',
  'Oya play! ⏳',
  'Check! 🏆',
  'I have you! 😂',
];

export const ChatVoiceBar: React.FC<ChatVoiceBarProps> = ({
  roomId,
  currentPlayer,
  onPlayerVoiceUpdate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Voice States
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const voiceCtrlRef = useRef<VoiceChatController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Voice Controller
  useEffect(() => {
    voiceCtrlRef.current = new VoiceChatController((speaking) => {
      setIsSpeaking(speaking);
    });

    return () => {
      if (voiceCtrlRef.current) {
        voiceCtrlRef.current.cleanup();
      }
    };
  }, []);

  // Listen to Firestore real-time messages
  useEffect(() => {
    if (!roomId) return;
    const messagesRef = collection(db, `rooms/${roomId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...(doc.data() as Omit<ChatMessage, 'id'>) });
        });
        setMessages(msgs);

        if (!isExpanded && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.senderId !== currentPlayer.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `rooms/${roomId}/messages`);
      }
    );

    return () => unsubscribe();
  }, [roomId, isExpanded, currentPlayer.id]);

  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isExpanded, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !roomId) return;

    try {
      const messagesRef = collection(db, `rooms/${roomId}/messages`);
      await addDoc(messagesRef, {
        roomId,
        senderId: currentPlayer.id,
        senderName: currentPlayer.name,
        senderAvatar: currentPlayer.avatar,
        text,
        type: 'chat',
        timestamp: Date.now(),
      });
      setInputText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/messages`);
    }
  };

  const toggleMic = async () => {
    if (!voiceCtrlRef.current) return;
    setMicError(null);

    if (!isMicOn) {
      // First try to initialize mic if not yet acquired
      const acquired = await voiceCtrlRef.current.initLocalMicrophone();
      if (!acquired) {
        setMicError('Microphone permission needed or unavailable');
        return;
      }
      const active = voiceCtrlRef.current.toggleMic();
      setIsMicOn(active);
      if (onPlayerVoiceUpdate) {
        onPlayerVoiceUpdate(active, isSpeakerOn);
      }
    } else {
      const active = voiceCtrlRef.current.toggleMic();
      setIsMicOn(active);
      if (onPlayerVoiceUpdate) {
        onPlayerVoiceUpdate(active, isSpeakerOn);
      }
    }
  };

  const toggleSpeaker = () => {
    if (!voiceCtrlRef.current) return;
    const active = voiceCtrlRef.current.toggleSpeaker();
    setIsSpeakerOn(active);
    if (onPlayerVoiceUpdate) {
      onPlayerVoiceUpdate(isMicOn, active);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 sm:right-6 z-40 max-w-sm w-[92vw] sm:w-96 flex flex-col justify-end pointer-events-none">
      {/* Expanded Chat Box */}
      {isExpanded && (
        <div className="pointer-events-auto mb-2 bg-stone-900/95 border border-amber-600/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col max-h-[380px] h-[340px] animate-scale-up">
          {/* Header */}
          <div className="px-4 py-2.5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-amber-400" />
              <span className="font-bold text-xs text-amber-200">Table Chat & Reactions</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-stone-400 hover:text-stone-200 text-xs p-1"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Quick Reaction Pills */}
          <div className="p-2 border-b border-stone-800/80 bg-stone-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_SHOUTS.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleSendMessage(phrase)}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-full bg-stone-800 hover:bg-amber-600/30 text-amber-200 hover:text-amber-100 border border-stone-700/60 transition-all cursor-pointer active:scale-95"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-stone-500 py-8 italic text-xs">
                No chat yet. Drop a message or reaction!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentPlayer.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-0.5">
                      <span>{msg.senderAvatar}</span>
                      <span className="font-medium text-stone-300">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-amber-600 text-stone-950 font-medium rounded-tr-none'
                          : 'bg-stone-800 text-stone-100 border border-stone-700/60 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2 bg-stone-950/80 border-t border-stone-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Chat with players..."
              maxLength={200}
              className="flex-1 bg-stone-900 border border-stone-700 text-xs text-stone-100 px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Dock: Chat Launcher + Voice Controls (Mic & Speaker) */}
      <div className="pointer-events-auto flex items-center gap-2 bg-stone-950/90 border border-amber-600/40 p-1.5 rounded-full shadow-2xl backdrop-blur-md self-end">
        {/* Toggle Chat button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/80 hover:bg-stone-800 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
        >
          <MessageSquare size={16} />
          <span className="hidden sm:inline">Chat</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {unreadCount > 0 && !isExpanded && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="w-[1px] h-5 bg-stone-800" />

        {/* Microphone Toggle */}
        <div className="relative group">
          <button
            onClick={toggleMic}
            className={`p-2 rounded-full transition-all cursor-pointer relative ${
              isMicOn
                ? 'bg-emerald-500 text-stone-950 shadow-lg shadow-emerald-500/30'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone (Voice Chat)'}
          >
            {isMicOn ? <Mic size={17} /> : <MicOff size={17} />}
            {isSpeaking && isMicOn && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
            )}
          </button>
          {micError && (
            <div className="absolute bottom-full mb-2 right-0 bg-red-900 border border-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
              {micError}
            </div>
          )}
        </div>

        {/* Speaker Toggle */}
        <button
          onClick={toggleSpeaker}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            isSpeakerOn
              ? 'bg-stone-800/80 text-amber-400 hover:text-amber-300'
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
          }`}
          title={isSpeakerOn ? 'Mute Table Audio' : 'Unmute Table Audio'}
        >
          {isSpeakerOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
      </div>
    </div>
  );
};
