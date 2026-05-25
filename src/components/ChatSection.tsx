import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { ChatMessage, Character, DiscordUser } from '../types';
import JobIcon from './JobIcon';

interface ChatSectionProps {
  raidId: string;
  appId: string;
  customUid: string;
  activeCharacter: Character;
  discordUser: DiscordUser | null;
  isAdminLoggedIn: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  openProfileModal: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}

export default function ChatSection({
  raidId,
  appId,
  customUid,
  activeCharacter,
  discordUser,
  isAdminLoggedIn,
  showToast,
  openProfileModal,
  isChatOpen,
  setIsChatOpen
}: ChatSectionProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [chatOpenedLastReadTime, setChatOpenedLastReadTime] = useState(0);
  const [lastReadTimes, setLastReadTimes] = useState<{ [key: string]: number }>(() => {
    try {
      return JSON.parse(localStorage.getItem('raid_last_read_times') || '{}');
    } catch (e) {
      return {};
    }
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Sync messages from Firestore
  useEffect(() => {
    if (!raidId) {
      setChatMessages([]);
      return;
    }

    const messagesCol = collection(db, `artifacts/${appId}/public/data/raid_messages_${raidId}`);
    const unsubscribe = onSnapshot(messagesCol, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({ id: docSnap.id, ...data } as ChatMessage);
      });

      msgs.sort((a, b) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.timestamp || 0);
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.timestamp || 0);
        return tA - tB;
      });

      setChatMessages(msgs);
    }, (err) => {
      console.error("Failed to load chat messages", err);
    });

    return () => unsubscribe();
  }, [raidId, appId]);

  // Handle unread/read logic
  useEffect(() => {
    if (!raidId) return;

    if (isChatOpen) {
      const lastTime = lastReadTimes[raidId] || Date.now();
      setChatOpenedLastReadTime(lastTime);

      setLastReadTimes(prev => {
        const next = { ...prev, [raidId]: Date.now() };
        localStorage.setItem('raid_last_read_times', JSON.stringify(next));
        return next;
      });
    }
  }, [isChatOpen, raidId]);

  useEffect(() => {
    if (isChatOpen && raidId && chatMessages.length > 0) {
      const latestMsg = chatMessages[chatMessages.length - 1];
      const latestTime = latestMsg.timestamp || (latestMsg.createdAt?.seconds ? latestMsg.createdAt.seconds * 1000 : Date.now());
      
      setLastReadTimes(prev => {
        const currentSaved = prev[raidId] || 0;
        if (latestTime > currentSaved) {
          const next = { ...prev, [raidId]: latestTime + 1 };
          localStorage.setItem('raid_last_read_times', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }
  }, [chatMessages.length, isChatOpen, raidId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!activeCharacter.ign) {
      showToast("請先設定右上角的身分角色卡才能參與討論！", "error");
      openProfileModal();
      return;
    }

    try {
      const textToSend = chatInput.trim();
      setChatInput('');
      
      const messagesCol = collection(db, `artifacts/${appId}/public/data/raid_messages_${raidId}`);
      await addDoc(messagesCol, {
        raidId,
        userId: customUid,
        ign: activeCharacter.ign,
        job: activeCharacter.job,
        level: activeCharacter.level,
        text: textToSend,
        timestamp: Date.now(),
        discord: discordUser || null,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      showToast(`傳送失敗: ${err.message}`, "error");
    }
  };

  const handleRecallMessage = async (msgId: string) => {
    if (!raidId || !msgId) return;
    try {
      const msgRef = doc(db, `artifacts/${appId}/public/data/raid_messages_${raidId}`, msgId);
      await updateDoc(msgRef, {
        recalled: true,
        text: "此訊息已收回"
      });
      showToast("訊息已成功收回！");
    } catch (err: any) {
      showToast(`收回失敗: ${err.message}`, "error");
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!raidId || !msgId) return;
    if (confirm("確定要完全刪除此留言嗎？此操作將自伺服器永久抹除該留言。")) {
      try {
        const msgRef = doc(db, `artifacts/${appId}/public/data/raid_messages_${raidId}`, msgId);
        await deleteDoc(msgRef);
        showToast("該訊息已被完全刪除！");
      } catch (err: any) {
        showToast(`刪除失敗: ${err.message}`, "error");
      }
    }
  };

  const getUnreadCount = () => {
    if (!raidId || isChatOpen) return 0;
    const lastRead = lastReadTimes[raidId] || 0;
    return chatMessages.filter(msg => {
      const msgTime = msg.timestamp || (msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : 0);
      return msgTime > lastRead;
    }).length;
  };

  const unreadCount = getUnreadCount();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4 font-semibold">
      {isChatOpen && (
        <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-5 ${
          isChatMaximized 
            ? "fixed inset-4 md:inset-10 md:m-auto md:w-full md:max-w-4xl md:h-[80vh] h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] z-50" 
            : "h-[500px] w-96 max-w-[calc(100vw-2rem)] max-h-[70vh]"
        }`}>
          <div className="border-b border-slate-800 pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💬</span>
              <h3 className="font-extrabold text-base text-slate-100">遠征即時討論區</h3>
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono">
                {chatMessages.length} 則訊息
              </span>
            </div>
            
            <div className="flex items-center space-x-2.5">
              <span className="text-[10px] text-slate-500 animate-pulse font-mono">● 實時</span>
              
              {/* Maximize toggle */}
              <button 
                type="button"
                onClick={() => setIsChatMaximized(!isChatMaximized)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80 hover:border-slate-700 transition"
                title={isChatMaximized ? "恢復原本大小" : "放大至全螢幕"}
              >
                {isChatMaximized ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>

              {/* Close */}
              <button 
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80 hover:border-slate-700 transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Dialog Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto pr-1 space-y-4 mb-3 scrollbar-thin scrollbar-thumb-slate-800"
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600 italic">
                <span className="text-3xl mb-1">💬</span>
                <p className="text-xs">目前還沒有討論訊息，快來留言確認並協調出團時間吧！</p>
              </div>
            ) : (
              (() => {
                let hasRenderedRedLine = false;
                return chatMessages.map((msg, index) => {
                  const isMe = msg.userId === customUid && msg.ign === activeCharacter.ign;
                  const msgTime = msg.timestamp || (msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : 0);
                  
                  const showRedLine = msgTime > chatOpenedLastReadTime && index > 0 && !hasRenderedRedLine;
                  if (showRedLine) {
                    hasRenderedRedLine = true;
                  }

                  const msgDate = new Date(msgTime);
                  const timeString = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isRecalled = msg.recalled === true;

                  return (
                    <React.Fragment key={msg.id || index}>
                      {showRedLine && (
                        <div className="flex items-center my-4 select-none">
                          <div className="flex-1 border-t-2 border-rose-500/70"></div>
                          <span className="mx-3 text-[10px] font-extrabold text-rose-400 bg-slate-950 border border-rose-500/45 px-3 py-1 rounded-md tracking-wider flex items-center space-x-1.5 shadow-md">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                            <span>以下為新訊息</span>
                            <span className="opacity-50 font-normal font-mono">({timeString})</span>
                          </span>
                          <div className="flex-1 border-t-2 border-rose-500/70"></div>
                        </div>
                      )}

                      <div className={`flex flex-row items-start space-x-2.5 ${isMe ? 'flex-row-reverse space-x-reverse' : ''} group`}>
                        {msg.discord ? (
                          <img 
                            src={msg.discord.avatar} 
                            className="w-9 h-9 rounded-full border border-[#5865F2]/45 shrink-0 mt-1 shadow object-cover" 
                            alt="User DC Avatar"
                          />
                        ) : (
                          <div className="mt-1 shrink-0">
                            <JobIcon jobName={msg.job} sizeClass="w-9 h-9" />
                          </div>
                        )}

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 max-w-[80%]`}>
                          <div className={`flex flex-wrap items-center gap-1.5 text-xs ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="font-extrabold text-slate-100 tracking-wide">{msg.ign}</span>
                            
                            {msg.discord && (
                              <span className="text-[9px] font-extrabold text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                @{msg.discord.username}
                              </span>
                            )}

                            <span className="text-[10px] text-slate-500 font-mono select-none">
                              {timeString}
                            </span>
                          </div>

                          {/* Message box - Ensure valid background color */}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-all ${
                            isMe 
                              ? isRecalled
                                ? 'bg-slate-950 text-slate-500 border border-slate-800/40 rounded-tr-none italic'
                                : 'bg-indigo-600 text-white rounded-tr-none shadow shadow-indigo-650/10' 
                              : isRecalled
                                ? 'bg-slate-950 text-slate-500 border border-slate-800/40 rounded-tl-none italic'
                                : 'bg-slate-950 text-slate-200 rounded-tl-none border border-slate-800'
                          }`}>
                            {isRecalled ? (
                              <span className="flex items-center space-x-1.5 opacity-80 select-none">
                                <span>🚫</span>
                                <span>此訊息已收回</span>
                              </span>
                            ) : (
                              msg.text
                            )}
                          </div>

                          {!isRecalled && (
                            <div className="flex space-x-2 text-[10px] text-slate-500 mt-0.5 opacity-0 group-hover:opacity-100 transition select-none">
                              {isMe && (
                                <button 
                                  type="button" 
                                  onClick={() => handleRecallMessage(msg.id!)}
                                  className="hover:text-indigo-400 hover:underline"
                                >
                                  [收回]
                                </button>
                              )}
                              {isAdminLoggedIn && (
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteMessage(msg.id!)}
                                  className="hover:text-rose-400 hover:underline"
                                >
                                  [刪除]
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>

          {/* Form input - IMPORTANT FIXED styling so typed input text is fully visible on high-contrast container */}
          <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-slate-800/80 pt-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={activeCharacter && activeCharacter.ign ? "輸入訊息與大家討論..." : "請先設定角色卡才能發言"}
              disabled={!activeCharacter || !activeCharacter.ign}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || !activeCharacter || !activeCharacter.ign}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 text-white text-xs font-black px-4 py-2 rounded-xl transition disabled:opacity-40"
            >
              傳送
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Icon */}
      <button
        type="button"
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black p-4 rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center relative group select-none"
      >
        <span className="text-2xl">💬</span>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap font-extrabold text-xs pl-0 group-hover:pl-2">
          遠征即時討論區
        </span>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
