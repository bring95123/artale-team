import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { 
  Boss, 
  Profile, 
  DiscordConfig, 
  DiscordUser, 
  DEFAULT_JOB_CATEGORIES, 
  DEFAULT_BOSS_LIST,
  AuthorizedAdmin
} from './types';

// Modular component imports
import JobIcon from './components/JobIcon';
import GachaSection from './components/GachaSection';
import ChatSection from './components/ChatSection';
import { ProfileModal, BossManagerModal, JobManagerModal, VoterDetailModal } from './components/Modals';
import { AdminConsoleModal } from './components/AdminConsole';
import SynergyAnalyzer from './components/SynergyAnalyzer';
import FortuneDashboard from './components/FortuneDashboard';
import DiscordThreadModal from './components/DiscordThreadModal';
import InteractiveCardModal from './components/InteractiveCardModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { DropTableSection } from './components/DropTableSection';
import { MobileNavDrawer } from './components/MobileNavDrawer';

// Helper to format date times beautifully
const formatDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  if (!dateTimeStr.includes('T')) return dateTimeStr;
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${year}-${month}-${day} (${weekdays[date.getDay()]}) ${hours}:${minutes}`;
  } catch (e) {
    return dateTimeStr;
  }
};

export default function App() {
  const [appId] = useState('artale-expedition-default');
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [customUid, setCustomUid] = useState<string | null>(() => {
    return localStorage.getItem('nyxshade_custom_uid') || null;
  });

  const [user, setUser] = useState<any>(null);

  // Theme State (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('nyxshade_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('nyxshade_theme', theme);
    } catch (e) {}
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      body.classList.remove('light');
      body.classList.add('dark');
    }
  }, [theme]);

  // States
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(() => {
    try {
      const stored = localStorage.getItem('discord_user_profile');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [discordConfig, setDiscordConfig] = useState<DiscordConfig>({
    clientId: '1508031863263068190',
    redirectUri: window.location.origin + window.location.pathname,
    mode: 'implicit',
    apiEndpoint: '',
    webhookUrl: ''
  });

  const [jobCategories, setJobCategories] = useState(DEFAULT_JOB_CATEGORIES);
  const [bosses, setBosses] = useState<Boss[]>(DEFAULT_BOSS_LIST);
  const [raids, setRaids] = useState<any[]>([]);
  const [fortunes, setFortunes] = useState<any[]>([]);
  const [currentRaidId, setCurrentRaidId] = useState<string | null>(null);
  const [lobbyTab, setLobbyTab] = useState<'recruitment' | 'gacha' | 'drop_table'>('recruitment');

  const [profile, setProfile] = useState<Profile>({
    activeCharacterIndex: 0,
    characters: [{ ign: '', job: '主教', level: 120, memo: '' }],
    discord: null
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const activeCharacter = profile.characters?.[profile.activeCharacterIndex] || profile.characters?.[0] || { ign: '', job: '主教', level: 120, memo: '' };

  // Modal Control States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBossManagerModal, setShowBossManagerModal] = useState(false);
  const [showJobManagerModal, setShowJobManagerModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [voterDetailModal, setVoterDetailModal] = useState<{ isOpen: boolean; voter: any }>({ isOpen: false, voter: null });

  // Discord Thread Modal State
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [threadPartyKey, setThreadPartyKey] = useState<string>('1');
  const [threadTitle, setThreadTitle] = useState<string>('');
  const [threadMessage, setThreadMessage] = useState<string>('');
  const [threadMembers, setThreadMembers] = useState<any[]>([]);
  const [isSendingThread, setIsSendingThread] = useState(false);

  // Discord Interactive Card Modal State
  const [showInteractiveModal, setShowInteractiveModal] = useState(false);

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newRaid, setNewRaid] = useState({
    title: '',
    bossId: 'zakum_normal',
    notes: '',
    proposedTimes: [''],
    mode: 'datetime',
    partyCount: 1
  });

  // Edit State
  const [isEditingRaid, setIsEditingRaid] = useState(false);
  const [editRaidData, setEditRaidData] = useState({
    title: '',
    bossId: 'zakum_normal',
    notes: '',
    proposedTimes: [''],
    mode: 'datetime',
    partyCount: 1
  });

  // Floating Chat control
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Issue Report State
  const [showIssueReportModal, setShowIssueReportModal] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'blocker' | 'bug' | 'suggestion'>('bug');
  const [isSendingIssue, setIsSendingIssue] = useState(false);

  // File uploading states
  const [isUploadingTools, setIsUploadingTools] = useState(false);

  // Hidden admin click triggers
  const [hiddenResetClicks, setHiddenResetClicks] = useState(0);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('artale_is_admin') === 'true';
  });
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Authorized Admins state & real-time sync
  const [authorizedAdmins, setAuthorizedAdmins] = useState<AuthorizedAdmin[]>([]);

  useEffect(() => {
    if (!db) return;
    const adminsCol = collection(db, `artifacts/${appId}/public/data/authorized_admins`);
    const unsubscribe = onSnapshot(adminsCol, (snapshot) => {
      const list: AuthorizedAdmin[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AuthorizedAdmin);
      });
      setAuthorizedAdmins(list);
    }, (err) => console.error("Sync authorized admins failed:", err));

    return () => unsubscribe();
  }, [appId]);

  const isAuthorizedAdmin = React.useMemo(() => {
    if (!authorizedAdmins || authorizedAdmins.length === 0) return false;
    const myIgn = (activeCharacter.ign || '').trim().toLowerCase();
    const myDcId = (discordUser?.id || '').trim();
    const myDcUsername = (discordUser?.username || '').trim().toLowerCase();
    const myUid = (customUid || '').trim();

    return authorizedAdmins.some(admin => {
      const adminIgn = (admin.ign || '').trim().toLowerCase();
      const adminDcId = (admin.discordId || '').trim();
      const adminDcUsername = (admin.discordUsername || '').trim().toLowerCase();
      const adminUid = (admin.customUid || '').trim();

      if (myIgn && adminIgn && myIgn === adminIgn) return true;
      if (myDcId && adminDcId && myDcId === adminDcId) return true;
      if (myDcUsername && adminDcUsername && myDcUsername === adminDcUsername) return true;
      if (myUid && adminUid && myUid === adminUid) return true;
      return false;
    });
  }, [authorizedAdmins, activeCharacter.ign, discordUser, customUid]);

  const isAdmin = isAdminLoggedIn || isAuthorizedAdmin;

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Sign In / Firebase Init
  useEffect(() => {
    if (!auth || !db) {
      setDbStatus('connecting');
      return;
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error: any) {
        console.error("Firebase Login Failed:", error);
        setDbStatus('error');
        showToast(`連線失敗: ${error.message}`, "error");
      }
    };

    initAuth();

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDbStatus('connected');
        if (!localStorage.getItem('nyxshade_custom_uid')) {
          localStorage.setItem('nyxshade_custom_uid', currentUser.uid);
          setCustomUid(currentUser.uid);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. Sync Discord Configuration
  useEffect(() => {
    if (!db || !user) return;
    const configRef = doc(db, `artifacts/${appId}/public/data/discord/config`);
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DiscordConfig;
        setDiscordConfig(data);
        if (data.publicKey) {
          fetch('/api/discord/set-public-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: data.publicKey })
          }).catch(e => console.warn("Failed to sync DC key:", e));
        }
      } else {
        const defaultConf: DiscordConfig = {
          clientId: '1508031863263068190',
          redirectUri: window.location.origin + window.location.pathname,
          mode: 'implicit',
          apiEndpoint: '',
          webhookUrl: ''
        };
        setDoc(configRef, defaultConf).catch(e => console.error(e));
        setDiscordConfig(defaultConf);
      }
    }, (err) => console.error("Discord Config loading failed", err));

    return () => unsubscribe();
  }, [db, user]);

  // 2. Intercept Discord Redirect Hash token
  useEffect(() => {
    const handleDiscordToken = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        setDbStatus('connecting');
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          showToast("🔄 正在向 Discord 伺服器申請身分證明...", "info");
          try {
            const response = await fetch('https://discord.com/api/users/@me', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error("Discord Token verification failed");
            const discordData = await response.json();
            
            const discordId = discordData.id;
            const username = discordData.global_name || discordData.username;
            const avatar = discordData.avatar 
              ? `https://cdn.discordapp.com/avatars/${discordId}/${discordData.avatar}.png`
              : `https://cdn.discordapp.com/embed/avatars/${Number(discordId) % 5}.png`;

            const boundProfile: DiscordUser = { id: discordId, username, avatar };
            
            localStorage.setItem('nyxshade_custom_uid', discordId);
            localStorage.setItem('discord_user_profile', JSON.stringify(boundProfile));
            
            setCustomUid(discordId);
            setDiscordUser(boundProfile);
            showToast(`🎉 Discord 驗證並綁定成功：${username}！`);
            
            window.location.hash = "";
            setTimeout(() => window.location.reload(), 1000);
          } catch (err) {
            console.error(err);
            showToast("Discord 驗證登入失敗，請重新嘗試", "error");
          }
        }
      }
    };
    handleDiscordToken();
  }, []);

  // 3. Sync Custom Bosses list
  useEffect(() => {
    if (!db) return;
    const bossesCol = collection(db, `artifacts/${appId}/public/data/bosses`);
    const unsubscribe = onSnapshot(bossesCol, (snapshot) => {
      const customList: Boss[] = [];
      snapshot.forEach((docSnap) => {
        customList.push({ id: docSnap.id, ...docSnap.data() } as Boss);
      });
      const merged = [...DEFAULT_BOSS_LIST];
      customList.forEach(cb => {
        const idx = merged.findIndex(b => b.id === cb.id);
        if (idx > -1) {
          merged[idx] = cb;
        } else {
          merged.push(cb);
        }
      });
      setBosses(merged);
    }, (err) => console.error("Sync custom bosses failed", err));

    return () => unsubscribe();
  }, [db]);

  // 4. Sync custom job tiers
  useEffect(() => {
    if (!db) return;
    const jobFieldRef = doc(db, `artifacts/${appId}/public/data/jobs/config`);
    const unsubscribe = onSnapshot(jobFieldRef, (docSnap) => {
      if (docSnap.exists()) {
        const dbJobs = docSnap.data();
        setJobCategories(dbJobs as any);
      } else {
        setDoc(jobFieldRef, DEFAULT_JOB_CATEGORIES).catch(err => console.error(err));
        setJobCategories(DEFAULT_JOB_CATEGORIES);
      }
    }, (err) => console.error("Sync custom jobs failed", err));

    return () => unsubscribe();
  }, [db]);

  // 5. Sync ongoing list of expeditions (Raid list)
  useEffect(() => {
    if (!db) return;
    const raidsCol = collection(db, `artifacts/${appId}/public/data/raids`);
    const unsubscribe = onSnapshot(raidsCol, (snapshot) => {
      const raidsData: any[] = [];
      snapshot.forEach((docSnap) => {
        raidsData.push({ id: docSnap.id, ...docSnap.data() });
      });
      raidsData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime; // Newest first
      });
      setRaids(raidsData);
    }, (error) => {
      console.error("Raids loading failed:", error);
    });

    return () => unsubscribe();
  }, [db]);

  // Synchronize fortunes database list in real-time
  useEffect(() => {
    if (!db) return;
    const fortunesCol = collection(db, `artifacts/${appId}/public/data/fortunes`);
    const unsubscribe = onSnapshot(fortunesCol, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setFortunes(list);
    }, (err) => console.error("Sync fortunes failed", err));

    return () => unsubscribe();
  }, [db]);

  // Sync Registered Users & Character Cards to Backend Server for Discord Interaction Pre-loading
  useEffect(() => {
    if (!db) return;
    const usersCol = collection(db, `artifacts/${appId}/public/data/registered_users`);
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const rosterMap: Record<string, any> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const discordId = data.discord?.id || (data.userId?.startsWith('dc_') ? data.userId.replace('dc_', '') : '') || '';
        const entry = {
          userId: data.userId || docSnap.id,
          username: data.discord?.username || data.username || data.characters?.[0]?.ign || '',
          avatar: data.discord?.avatar || data.avatar || '',
          characters: data.characters || [],
          activeCharacterIndex: data.activeCharacterIndex || 0,
          discord: data.discord || null
        };
        if (discordId) {
          rosterMap[discordId] = entry;
          rosterMap[`dc_${discordId}`] = entry;
        }
        rosterMap[docSnap.id] = entry;
        if (data.userId) {
          rosterMap[data.userId] = entry;
        }
      });
      if (Object.keys(rosterMap).length > 0) {
        fetch('/api/discord/sync-roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registeredUsers: rosterMap })
        }).catch(e => console.warn("Failed to sync roster to server:", e));
      }
    }, (err) => console.error("Sync registered users failed", err));

    return () => unsubscribe();
  }, [db]);

  // Sync Raid Statuses (Figure 2 Survey Data) to Server
  useEffect(() => {
    if (!raids || raids.length === 0) return;
    for (const r of raids) {
      const raidBoss = bosses.find(b => b.id === r.bossId);
      const participants = r.participants || [];
      const party1 = participants.filter((p: any) => p.party === '1');
      const party2 = participants.filter((p: any) => p.party === '2');
      const party3 = participants.filter((p: any) => p.party === '3');
      const reserves = participants.filter((p: any) => p.party === 'reserve');
      const interestVotes = r.votes || [];
      const yesVotes = interestVotes.filter((v: any) => v.votes?.['interest'] === 'yes' || Object.values(v.votes || {}).includes('yes'));
      const noVotes = interestVotes.filter((v: any) => v.votes?.['interest'] === 'no' || (Object.values(v.votes || {}).includes('no') && !Object.values(v.votes || {}).includes('yes')));

      fetch('/api/discord/sync-raid-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raidId: r.id,
          title: r.title,
          bossName: raidBoss?.name.split(' (')[0] || r.title,
          partyCount: r.partyCount || 1,
          targetCount: raidBoss?.maxPlayers || 12,
          leaderName: r.creatorIgn || '團長',
          customNote: r.notes || '',
          yesVotes: yesVotes.map((v: any) => ({
            ign: v.ign,
            job: v.job,
            level: v.level,
            discordId: v.discord?.id || v.discordId || (v.userId?.startsWith('dc_') ? v.userId.replace('dc_', '') : ''),
            username: v.discord?.username || ''
          })),
          noVotes: noVotes.map((v: any) => ({
            ign: v.ign,
            job: v.job,
            level: v.level,
            discordId: v.discord?.id || v.discordId || (v.userId?.startsWith('dc_') ? v.userId.replace('dc_', '') : ''),
            username: v.discord?.username || ''
          })),
          party1: party1.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId })),
          party2: party2.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId })),
          party3: party3.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId })),
          reserves: reserves.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId }))
        })
      }).catch(e => {});
    }
  }, [raids, bosses]);

  // 6. Sync active character profile
  useEffect(() => {
    if (!db || !customUid) return;
    const profileRef = doc(db, `artifacts/${appId}/users/${customUid}/profile/info`);
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          let loadedProfile: Profile;
          
          if (data.characters && data.characters.length > 0) {
            loadedProfile = {
              activeCharacterIndex: Number(data.activeCharacterIndex) || 0,
              characters: data.characters,
              discord: data.discord || discordUser || null
            };
          } else {
            loadedProfile = {
              activeCharacterIndex: 0,
              characters: [{
                ign: data.ign || '',
                job: data.job || '主教',
                level: Number(data.level) || 120,
                memo: ''
              }],
              discord: data.discord || discordUser || null
            };
          }
          setProfile(loadedProfile);

          // Synchronize profile to server store for Discord interactions
          const syncDcId = loadedProfile.discord?.id || discordUser?.id || (customUid?.startsWith('dc_') ? customUid.replace('dc_', '') : '');
          if (syncDcId && loadedProfile.characters?.length > 0) {
            fetch('/api/discord/sync-user-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                discordId: syncDcId,
                username: loadedProfile.discord?.username || discordUser?.username || loadedProfile.characters[0]?.ign || "Adventurer",
                avatar: loadedProfile.discord?.avatar || discordUser?.avatar || "",
                characters: loadedProfile.characters,
                activeCharacterIndex: loadedProfile.activeCharacterIndex
              })
            }).catch(() => {});
          }
        } else {
          // Open Modal for first-time use
          setShowProfileModal(true);
        }
        setProfileLoaded(true);
      } catch (err) {
        console.error("Load user profile failed", err);
      }
    };

    fetchProfile();
  }, [db, customUid, discordUser]);

  // Auto-sync Discord interactive signups in real-time when viewing a raid
  useEffect(() => {
    if (!currentRaidId) return;
    handleSyncDiscordSignups(currentRaidId, true);
    const timer = setInterval(() => {
      handleSyncDiscordSignups(currentRaidId, true);
    }, 3500);
    return () => clearInterval(timer);
  }, [currentRaidId, raids]);

  // Keep floating chat closed by default (only opened when user clicks the floating button)
  useEffect(() => {
    if (!currentRaidId) {
      setIsChatOpen(false);
    }
  }, [currentRaidId]);

  const getDiscordLoginUrl = () => {
    if (!discordConfig || !discordConfig.clientId) return '#';
    const clientId = discordConfig.clientId;
    const rUri = discordConfig.redirectUri || (window.location.origin + window.location.pathname);
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(rUri)}&response_type=token&scope=identify`;
  };

  const handleDisconnectDiscord = () => {
    if (confirm("確定要解除與 Discord 的帳號連結嗎？解除後將回復匿名身分。")) {
      localStorage.removeItem('discord_user_profile');
      const anonUid = crypto.randomUUID();
      localStorage.setItem('nyxshade_custom_uid', anonUid);
      setCustomUid(anonUid);
      setDiscordUser(null);
      showToast("已成功解除 Discord 連結狀態。");
      window.location.reload();
    }
  };

  // Reset core DB firebase config
  const handleResetConfig = () => {
    if (confirm("確定要重置並清除這台電腦上的資料庫和神籤快取嗎？網頁隨後將自動重新整理。")) {
      localStorage.removeItem('artale_firebase_config');
      localStorage.removeItem('nyxshade_custom_uid');
      localStorage.removeItem('discord_user_profile');
      localStorage.removeItem('nyxshade_last_gacha_time');
      localStorage.removeItem('nyxshade_last_gacha_result');
      window.location.reload();
    }
  };

  // Click Guild helper text 5 times for hidden trigger
  const handleSecretClick = () => {
    setHiddenResetClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        handleResetConfig();
        return 0;
      }
      return next;
    });
  };

  // Admin login details
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername.toLowerCase() === 'admin' && adminPassword === 'nyxshade') {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem('artale_is_admin', 'true');
      setShowAdminLoginModal(false);
      setAdminUsername('');
      setAdminPassword('');
      showToast("🔑 管理者權限驗證成功！已啟用後台控制。");
      setShowAdminConsole(true);
    } else {
      showToast("帳號或密碼錯誤，請重新確認！", "error");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('artale_is_admin');
    setShowAdminConsole(false);
    showToast("已成功登出管理者模式。");
  };

  // Create new raid session
  const handleCreateRaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (!activeCharacter.ign) {
      showToast("請先設定您的遊戲 ID！", "error");
      setShowProfileModal(true);
      return;
    }

    const filteredTimes = newRaid.mode === 'interest' 
      ? [] 
      : newRaid.proposedTimes.filter(t => t.trim() !== '');

    if (newRaid.mode !== 'interest' && filteredTimes.length === 0) {
      showToast("請至少填寫一個候選時間！", "error");
      return;
    }

    try {
      const raidsCol = collection(db, `artifacts/${appId}/public/data/raids`);
      await addDoc(raidsCol, {
        title: newRaid.title,
        bossId: newRaid.bossId,
        notes: newRaid.notes,
        proposedTimes: filteredTimes,
        mode: newRaid.mode || 'datetime',
        partyCount: Number(newRaid.partyCount) || 1,
        creatorId: customUid,
        creatorIgn: activeCharacter.ign,
        createdAt: serverTimestamp(),
        participants: [],
        votes: []
      });
      setNewRaid({ title: '', bossId: 'zakum_normal', notes: '', proposedTimes: [''], mode: 'datetime', partyCount: 1 });
      setIsCreating(false);
      showToast("成功發起遠征隊揪團！");
    } catch (err: any) {
      showToast(`建立失敗: ${err.message}`, "error");
    }
  };

  const startEditingRaid = () => {
    if (!activeRaid) return;
    setEditRaidData({
      title: activeRaid.title || '',
      bossId: activeRaid.bossId || 'zakum_normal',
      notes: activeRaid.notes || '',
      proposedTimes: [...(activeRaid.proposedTimes || [''])],
      mode: activeRaid.mode || 'datetime',
      partyCount: activeRaid.partyCount || 1
    });
    setIsEditingRaid(true);
  };

  const handleSaveRaidEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !currentRaidId) return;

    const filteredTimes = editRaidData.mode === 'interest'
      ? []
      : editRaidData.proposedTimes.filter(t => t.trim() !== '');

    if (editRaidData.mode !== 'interest' && filteredTimes.length === 0) {
      showToast("請至少填寫一個候選時間！", "error");
      return;
    }

    try {
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${currentRaidId}`);
      await updateDoc(raidRef, {
        title: editRaidData.title,
        bossId: editRaidData.bossId,
        notes: editRaidData.notes,
        proposedTimes: filteredTimes,
        mode: editRaidData.mode || 'datetime',
        partyCount: Number(editRaidData.partyCount) || 1
      });
      setIsEditingRaid(false);
      showToast("遠征隊資訊與模式修改成功！");
    } catch (err: any) {
      showToast(`修改失敗: ${err.message}`, "error");
    }
  };

  const handleDeleteRaid = (raidId: string) => {
    if (confirm("確定要刪除此遠征隊嗎？此操作不可逆，將清空所有分組與投票。")) {
      try {
        const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
        deleteDoc(raidRef);
        if (currentRaidId === raidId) setCurrentRaidId(null);
        showToast("已刪除該遠征隊。");
      } catch (err) {
        showToast("刪除失敗", "error");
      }
    }
  };

  const handleResetRaid = (raidId: string) => {
    if (confirm("確定要重置此團出團名單嗎？這會清空所有的錄取分組成員，但保留討論紀錄。")) {
      try {
        const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
        updateDoc(raidRef, {
          participants: [],
          votes: []
        });
        showToast("出團排班名單與投票已全部歸零！");
      } catch (err) {
        showToast("重置名單失敗", "error");
      }
    }
  };

  const handleVoteTime = async (raidId: string, timeIndex: number | string, choice: 'yes' | 'maybe' | 'no') => {
    if (!activeCharacter.ign) {
      showToast("請先點擊右上角設定您的遊戲角色卡才能進行投票！", "error");
      setShowProfileModal(true);
      return;
    }
    const raid = raids.find(r => r.id === raidId);
    if (!raid) return;

    try {
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
      let updatedVotes = [...(raid.votes || [])];
      
      const userVoteIndex = updatedVotes.findIndex(v => 
        (v.ign && v.ign.trim().toLowerCase() === activeCharacter.ign.trim().toLowerCase()) ||
        (v.userId === customUid && v.ign === activeCharacter.ign)
      );

      if (userVoteIndex > -1) {
        const userVote = { ...updatedVotes[userVoteIndex] };
        userVote.ign = activeCharacter.ign;
        userVote.job = activeCharacter.job;
        userVote.level = activeCharacter.level;
        userVote.memo = (activeCharacter.memo || '').trim();
        userVote.discord = discordUser || userVote.discord || null;

        if (userVote.votes && userVote.votes[timeIndex] === choice) {
          // Toggle OFF (Cancel)
          const nextVotes = { ...userVote.votes };
          delete nextVotes[timeIndex];
          userVote.votes = nextVotes;

          const activeVotesCount = Object.values(nextVotes).length;
          if (activeVotesCount === 0) {
            updatedVotes = updatedVotes.filter((_, idx) => idx !== userVoteIndex);
          } else {
            updatedVotes[userVoteIndex] = userVote;
          }
          await updateDoc(raidRef, { votes: updatedVotes });

          // Synchronously remove from server store & update Discord message embed
          fetch('/api/discord/remove-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              raidId,
              ign: activeCharacter.ign,
              userId: customUid,
              discordId: discordUser?.id
            })
          }).catch(err => console.warn("Failed to sync remove signup", err));

          showToast(`已取消【${activeCharacter.ign}】的出團登記！`);
        } else {
          // Change/Update to choice
          userVote.votes = { ...userVote.votes, [timeIndex]: choice };
          updatedVotes[userVoteIndex] = userVote;
          await updateDoc(raidRef, { votes: updatedVotes });

          if (choice === 'yes') {
            fetch('/api/discord/record-web-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                raidId,
                ign: activeCharacter.ign,
                job: activeCharacter.job,
                level: activeCharacter.level,
                memo: (activeCharacter.memo || '').trim(),
                userId: customUid,
                discordId: discordUser?.id
              })
            }).catch(err => console.warn("Failed to record web signup", err));
          }

          showToast(`🟢 已為【${activeCharacter.ign}】登記可以配合，並同步至 Discord！`, "success");
        }
      } else {
        // First-time vote
        updatedVotes.push({
          userId: customUid,
          ign: activeCharacter.ign,
          job: activeCharacter.job,
          level: activeCharacter.level,
          memo: (activeCharacter.memo || '').trim(),
          discord: discordUser || null,
          votes: { [timeIndex]: choice }
        });
        await updateDoc(raidRef, { votes: updatedVotes });

        if (choice === 'yes') {
          fetch('/api/discord/record-web-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              raidId,
              ign: activeCharacter.ign,
              job: activeCharacter.job,
              level: activeCharacter.level,
              memo: (activeCharacter.memo || '').trim(),
              userId: customUid,
              discordId: discordUser?.id
            })
          }).catch(err => console.warn("Failed to record web signup", err));
        }

        showToast(`🟢 成功為【${activeCharacter.ign}】登記可以配合，並同步至 Discord！`, "success");
      }
    } catch (err: any) {
      showToast(`更新失敗: ${err.message}`, "error");
    }
  };

  const handleFinalizeTime = async (raidId: string, timeIndex: number) => {
    if (!db || !raidId || !activeRaid) return;
    try {
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
      const nextIndex = activeRaid.finalTimeIndex === timeIndex ? null : timeIndex;
      await updateDoc(raidRef, { finalTimeIndex: nextIndex });
      showToast(nextIndex !== null ? "已成功確定最終出團時間！" : "已取消確定時間。");
    } catch (err: any) {
      showToast(`設定失敗: ${err.message}`, "error");
    }
  };

  const handleRemoveVote = async (raidId: string, targetUserId: string, targetIgn: string, targetJob: string) => {
    if (confirm(`確定要剔除【${targetIgn}】的意願與報名紀錄嗎？`)) {
      const raid = raids.find(r => r.id === raidId);
      if (!raid) return;
      try {
        const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
        const updatedVotes = (raid.votes || []).filter((v: any) => 
          !(v.ign?.trim().toLowerCase() === targetIgn?.trim().toLowerCase() || (v.userId === targetUserId && v.ign === targetIgn))
        );
        await updateDoc(raidRef, { votes: updatedVotes });

        // Synchronously remove from server store so it won't resurrect on polling
        fetch('/api/discord/remove-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raidId,
            ign: targetIgn,
            userId: targetUserId
          })
        }).catch(err => console.warn("Failed to remove signup from server store", err));

        showToast(`已成功剔除【${targetIgn}】的報名紀錄！`, "success");
      } catch (err: any) {
        showToast(`剔除失敗: ${err.message}`, "error");
      }
    }
  };

  const handleQuickEnroll = async (raidId: string, voter: any) => {
    const raid = raids.find(r => r.id === raidId);
    if (!raid) return;
    if (raid.participants?.some((p: any) => p.userId === voter.userId && p.ign === voter.ign)) {
      showToast(`${voter.ign} 已經在錄取名單中囉！`, "error");
      return;
    }
    try {
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
      const updatedParticipants = [...(raid.participants || [])];
      updatedParticipants.push({
        userId: voter.userId,
        ign: voter.ign,
         job: voter.job || '未知',
        level: voter.level || 120,
        memo: voter.memo || '', 
        discord: voter.discord || null,
        party: 'reserve'
      });
      await updateDoc(raidRef, { participants: updatedParticipants });
      showToast(`已成功錄取 【${voter.ign} (${voter.job})】！`);
    } catch (err) {
      showToast("錄取失敗", "error");
    }
  };

  const handleAssignParty = async (raidId: string, targetUserId: string, targetIgn: string, targetJob: string, targetParty: string) => {
    const raid = raids.find(r => r.id === raidId);
    if (!raid) return;
    try {
      const updatedParticipants = raid.participants.map((p: any) => {
        if (p.userId === targetUserId && p.ign === targetIgn) return { ...p, party: targetParty };
        return p;
      });
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
      await updateDoc(raidRef, { participants: updatedParticipants });
      showToast("分組更新成功！");
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleKickParticipant = (raidId: string, targetUserId: string, targetIgn: string, targetJob: string) => {
    if (confirm(`確定要移出此玩家嗎？`)) {
      const targetRaid = raids.find(r => r.id === raidId);
      if (!targetRaid) return;
      try {
        const updatedParticipants = targetRaid.participants.filter((p: any) => !(p.userId === targetUserId && p.ign === targetIgn));
        const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
        updateDoc(raidRef, { participants: updatedParticipants });
        showToast("已成功移出玩家。");
      } catch (err: any) {
        console.error(err);
      }
    }
  };

  const handleUpdatePartyCount = async (raidId: string, count: number) => {
    if (!db || !raidId) return;
    try {
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
      await updateDoc(raidRef, { partyCount: count });
      showToast(`已成功調整小隊數為 ${count} 隊！`);
    } catch (err: any) {
      showToast(`調整小隊失敗: ${err.message}`, "error");
    }
  };

  const handleApplyOptimalRoster = async (newParticipants: any[]) => {
    if (!db || !activeRaid) return;
    try {
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${activeRaid.id}`);
      await updateDoc(raidRef, { participants: newParticipants });
      showToast("分組已成功進行最佳化配置！");
    } catch (err: any) {
      console.error(err);
      showToast("更新最佳化分組失敗", "error");
    }
  };

  const handleUploadTools = async (raidId: string, file: File) => {
    if (!file) return;
    const isZip = file.name.endsWith('.zip') || file.name.endsWith('.rar') || file.name.endsWith('.7z');
    if (!isZip) {
      showToast("請上傳壓縮檔格式！ (.zip, .rar, .7z)", "error");
      return;
    }
    // Limit to 50MB
    if (file.size > 50 * 1024 * 1024) {
      showToast("檔案容量超過 50MB 限制！", "error");
      return;
    }

    setIsUploadingTools(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/raids/${raidId}/upload-tools`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "伺服器內部錯誤");
      }

      const result = await response.json();
      if (result.success) {
        const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
        await updateDoc(raidRef, {
          customToolsUrl: result.fileUrl,
          customToolsName: file.name,
          customToolsUploadedAt: new Date().toISOString()
        });
        showToast("遠征工具包自訂 ZIP 上傳成功！", "success");
      } else {
        throw new Error(result.error || "上傳失敗");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`上傳失敗: ${err.message || err}`, "error");
    } finally {
      setIsUploadingTools(false);
    }
  };

  const handleRemoveCustomTools = async (raidId: string) => {
    if (!confirm("確定要移除此自訂遠征工具包嗎？")) return;
    try {
      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
      await updateDoc(raidRef, {
        customToolsUrl: null,
        customToolsName: null,
        customToolsUploadedAt: null
      });
      showToast("已成功移除自訂工具包，恢復為預設範本。");
    } catch (err: any) {
      console.error(err);
      showToast(`移除失敗: ${err.message}`, "error");
    }
  };



  const handleSaveGachaFortune = async (finalResult: any, wishingNote: string) => {
    if (!db || !customUid) return;
    try {
      const activeChar = profile.characters[profile.activeCharacterIndex] || { ign: '未知冒險家', job: '冒險家', level: 120 };
      const fortuneRef = doc(db, `artifacts/${appId}/public/data/fortunes/${customUid}`);
      await setDoc(fortuneRef, {
        userId: customUid,
        ign: activeChar.ign,
        job: activeChar.job,
        level: Number(activeChar.level) || 120,
        timestamp: Date.now(),
        fortuneStatus: finalResult.fortune.status,
        fortuneColor: finalResult.fortune.color,
        fortuneDesc: finalResult.fortune.desc,
        luckyNumbers: finalResult.luckyNumbers,
        spot: finalResult.spot,
        wishingNote: wishingNote || '',
        discord: discordUser ? {
          username: discordUser.username,
          avatar: discordUser.avatar
        } : null
      });
    } catch (err) {
      console.error("Failed to save fortune to Firestore:", err);
    }
  };

  const handleSendIssueReport = async () => {
    if (!issueDescription.trim()) {
      showToast("請輸入問題或功能建議的描述內容！", "error");
      return;
    }

    const reportWebhook = discordConfig?.issueWebhookUrl || discordConfig?.webhookUrl;
    if (!reportWebhook) {
      showToast("⚠️ 系統管理員尚未配置 Discord Webhook 廣播通道，暫時無法自動傳送問題回報！", "error");
      return;
    }

    setIsSendingIssue(true);
    try {
      const activeChar = profile.characters[profile.activeCharacterIndex] || { ign: '', job: '', level: 0 };
      const response = await fetch("/api/discord/report-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          webhookUrl: reportWebhook,
          title: issueTitle.trim() || undefined,
          description: issueDescription.trim(),
          severity: issueSeverity,
          reporterIgn: activeChar.ign || undefined,
          reporterJob: activeChar.job || undefined,
          reporterLevel: Number(activeChar.level) || undefined,
          reporterDiscordId: discordUser?.id || undefined,
          reporterDiscordUsername: discordUser?.username || undefined,
          pageUrl: window.location.href
        })
      });

      if (response.ok) {
        showToast("🎉 感謝您的回報！已成功透過 Discord 機器人傳送至管理者頻道！", "success");
        // Clear inputs and close
        setIssueTitle('');
        setIssueDescription('');
        setIssueSeverity('bug');
        setShowIssueReportModal(false);
      } else {
        const errInfo = await response.json();
        throw new Error(errInfo.error || "傳輸失敗");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`❌ 回報傳送失敗：${err.message}`, "error");
    } finally {
      setIsSendingIssue(false);
    }
  };

  const sendDiscordRaidWebhook = async (raid: any, actionType: 'finalize_time' | 'post_roster', extraData: any = {}) => {
    if (!discordConfig || !discordConfig.webhookUrl) {
      showToast("⚠️ 請先在管理者後台配置 Discord Webhook URL！", "error");
      return;
    }

    const raidBoss = bosses.find(b => b.id === raid.bossId);
    let content = "";
    let embeds: any[] = [];

    if (actionType === 'finalize_time') {
      const timeIndex = extraData.timeIndex;
      const timeStr = formatDateTime(raid.proposedTimes[timeIndex]);
      
      const timeVotes = raid.votes || [];
      const matchedVoters = timeVotes.filter((v: any) => v.votes?.[timeIndex] === 'yes' || v.votes?.[timeIndex] === 'maybe');
      const pings = matchedVoters
        .filter((v: any) => v.discord && v.discord.id)
        .map((v: any) => `<@${v.discord.id}>`)
        .join(" ");

      content = `🔔 **遠征出團時間已由團長確定！**\n感謝以下隊員的配合與參與：${pings ? pings : '（無 Discord 綁定成員）'}`;
      embeds = [{
        title: `⚔️ 【${raidBoss?.name.split(' (')[0]}】出征時間確定`,
        description: `📌 **主題**：${raid.title}\n📅 **確定時間**：**${timeStr}** 👑\n📝 **備註/戰術要求**：${raid.notes || "無"}`,
        color: 16750848,
        footer: { text: "NyxShade 遠征隊組隊系統" },
        timestamp: new Date().toISOString()
      }];
    } else if (actionType === 'post_roster') {
      const participants = raid.participants || [];
      const party1 = participants.filter((p: any) => p.party === '1');
      const party2 = participants.filter((p: any) => p.party === '2');
      const party3 = participants.filter((p: any) => p.party === '3');
      const reserves = participants.filter((p: any) => p.party === 'reserve' || !p.party);
      const partyCount = raid.partyCount || 1;

      const enrolledPings = participants
        .filter((p: any) => p.discord && p.discord.id)
        .map((p: any) => `<@${p.discord.id}>`)
        .join(" ");

      content = `📋 **遠征隊最新排班名單公佈！**\n請被錄取的隊員準時出席：${enrolledPings ? enrolledPings : '（無 Discord 綁定成員）'}`;

      let fields: any[] = [];
      const formatPartyField = (list: any[], name: string) => {
        if (list.length === 0) return { name, value: "*（空位待分配）*", inline: true };
        const val = list.map((p, idx) => `${idx + 1}. [${p.job}] **${p.ign}** (Lv.${p.level})${p.memo ? ` - *${p.memo}*` : ''}`).join("\n");
        return { name, value: val, inline: true };
      };

      fields.push(formatPartyField(party1, "🔵 遠征一隊"));
      if (partyCount >= 2) fields.push(formatPartyField(party2, "🟢 遠征二隊"));
      if (partyCount >= 3) fields.push(formatPartyField(party3, "🟣 遠征三隊"));
      if (reserves.length > 0) {
        const resVal = reserves.map((p: any) => `- [${p.job}] **${p.ign}** (Lv.${p.level})${p.memo ? ` - *${p.memo}*` : ''}`).join("\n");
        fields.push({ name: "🔸 候補與預備名單", value: resVal, inline: false });
      }

      let bestTimeText = "待定";
      if (raid.mode === 'interest') {
        bestTimeText = "意願調查模式 💬";
      } else if (typeof raid.finalTimeIndex === 'number' && raid.proposedTimes?.[raid.finalTimeIndex]) {
        bestTimeText = formatDateTime(raid.proposedTimes[raid.finalTimeIndex]) + " 👑";
      }

      embeds = [{
        title: `⚔️ 【${raidBoss?.name.split(' (')[0]}】出征編組排班名冊`,
        description: `📌 **揪團主題**：${raid.title}\n📅 **預定時間**：**${bestTimeText}**`,
        fields: fields,
        color: 5793266,
        footer: { text: "NyxShade 遠征隊組隊系統" },
        timestamp: new Date().toISOString()
      }];
    }

    try {
      const response = await fetch(discordConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, embeds })
      });
      if (response.ok) {
        showToast("📢 成功廣播公告與 @標記 成員至 Discord 頻道！");
      } else {
        throw new Error("Discord Webhook Failed");
      }
    } catch (err) {
      console.error(err);
      showToast("發送 Discord Webhook 失敗，請確認 Webhook URL 網址是否正確！", "error");
    }
  };

  const handleOpenInteractiveCardModal = (raid: any) => {
    if (!discordConfig?.botToken) {
      showToast("⚠️ 請先在管理者後台配置 Discord Bot Token 密鑰！", "error");
      return;
    }
    setShowInteractiveModal(true);
  };

  const executePostInteractiveCard = async (targetChannelId: string, customNote?: string, deleteOldCard: boolean = true) => {
    const raid = activeRaid;
    if (!raid || !discordConfig?.botToken) return;

    const raidBoss = bosses.find(b => b.id === raid.bossId);
    const participants = raid.participants || [];
    const activeMembers = participants.filter((p: any) => !p.isPlaceholder && p.party !== 'reserve');

    const party1 = participants.filter((p: any) => p.party === '1');
    const party2 = participants.filter((p: any) => p.party === '2');
    const party3 = participants.filter((p: any) => p.party === '3');
    const reserves = participants.filter((p: any) => p.party === 'reserve');

    // Extract Figure 2 Survey Intentions
    const interestVotes = raid.votes || [];
    const yesVotes = interestVotes.filter((v: any) => v.votes?.['interest'] === 'yes' || Object.values(v.votes || {}).includes('yes'));
    const noVotes = interestVotes.filter((v: any) => v.votes?.['interest'] === 'no' || (Object.values(v.votes || {}).includes('no') && !Object.values(v.votes || {}).includes('yes')));
    
    let partyMembersSummary = "";
    const formatP = (list: any[], name: string) => {
      if (list.length === 0) return `${name}: *(暫無隊員)*\n`;
      return `${name}: ` + list.map(p => `[${p.job}] ${p.ign}`).join(" | ") + "\n";
    };

    partyMembersSummary += formatP(party1, "🔵 一隊");
    if ((raid.partyCount || 1) >= 2) partyMembersSummary += formatP(party2, "🟢 二隊");
    if ((raid.partyCount || 1) >= 3) partyMembersSummary += formatP(party3, "🟣 三隊");

    setIsSendingThread(true);
    try {
      const response = await fetch('/api/discord/post-interactive-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: discordConfig.botToken,
          channelId: targetChannelId,
          raidId: raid.id,
          deleteOldCard: deleteOldCard,
          title: `⚔️ 【${raid.title || raidBoss?.name.split(' (')[0]}】出團意願調查與陣容！`,
          bossName: raidBoss?.name.split(' (')[0] || raid.title,
          targetCount: raidBoss?.maxPlayers || 12,
          currentCount: activeMembers.length,
          leaderName: raid.creatorIgn || '團長',
          partyMembersSummary,
          customNote,
          appUrl: window.location.href,
          partyCount: raid.partyCount || 1,
          yesVotes: yesVotes.map((v: any) => ({
            ign: v.ign,
            job: v.job,
            level: v.level,
            discordId: v.discord?.id || v.discordId || (v.userId?.startsWith('dc_') ? v.userId.replace('dc_', '') : ''),
            username: v.discord?.username || ''
          })),
          noVotes: noVotes.map((v: any) => ({
            ign: v.ign,
            job: v.job,
            level: v.level,
            discordId: v.discord?.id || v.discordId || (v.userId?.startsWith('dc_') ? v.userId.replace('dc_', '') : ''),
            username: v.discord?.username || ''
          })),
          party1: party1.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId })),
          party2: party2.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId })),
          party3: party3.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId })),
          reserves: reserves.map((p: any) => ({ ign: p.ign, job: p.job, level: p.level, discordId: p.discord?.id || p.discordId }))
        })
      });

      if (response.ok) {
        showToast("🎉 成功向 Discord 頻道發送【🙋 快速報名】互動卡片與按鈕！", "success");
        setShowInteractiveModal(false);
      } else {
        const errData = await response.json();
        throw new Error(errData.error || "發送互動卡片失敗");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`❌ 發送失敗：${err.message}`, "error");
    } finally {
      setIsSendingThread(false);
    }
  };

  const handleSyncDiscordSignups = async (raidId: string, silent: boolean = false) => {
    try {
      const response = await fetch(`/api/discord/signups/${raidId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const signups: any[] = data.signups || [];
      const yesVotes: any[] = data.yesVotes || [];
      const noVotes: any[] = data.noVotes || [];

      const raid = raids.find(r => r.id === raidId);
      if (!raid) return;

      const raidRef = doc(db, `artifacts/${appId}/public/data/raids/${raidId}`);
      let currentVotes = [...(raid.votes || [])];
      let currentParticipants = [...(raid.participants || [])];
      let hasChanges = false;
      let addedCount = 0;

      // Sets of IGNs from server stores
      const activeSignupIgns = new Set([
        ...signups.map((s: any) => (s.ign || '').trim().toLowerCase()),
        ...yesVotes.map((v: any) => (v.ign || '').trim().toLowerCase())
      ]);

      const cancelledIgns = new Set(
        noVotes.map((v: any) => (v.ign || '').trim().toLowerCase())
      );

      // 1. Deduplicate currentVotes by IGN to ensure no duplicate cards ever exist
      const uniqueVotes: any[] = [];
      const seenIgns = new Set<string>();
      for (const v of currentVotes) {
        const ignKey = (v.ign || '').trim().toLowerCase();
        if (ignKey && !seenIgns.has(ignKey)) {
          seenIgns.add(ignKey);
          uniqueVotes.push(v);
        } else if (ignKey && seenIgns.has(ignKey)) {
          hasChanges = true; // Pruned duplicate
        }
      }

      // 2. Incorporate active Discord signups
      for (const signup of signups) {
        const signupIgnKey = (signup.ign || '').trim().toLowerCase();
        if (!signupIgnKey) continue;
        if (cancelledIgns.has(signupIgnKey)) continue;

        const existingIdx = uniqueVotes.findIndex(v => 
          (v.ign && v.ign.trim().toLowerCase() === signupIgnKey) ||
          (v.discordId && v.discordId === signup.discordId && v.ign === signup.ign) || 
          (v.discord && v.discord.id === signup.discordId && v.ign === signup.ign) ||
          (v.userId === `dc_${signup.discordId}_${signup.ign}`)
        );
        
        const voteRecord = {
          userId: existingIdx >= 0 ? uniqueVotes[existingIdx].userId : `dc_${signup.discordId}_${signup.ign}`,
          discordId: signup.discordId,
          ign: signup.ign,
          job: signup.job,
          level: Number(signup.level) || 120,
          memo: signup.memo || `Discord 卡片報名 (@${signup.username})`,
          discord: {
            id: signup.discordId,
            username: signup.username,
            avatar: signup.avatar
          },
          vote: 'yes',
          votes: { 0: 'yes', interest: 'yes' }
        };

        if (existingIdx >= 0) {
          const old = uniqueVotes[existingIdx];
          if (old.job !== voteRecord.job || !old.discord || JSON.stringify(old.votes) !== JSON.stringify(voteRecord.votes)) {
            uniqueVotes[existingIdx] = { ...old, ...voteRecord };
            hasChanges = true;
          }
        } else {
          uniqueVotes.push(voteRecord);
          addedCount++;
          hasChanges = true;
        }
      }

      // 3. Remove votes ONLY if they were explicitly marked as cancelled on Discord bot
      const filteredVotes = uniqueVotes.filter(v => {
        const vIgnKey = (v.ign || '').trim().toLowerCase();
        if (!vIgnKey) return true;

        // If explicitly marked as cancelled / no-vote on Discord
        if (cancelledIgns.has(vIgnKey)) {
          hasChanges = true;
          return false;
        }

        return true;
      });

      // 4. Also check participants roster for cancelled IGNs
      let filteredParticipants = currentParticipants;
      if (cancelledIgns.size > 0) {
        const initialLen = currentParticipants.length;
        filteredParticipants = currentParticipants.filter(p => {
          const pIgnKey = (p.ign || '').trim().toLowerCase();
          return !pIgnKey || !cancelledIgns.has(pIgnKey);
        });
        if (filteredParticipants.length !== initialLen) {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const updateData: any = { votes: filteredVotes };
        if (filteredParticipants !== currentParticipants) {
          updateData.participants = filteredParticipants;
        }
        await updateDoc(raidRef, updateData);

        // Sync latest votes and party roster back to backend server so original Discord card is immediately patched
        const p1 = filteredParticipants.filter((p: any) => p.party === '1');
        const p2 = filteredParticipants.filter((p: any) => p.party === '2');
        const p3 = filteredParticipants.filter((p: any) => p.party === '3');
        const res = filteredParticipants.filter((p: any) => p.party === 'reserve');

        fetch('/api/discord/sync-raid-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raidId,
            yesVotes: filteredVotes.filter(v => v.vote === 'yes' || Object.values(v.votes || {}).includes('yes')),
            noVotes: noVotes,
            party1: p1,
            party2: p2,
            party3: p3,
            reserves: res
          })
        }).catch(() => {});

        if (!silent) showToast(`🔄 成功同步名單紀錄！`, "success");
      } else if (!silent) {
        showToast("名單已與 Discord 同步完畢，無新變動。");
      }
    } catch (err: any) {
      console.error("handleSyncDiscordSignups error:", err);
      if (!silent) showToast(`❌ 同步失敗: ${err.message}`, "error");
    }
  };

  const copyGroupFormat = (raid: any) => {
    const raidBoss = bosses.find(b => b.id === raid.bossId);
    let bestTimeText = "待定";
    if (raid.mode === 'interest') {
      bestTimeText = "意願調查模式 (時間線上協調討論中) 💬";
    } else if (typeof raid.finalTimeIndex === 'number' && raid.proposedTimes?.[raid.finalTimeIndex]) {
      bestTimeText = formatDateTime(raid.proposedTimes[raid.finalTimeIndex]) + " (已由管理員最終確定) 👑";
    } else {
      let maxYesCount = -1;
      raid.proposedTimes?.forEach((time: string, index: number) => {
        const yesVotes = raid.votes?.filter((v: any) => v.votes?.[index] === 'yes').length || 0;
        if (yesVotes > maxYesCount) {
          maxYesCount = yesVotes;
          bestTimeText = formatDateTime(time);
        }
      });
    }

    const participants = raid.participants || [];
    const party1 = participants.filter((p: any) => p.party === '1');
    const party2 = participants.filter((p: any) => p.party === '2');
    const party3 = participants.filter((p: any) => p.party === '3');
    const reserves = participants.filter((p: any) => p.party === 'reserve' || !p.party);

    const partyCount = raid.partyCount || 1;

    let text = `⚔️ **【Artale 遠征隊公車】${raidBoss?.name || ''}** ⚔️\n`;
    text += `📌 **主題**：${raid.title}\n`;
    text += `📅 **預計時間**：${bestTimeText}\n`;
    if (raid.notes) {
      text += `📝 **備註**：${raid.notes}\n`;
    }
    text += `\n📋 **實時遠征隊名單**：\n`;

    const formatParty = (pList: any[], pName: string) => {
      if (pList.length === 0) return `${pName}：(尚無隊員)\n`;
      let pText = `${pName}：\n`;
      pList.forEach((p, idx) => {
        const dcTag = p.discord ? ` (DC: @${p.discord.username})` : '';
        pText += `  ${idx + 1}. [${p.job}] ${p.ign} (Lv.${p.level})${dcTag}${p.memo ? ` - ${p.memo}` : ''}\n`;
      });
      return pText;
    };

    text += formatParty(party1, '🔵 【遠征一隊】');
    if (partyCount >= 2) text += formatParty(party2, '🟢 【遠征二隊】');
    if (partyCount >= 3) text += formatParty(party3, '🟣 【遠征三隊】');
    if (reserves.length > 0) {
      text += `\n🔸 **【候補名單】**：\n`;
      reserves.forEach((p: any) => {
        const dcTag = p.discord ? ` (DC: @${p.discord.username})` : '';
        text += `  - [${p.job}] ${p.ign} (Lv.${p.level})${dcTag}${p.memo ? ` - ${p.memo}` : ''}\n`;
      });
    }
    text += `\n🔗 **即時投票/卡位系統**：${window.location.href}`;

    navigator.clipboard.writeText(text);
    showToast("排班表格式已複製到剪貼簿！可直接貼在群組中。");
  };

  const getBossShortName = (bossId: string, bossName: string) => {
    if (bossId === 'zakum_normal') return '炎魔';
    if (bossId === 'papu_normal') return '普拉';
    if (bossId === 'papu_hard') return '困拉';
    if (bossId === 'horntail') return '龍王';
    const cleanName = bossName ? bossName.split(' (')[0] : '';
    return cleanName.length > 4 ? cleanName.substring(0, 4) : cleanName;
  };

  const handleOpenThreadModal = (partyKey: string, pList: any[]) => {
    if (!discordConfig || (!discordConfig.webhookUrl && (!discordConfig.webhooks || discordConfig.webhooks.length === 0))) {
      showToast("⚠️ 請先在管理者後台配置 Discord Webhook URL！", "error");
      return;
    }

    const matchedBoss = bosses.find(b => b.id === activeRaid?.bossId);
    const bossShortName = getBossShortName(activeRaid?.bossId || '', matchedBoss?.name || '');
    
    let dateStr = "";
    if (activeRaid?.mode === 'interest') {
      const d = new Date();
      dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    } else if (typeof activeRaid?.finalTimeIndex === 'number' && activeRaid.proposedTimes?.[activeRaid.finalTimeIndex]) {
      const d = new Date(activeRaid.proposedTimes[activeRaid.finalTimeIndex]);
      if (!isNaN(d.getTime())) {
        dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      }
    } else if (activeRaid?.proposedTimes && activeRaid.proposedTimes[0]) {
      const d = new Date(activeRaid.proposedTimes[0]);
      if (!isNaN(d.getTime())) {
        dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      }
    } else {
      const d = new Date();
      dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    }

    const partyName = partyKey === '1' ? '一隊' : partyKey === '2' ? '二隊' : '三隊';
    const suggestedTitle = `${dateStr}${bossShortName}遠征${partyName}`;
    setThreadTitle(suggestedTitle);
    setThreadPartyKey(partyKey);
    setThreadMembers(pList);

    const activeRaidTitle = activeRaid?.title || '';
    const pings = pList
      .filter((p: any) => p.discord && p.discord.id)
      .map((p: any) => `<@${p.discord.id}>`)
      .join(" ");

    let memberListText = "";
    pList.forEach((p, idx) => {
      memberListText += `${idx + 1}. [${p.job}] **${p.ign}** (Lv.${p.level})${p.memo ? ` - *${p.memo}*` : ''}\n`;
    });
    if (pList.length === 0) {
      memberListText = "*(尚無隊員)*";
    }

    let defaultMsg = `⚔️ **【遠征 ${partyName} 戰前討論討論串】** ⚔️\n`;
    defaultMsg += `📌 **主題**：${activeRaidTitle}\n`;
    defaultMsg += `🔔 **召集隊員**：${pings ? pings : '（本小隊無 Discord 綁定成員）'}\n\n`;
    defaultMsg += `📋 **本組（遠征 ${partyName}）隊員名單**：\n${memberListText}\n`;
    defaultMsg += `💬 阿羅哈各位！此討論串已建立，成員已被自動標記。請在此商議各位的出團細節與 Buffer 排班！`;

    setThreadMessage(defaultMsg);
    setShowThreadModal(true);
  };

  const handleSendDiscordThread = async (targetValue: string) => {
    if (!threadTitle.trim()) {
      showToast("請輸入討論串標題！", "error");
      return;
    }
    
    setIsSendingThread(true);
    try {
      // Bot Mode Only
      if (!discordConfig?.botToken) {
        showToast("⚠️ 請先在管理者後台配置 Discord 機器人 (Bot) 權杖 Token！", "error");
        setIsSendingThread(false);
        return;
      }
      if (!targetValue) {
        showToast("⚠️ 請輸入或設定有效的目標頻道 ID！", "error");
        setIsSendingThread(false);
        return;
      }

      const response = await fetch('/api/discord/create-thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          botToken: discordConfig.botToken,
          channelId: targetValue,
          title: threadTitle.trim(),
          message: threadMessage
        })
      });

      if (response.ok) {
        showToast(`🤖 Discord Bot 成功為「遠征${threadPartyKey === '1' ? '一隊' : threadPartyKey === '2' ? '二隊' : '三隊'}」建立討論串！`, "success");
        setShowThreadModal(false);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server status ${response.status}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`發送失敗：${err.message || "請確認權杖 Token 或目標頻道 ID 權限"}`, "error");
    } finally {
      setIsSendingThread(false);
    }
  };

  const activeRaid = raids.find(r => r.id === currentRaidId);
  const boss = activeRaid ? bosses.find(b => b.id === activeRaid.bossId) : null;
  const isCreator = activeRaid ? (activeRaid.creatorId === customUid || isAdmin) : false;

  const myScheduleRaids = raids.filter(raid => {
    if (!activeCharacter.ign) return false;
    const hasVotedActive = raid.votes?.some((v: any) => v.userId === customUid && v.ign === activeCharacter.ign && Object.values(v.votes || {}).some(choice => choice === 'yes' || choice === 'maybe'));
    const isEnrolledActive = raid.participants?.some((p: any) => p.userId === customUid && p.ign === activeCharacter.ign);
    return hasVotedActive || isEnrolledActive;
  });

  const customBossesList = bosses.filter(b => b.isCustom);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col justify-between w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-full overflow-x-hidden">
        {/* Header navigation bar */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg select-none w-full">
          <div className="max-w-6xl mx-auto flex items-center justify-between font-bold gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink-0 min-w-0" onClick={() => setCurrentRaidId(null)}>
              <div className="text-2xl sm:text-3xl shrink-0">🍁</div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent leading-tight truncate">
                  NyxShade
                </h1>
                <p 
                  onClick={handleSecretClick}
                  className="hidden sm:block text-[10px] md:text-xs text-slate-500 cursor-pointer active:text-amber-400 hover:text-slate-400 transition truncate max-w-[280px]"
                  title="快速點擊5次可管理金鑰"
                >
                  不負責宣告：Hi我是純粹，壞掉不要找我歐✧｡٩(ˊ導ˋ)و✧｡
                </p>
              </div>
            </div>

            {/* Profile quick swap bar & Mobile Menu Trigger */}
            <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
              {/* Mobile Drawer Trigger Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/40 text-amber-300 rounded-xl px-2.5 py-1.5 flex items-center transition text-xs shadow-md h-9 sm:h-10 select-none font-black space-x-1.5 cursor-pointer active:scale-95"
                title="開啟行動版展開選單"
              >
                <span className="text-base leading-none font-mono">☰</span>
                <span className="text-[11px] font-bold">選單</span>
                {myScheduleRaids.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </button>

              <div className="hidden md:block">
                {dbStatus === 'connecting' && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold animate-pulse">⏳ 連線中</span>}
                {dbStatus === 'connected' && <span className="bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold">🟢 連線成功</span>}
                {dbStatus === 'error' && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold">⚠️ 連線異常</span>}
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextTheme = theme === 'dark' ? 'light' : 'dark';
                  setTheme(nextTheme);
                  showToast(`已切換為【${nextTheme === 'dark' ? '🌙 暗色模式' : '☀️ 淺色模式'}】`);
                }}
                className="hidden sm:flex bg-slate-900/80 hover:bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl px-2 sm:px-2.5 py-1.5 items-center transition text-xs shadow-md h-9 sm:h-10 select-none text-amber-400 font-extrabold cursor-pointer space-x-1 shrink-0"
                title={`點擊切換為${theme === 'dark' ? '淺色模式 (Light Mode)' : '暗色模式 (Dark Mode)'}`}
              >
                <span className="text-sm">{theme === 'dark' ? '🌙' : '☀️'}</span>
                <span className="hidden sm:inline text-[11px]">{theme === 'dark' ? '暗色' : '淺色'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPWAModal(true)}
                className="hidden sm:flex bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 hover:border-amber-500/60 rounded-xl px-2 sm:px-3 py-1.5 items-center transition text-xs shadow-md h-9 sm:h-10 select-none text-amber-300 font-extrabold cursor-pointer space-x-1 shrink-0"
                title="將 NyxShade 安裝為手機/電腦獨立應用程式 (PWA)"
              >
                <span>📲</span>
                <span className="hidden md:inline">安裝 App</span>
              </button>

              <button
                onClick={() => setShowIssueReportModal(true)}
                className="hidden sm:flex bg-slate-900/80 hover:bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-rose-900/50 rounded-xl px-2 sm:px-3 py-1.5 items-center transition text-xs shadow-md h-9 sm:h-10 select-none text-rose-400 font-extrabold cursor-pointer shrink-0"
                title="遇到網頁故障或有功能點子？點此立即透過 Discord 轉傳管道回報！"
              >
                <span>🐛</span>
                <span className="hidden md:inline ml-1">問題回報</span>
              </button>

              {profileLoaded ? (
                <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl px-2 sm:px-3 py-1.5 flex items-center transition text-xs sm:text-sm shadow-md space-x-1.5 h-9 sm:h-10 select-none max-w-[125px] sm:max-w-none"
                  >
                    {discordUser && (
                      <img 
                        src={discordUser.avatar} 
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#5865F2]/60 object-cover shrink-0" 
                        alt="Discord Avatar"
                      />
                    )}
                    {activeCharacter.ign ? (
                      <span className="flex items-center space-x-1 min-w-0 truncate">
                        <JobIcon jobName={activeCharacter.job} sizeClass="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="font-extrabold text-slate-100 text-[11px] sm:text-xs truncate">
                          {activeCharacter.ign} <span className="hidden sm:inline text-[10px] text-slate-400 font-normal">({activeCharacter.job})</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-amber-400 text-xs font-bold whitespace-nowrap">⚙️ 設定</span>
                    )}
                  </button>

                  {profile.characters && profile.characters.length > 1 && (
                    <select
                      value={profile.activeCharacterIndex}
                      onChange={(e) => {
                        const nextIdx = Number(e.target.value);
                        setProfile({ ...profile, activeCharacterIndex: nextIdx });
                        const profileRef = doc(db, `artifacts/${appId}/users/${customUid}/profile/info`);
                        updateDoc(profileRef, { activeCharacterIndex: nextIdx });
                        const publicRef = doc(db, `artifacts/${appId}/public/data/registered_users/${customUid}`);
                        updateDoc(publicRef, { activeCharacterIndex: nextIdx });
                        showToast(`已快速切換出團角色為：【${profile.characters[nextIdx].ign} (${profile.characters[nextIdx].job})】`);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs text-amber-400 font-bold focus:outline-none cursor-pointer hover:border-slate-700 transition h-9 sm:h-10 max-w-[105px] sm:max-w-none"
                    >
                      {profile.characters.map((c, i) => (
                        <option key={i} value={i} className="bg-slate-900 font-bold text-slate-200">
                          🔄 {c.ign} ({c.job})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="h-9 sm:h-10 w-24 sm:w-32 bg-slate-900 animate-pulse rounded-xl border border-slate-800" />
              )}
            </div>
          </div>
        </header>

        {/* Mobile Slide-out Navigation Drawer */}
        <MobileNavDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          profile={profile}
          activeCharacter={activeCharacter}
          discordUser={discordUser}
          lobbyTab={lobbyTab}
          setLobbyTab={setLobbyTab}
          raids={raids}
          myScheduleRaids={myScheduleRaids}
          bosses={bosses}
          currentRaidId={currentRaidId}
          setCurrentRaidId={setCurrentRaidId}
          isAdminLoggedIn={isAdmin}
          setIsCreating={setIsCreating}
          setShowProfileModal={setShowProfileModal}
          setShowBossManagerModal={setShowBossManagerModal}
          setShowJobManagerModal={setShowJobManagerModal}
          setShowPWAModal={setShowPWAModal}
          setShowIssueReportModal={setShowIssueReportModal}
          theme={theme}
          setTheme={setTheme}
          dbStatus={dbStatus}
          onSwitchCharacter={(nextIdx) => {
            setProfile({ ...profile, activeCharacterIndex: nextIdx });
            const profileRef = doc(db, `artifacts/${appId}/users/${customUid}/profile/info`);
            updateDoc(profileRef, { activeCharacterIndex: nextIdx });
            const publicRef = doc(db, `artifacts/${appId}/public/data/registered_users/${customUid}`);
            updateDoc(publicRef, { activeCharacterIndex: nextIdx });
            showToast(`已快速切換出團角色為：【${profile.characters[nextIdx].ign} (${profile.characters[nextIdx].job})】`);
          }}
          onOpenAdminSecret={handleSecretClick}
        />

        {/* Core panel list */}
        <main className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
          
          <div className="sm:hidden mb-4 text-center select-none">
            {dbStatus === 'connecting' && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse">⏳ 連線中</span>}
            {dbStatus === 'connected' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">🟢 連線成功</span>}
            {dbStatus === 'error' && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-bold">⚠️ 連線異常</span>}
          </div>

          {!activeRaid ? (
            /* ==================== 1. MAIN LOBBY PAGE ==================== */
            <div>
              <div className="hero-banner mb-8 p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 opacity-10 text-9xl pointer-events-none">🍁</div>
                <div className="relative z-10 max-w-2xl">
                  <span className="px-3.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs rounded-full font-bold inline-block">
                    跨平台多端同步
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black mt-4 text-white">Artale 遠征隊組隊</h2>
                  <p className="text-slate-300 mt-2.5 text-base md:text-lg whitespace-pre-line leading-relaxed">
                    多身分角色與 Discord 驗證登入！
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 select-none">
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => setIsCreating(true)}
                          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 !text-white font-extrabold px-6 py-3 rounded-xl shadow-lg transition flex items-center space-x-2 text-sm md:text-base cursor-pointer"
                        >
                          <span className="!text-white">➕ 發起全新遠征隊</span>
                        </button>
                        <button 
                          onClick={() => setShowBossManagerModal(true)}
                          className="bg-slate-800/90 hover:bg-slate-750 !text-violet-200 font-extrabold px-6 py-3 rounded-xl border border-slate-700 transition text-sm md:text-base flex items-center space-x-2 cursor-pointer"
                        >
                          <span>👾 自訂 Boss 設置</span>
                        </button>
                        <button 
                          onClick={() => setShowJobManagerModal(true)}
                          className="bg-slate-800/90 hover:bg-slate-750 !text-teal-200 font-extrabold px-6 py-3 rounded-xl border border-slate-700 transition text-sm md:text-base flex items-center space-x-2 cursor-pointer"
                        >
                          <span>⚔️ 職業管理</span>
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setShowProfileModal(true)}
                      className="bg-slate-800 hover:bg-slate-700 !text-white font-bold px-5 py-3 rounded-xl border border-slate-700 transition text-sm md:text-base flex items-center space-x-2 shadow cursor-pointer"
                    >
                      {discordUser ? (
                        <img src={discordUser.avatar} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span>⚙️</span>
                      )}
                      <span className="!text-white">管理我的角色卡 / 連結 Discord</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lobby Tabs Picker */}
              <div className="flex flex-wrap sm:flex-nowrap bg-slate-900 border border-slate-800 p-1.5 rounded-2xl mb-8 max-w-lg select-none gap-1">
                <button
                  type="button"
                  onClick={() => setLobbyTab('recruitment')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap ${lobbyTab === 'recruitment' ? 'bg-gradient-to-r from-orange-500 to-amber-500 !text-white shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <span className={lobbyTab === 'recruitment' ? '!text-white' : ''}>📢 遠征招募大廳</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLobbyTab('gacha')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap ${lobbyTab === 'gacha' ? 'bg-gradient-to-r from-orange-500 to-amber-500 !text-white shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <span className={lobbyTab === 'gacha' ? '!text-white' : ''}>🔮 幸運神社</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLobbyTab('drop_table')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap ${lobbyTab === 'drop_table' ? 'bg-gradient-to-r from-orange-500 to-amber-500 !text-white shadow-md font-black' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <span className={lobbyTab === 'drop_table' ? '!text-white' : ''}>📦 掉落物查詢</span>
                </button>
              </div>

              {lobbyTab === 'recruitment' && (
                <>

              {/* Active user schedules dashboard */}
              {activeCharacter.ign && (
                <div className="mb-8 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
                  <h3 className="text-lg font-black text-amber-404 mb-3.5 flex items-center space-x-2 select-none text-amber-400">
                    <span>📅 我的出團日程 (當前代入：【{activeCharacter.ign} ({activeCharacter.job})】)</span>
                  </h3>
                  {myScheduleRaids.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">當前角色尚未投票 or 報名任何進行中的遠征隊。快去下方投票吧！</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myScheduleRaids.map((raid) => {
                        const raidBoss = bosses.find(b => b.id === raid.bossId);
                        const participantInfo = raid.participants?.find((p: any) => p.userId === customUid && p.ign === activeCharacter.ign);
                        let enrollmentStatus = "已投票（待排班錄取）";
                        if (participantInfo) {
                          if (participantInfo.party === 'reserve') enrollmentStatus = "⏳ 錄取為：候補成員";
                          else if (participantInfo.party) enrollmentStatus = `🎉 已分配：遠征 ${participantInfo.party} 隊成員`;
                        }
                        
                        const finalizedTimeStr = typeof raid.finalTimeIndex === 'number' && raid.proposedTimes?.[raid.finalTimeIndex]
                          ? formatDateTime(raid.proposedTimes[raid.finalTimeIndex])
                          : null;

                        return (
                          <div 
                            key={`schedule-${raid.id}`}
                            onClick={() => setCurrentRaidId(raid.id)}
                            className={`p-4 border rounded-2xl cursor-pointer transition shadow hover:border-slate-700 flex flex-col justify-between ${finalizedTimeStr ? 'border-amber-500/40 bg-amber-500/5' : 'bg-slate-950 border-slate-800'}`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-indigo-400 font-mono">
                                  {raidBoss?.icon || '👹'} {raidBoss?.name.split(' (')[0] || '未知王'}
                                </span>
                                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${participantInfo ? 'bg-emerald-500/10 text-emerald-450' : 'bg-amber-500/10 text-amber-400'}`}>
                                  {enrollmentStatus}
                                </span>
                              </div>
                              <h4 className="text-sm font-extrabold text-slate-200 line-clamp-1">{raid.title}</h4>
                              {finalizedTimeStr ? (
                                <p className="text-xs text-amber-300 font-bold mt-1">📅 出團時間：{finalizedTimeStr} 👑</p>
                              ) : raid.mode === 'interest' ? (
                                <p className="text-xs text-indigo-300 font-bold mt-1">協調突襲意願中 💬</p>
                              ) : (
                                <p className="text-xs text-slate-500 mt-1 italic">⏰ 出團時間投票中</p>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-2 border-t border-slate-800/60 pt-2 flex items-center justify-between">
                              <span>點擊進入 ➜</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-5 select-none">
                <h3 className="text-xl font-black text-slate-100 flex items-center space-x-2.5">
                  <span>⚔️ 目前進行中的遠征隊</span>
                  <span className="bg-slate-900 text-slate-400 border border-slate-800 px-3 py-1 rounded-full text-xs font-bold font-mono">
                    {raids.length}
                  </span>
                </h3>
              </div>

              {raids.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-16 text-center select-none">
                  <span className="text-6xl block mb-4">🦖</span>
                  <h4 className="text-slate-300 font-bold text-xl">目前沒有任何發起的遠征隊</h4>
                  <p className="text-slate-550 text-sm mt-2">立刻點選上方「發起全新遠征隊」來揪團打王吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {raids.map((raid) => {
                    const raidBoss = bosses.find(b => b.id === raid.bossId);
                    const participantCount = raid.participants?.length || 0;
                    const voteCount = raid.votes?.length || 0;
                    const hasFinalTime = typeof raid.finalTimeIndex === 'number' && raid.proposedTimes?.[raid.finalTimeIndex];

                    return (
                      <div 
                        key={raid.id}
                        onClick={() => setCurrentRaidId(raid.id)}
                        className={`bg-slate-900 hover:bg-slate-850 border rounded-3xl p-6 cursor-pointer transition transform hover:-translate-y-1 shadow-lg flex flex-col justify-between ${hasFinalTime ? 'border-amber-500/50' : 'border-slate-800'}`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className={`px-3 py-1 text-xs font-black rounded-lg text-white bg-gradient-to-r ${raidBoss?.color || 'from-slate-600 to-slate-700'}`}>
                              {raidBoss?.icon || '👹'} {raidBoss?.name.split(' (')[0] || '未知王'}
                            </span>
                            <span className="text-xs text-slate-400">
                              發起者: <span className="text-slate-205 font-bold text-slate-100">{raid.creatorIgn}</span>
                            </span>
                          </div>

                          <h4 className="text-xl font-extrabold text-slate-100 mb-2.5 line-clamp-1">{raid.title}</h4>
                          <p className="text-slate-405 text-sm line-clamp-2 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80 min-h-[56px] leading-relaxed text-slate-300">
                            {raid.notes || "沒有提供額外備註。"}
                          </p>

                          {raid.mode === 'interest' ? (
                            <div className="mt-2.5 bg-indigo-950/60 border border-indigo-550/40 text-indigo-300 text-xs font-black px-3.5 py-2 rounded-xl flex items-center space-x-1.5 w-max select-none shadow">
                              <span>🙋 意願收集模式 💬</span>
                            </div>
                          ) : hasFinalTime ? (
                            <div className="mt-2.5 bg-amber-400/90 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl flex items-center space-x-1.5 w-max select-none shadow">
                              <span>📅 確切時間：{formatDateTime(raid.proposedTimes[raid.finalTimeIndex])} 👑</span>
                            </div>
                          ) : (
                            <div className="mt-2.5 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center space-x-1.5 w-max select-none">
                              <span>⏰ 出團投票進行中</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm border-t border-slate-800/60 pt-4 mt-4">
                          <div className="flex space-x-4 text-slate-300 font-semibold font-mono">
                            <span className="flex items-center space-x-1.5">
                              <span>👥</span>
                              <strong>{participantCount}</strong>
                              <span>人錄取</span>
                            </span>
                            <span className="flex items-center space-x-1.5">
                              <span>🗳️</span>
                              <strong>{voteCount}</strong>
                              <span>人表態</span>
                            </span>
                          </div>
                          <span className="text-indigo-400 font-bold hover:underline flex items-center space-x-1">
                            <span>進入協調與排班 ➜</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}

              {lobbyTab === 'gacha' && (
                <GachaSection 
                  activeCharacter={activeCharacter}
                  discordUser={discordUser}
                  discordConfig={discordConfig}
                  showToast={showToast}
                  openProfileModal={() => setShowProfileModal(true)}
                  onSaveFortune={handleSaveGachaFortune}
                  fortunesList={fortunes}
                  customUid={customUid}
                />
              )}

              {lobbyTab === 'drop_table' && (
                <DropTableSection />
              )}
            </div>
          ) : (
            /* ==================== 2. DETAILED RAID PAGE ==================== */
            <div className="space-y-6 max-w-4xl mx-auto">
              
              <div className="flex items-center select-none">
                <button
                  type="button"
                  onClick={() => setCurrentRaidId(null)}
                  className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl border border-slate-800 transition text-xs font-extrabold shadow-md active:scale-95"
                >
                  <span className="text-sm">⬅️</span>
                  <span>返回大廳首頁</span>
                </button>
              </div>

              {/* Main content display details */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4">
                <div className={`p-8 bg-gradient-to-r ${boss?.color || 'from-slate-700 to-black'} text-white relative`}>
                  <div className="absolute right-6 top-6 opacity-20 text-7xl select-none">{boss?.icon || '👹'}</div>
                  <span className="bg-black/30 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur select-none font-mono">
                    {activeRaid.mode === 'interest' ? '🙋 意願收集模式' : '📅 日期時間模式'}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black mt-4">{activeRaid.title}</h2>
                  <p className="text-white/90 text-sm md:text-base mt-2">{boss?.name || '未知 Boss'} • 團隊上限最多 {boss?.maxPlayers || 18} 人</p>
                </div>

                <div className="p-6 space-y-5">
                  {isAdmin && (
                    <div className="bg-amber-550/10 border border-amber-500/20 text-amber-300 rounded-2xl p-4 text-xs font-semibold leading-relaxed flex items-start gap-2.5 select-none">
                      <span className="text-sm">👑</span>
                      <div>
                        <strong className="text-amber-200">團長排班提示：</strong>
                        請利用下方各意願名單中的「錄取」按鈕，直接將人員分配，變更將會實時同步！
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 select-none">隊伍備註 / 戰術要求</h4>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-sm md:text-base text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                      {activeRaid.notes || "團長沒有提供詳細備註。"}
                    </div>
                  </div>

                  {activeRaid.bossId === 'horntail' && (
                    <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-2xl p-5 space-y-4 select-none">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-start space-x-3.5">
                          <span className="text-3xl mt-0.5 shrink-0">🐉</span>
                          <div>
                            <h5 className="font-extrabold text-sm md:text-base text-emerald-300">
                              {activeRaid.customToolsUrl ? "📥 自訂遠征隊專屬工具包已可下載" : "🐉 龍王遠征隊專用工具包已供下載"}
                            </h5>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
                              {activeRaid.customToolsUrl ? (
                                <>
                                  本遠征團已由團長上傳自訂攻略與資源包：<strong className="text-emerald-400 underline">{activeRaid.customToolsName}</strong>
                                  {activeRaid.customToolsUploadedAt && (
                                    <span className="text-slate-400 block mt-1 font-mono text-[11px]">
                                      上傳於：{new Date(activeRaid.customToolsUploadedAt).toLocaleString('zh-TW')}
                                    </span>
                                  )}
                                </>
                              ) : (
                                "內含【九層龍王遠征隊】各職業地圖走位教學、全功能打法指南、大腦與本體計時排程冷卻說明，以及個人出征必備補給藥水自主檢核清單 (.txt 檔案)。建議所有遠征團員下載。"
                              )}
                            </p>
                          </div>
                        </div>

                        <a
                          href={activeRaid.customToolsUrl || "./horntail_tools.zip"}
                          download={activeRaid.customToolsName || "horntail_tools.zip"}
                          className="bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] text-white font-black px-5 py-3 rounded-xl transition duration-200 text-xs md:text-sm shadow-lg text-center flex items-center justify-center space-x-2 active:scale-95 shrink-0"
                          id="download-horntail-tools"
                        >
                          <span>📥 下載遠征工具包 (.zip)</span>
                        </a>
                      </div>

                      {isCreator && (
                        <div className="pt-3.5 border-t border-emerald-800/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <span className="text-emerald-400 font-bold">
                            🛠️ 遠征團長工具管理：
                          </span>
                          <div className="flex items-center space-x-2.5">
                            <label className={`bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] text-white font-black px-3.5 py-2 rounded-xl cursor-pointer transition duration-200 shadow flex items-center space-x-1.5 active:scale-95 ${isUploadingTools ? 'opacity-50 pointer-events-none' : ''}`}>
                              <span>{isUploadingTools ? "⏳ 正在傳輸中..." : "📤 上傳／變更自訂 ZIP 包"}</span>
                              <input
                                type="file"
                                accept=".zip,.rar,.7z"
                                className="hidden"
                                disabled={isUploadingTools}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadTools(activeRaid.id, file);
                                  }
                                }}
                              />
                            </label>

                            {activeRaid.customToolsUrl && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomTools(activeRaid.id)}
                                className="bg-rose-955/65 hover:bg-rose-900 border border-rose-900/40 text-rose-300 font-extrabold px-3.5 py-2 rounded-xl transition cursor-pointer active:scale-95"
                              >
                                🗑️ 移除並回覆預設
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-400 border-t border-slate-800 select-none">
                    <div>
                      發起人：<strong className="text-slate-200">{activeRaid.creatorIgn}</strong>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyGroupFormat(activeRaid)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs md:text-sm shadow-sm"
                      >
                        📋 複製公會排班表
                      </button>

                      {isCreator && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenInteractiveCardModal(activeRaid)}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs md:text-sm shadow-md flex items-center space-x-1.5"
                            title="發送包含 🙋 快速報名 / 取消報名 按鈕的 Discord 卡片"
                          >
                            <span>🤖 發送 DC 互動招募卡片</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSyncDiscordSignups(activeRaid.id)}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-3.5 py-2.5 rounded-xl transition text-xs md:text-sm shadow-sm flex items-center space-x-1.5"
                            title="抓取 Discord 頻道中點擊按鈕報名的最新成員資料"
                          >
                            <span>🔄 同步 DC 報名</span>
                          </button>
                        </>
                      )}

                      {isCreator && discordConfig?.webhookUrl && (
                        <button
                          type="button"
                          onClick={() => sendDiscordRaidWebhook(activeRaid, 'post_roster')}
                          className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs md:text-sm shadow-sm flex items-center space-x-1.5"
                        >
                          <span>📢 廣播名單至 DC</span>
                        </button>
                      )}
                      
                      {isCreator && (
                        <>
                          <button
                            type="button"
                            onClick={startEditingRaid}
                            className="bg-amber-600/90 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs md:text-sm shadow-sm"
                          >
                            ✏️ 編輯此團
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleResetRaid(activeRaid.id)}
                            className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold px-4 py-2.5 rounded-xl transition text-xs md:text-sm"
                          >
                            🔄 重置名單
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRaid(activeRaid.id)}
                            className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-910 text-rose-300 px-4 py-2.5 rounded-xl transition text-xs md:text-sm"
                          >
                            🗑️ 刪除此團
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>



              {/* Roster & voting options details */}
              {activeRaid.mode === 'interest' ? (
                /* INTEREST MODE PANEL */
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4 select-none">
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-white">🙋 參與此突襲王意願調查</h3>
                      <p className="text-xs md:text-sm text-slate-400 mt-1">
                        請表達您本週是否有意願或角色能打此突襲王？再次點擊同個按鈕可智慧反選取消。
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const interestVotes = activeRaid.votes || [];
                    const yesVotes = interestVotes.filter((v: any) => v.votes?.['interest'] === 'yes' || v.votes?.[0] === 'yes' || v.votes?.['0'] === 'yes' || v.vote === 'yes' || Object.values(v.votes || {}).includes('yes')) || [];
                    const noVotes = interestVotes.filter((v: any) => v.votes?.['interest'] === 'no' || (v.votes?.[0] === 'no' && !Object.values(v.votes || {}).includes('yes')) || (v.vote === 'no' && !Object.values(v.votes || {}).includes('yes'))) || [];

                    const myVoteRecord = interestVotes.find((v: any) => 
                      (v.ign && v.ign.trim().toLowerCase() === activeCharacter.ign.trim().toLowerCase()) ||
                      (v.userId === customUid && v.ign === activeCharacter.ign) ||
                      (discordUser?.id && (v.discordId === discordUser.id || v.discord?.id === discordUser.id) && v.ign?.trim().toLowerCase() === activeCharacter.ign.trim().toLowerCase())
                    );
                    const isMyCharacterVotedYes = Boolean(
                      myVoteRecord && (
                        myVoteRecord.votes?.['interest'] === 'yes' || 
                        myVoteRecord.votes?.[0] === 'yes' || 
                        myVoteRecord.votes?.['0'] === 'yes' || 
                        myVoteRecord.vote === 'yes' || 
                        Object.values(myVoteRecord.votes || {}).includes('yes')
                      )
                    );

                    const renderVoterBadges = (votersList: any[], emoji: string) => {
                      if (votersList.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {votersList.map((voter, vIdx) => {
                            const alreadyInRaid = activeRaid.participants?.some((p: any) => p.userId === voter.userId && p.ign === voter.ign);
                            return (
                              <div 
                                key={voter.userId + '-' + voter.ign + '-' + voter.job + '-' + vIdx}
                                className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs transition hover:border-slate-700 max-w-full"
                              >
                                <span className="text-sm shrink-0 select-none">{emoji}</span>
                                
                                {voter.discord && (
                                  <span className="inline-flex items-center space-x-1 bg-[#5865F2]/10 border border-[#5865F2]/30 px-1.5 py-0.5 rounded-md text-[10px] font-black text-indigo-300 shadow shrink-0 select-none max-w-[90px] truncate">
                                    <img src={voter.discord.avatar} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                                    <span className="truncate">@{voter.discord.username}</span>
                                  </span>
                                )}

                                <span className="font-extrabold text-slate-100 max-w-[120px] truncate select-all" title={voter.ign}>
                                  {voter.ign}
                                </span>
                                
                                <span className="text-[10.5px] text-slate-400 font-bold shrink-0 flex items-center space-x-1 bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 rounded-lg select-none">
                                  <JobIcon jobName={voter.job} sizeClass="w-3 h-3" />
                                  <span className="text-slate-300 font-extrabold">{voter.job || '無'}</span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-white font-mono font-bold">Lv.{voter.level || '?'}</span>
                                </span>

                                {voter.memo && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoterDetailModal({ isOpen: true, voter });
                                    }}
                                    className="text-[10px] bg-slate-900 hover:bg-slate-850 hover:border-slate-700 border border-slate-800 px-1.5 py-0.5 rounded text-amber-300 transition shrink-0 font-bold active:scale-95"
                                  >
                                    詳細
                                  </button>
                                )}
                                
                                {isCreator && (
                                  <div className="flex items-center space-x-1 ml-1 border-l border-slate-800 pl-1.5 select-none shrink-0">
                                    {alreadyInRaid ? (
                                      <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] shrink-0 select-none">
                                        已錄取
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickEnroll(activeRaid.id, voter)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded text-[10px] transition active:scale-95 shrink-0"
                                      >
                                        ➕ 錄取
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVote(activeRaid.id, voter.userId, voter.ign, voter.job)}
                                      className="bg-rose-950 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-black px-1.5 py-0.5 rounded text-[10px] transition active:scale-95 shrink-0"
                                      title="剔除"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    };

                    return (
                      <div className="p-4 sm:p-5 rounded-2xl border bg-slate-950 border-slate-800 flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="select-none">
                            <h4 className="text-sm sm:text-base font-bold text-slate-200">
                              您本週是否有意願與時間參加【{boss?.name.split(' (')[0]}】突襲團？
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                              <span>當前報名角色：</span>
                              <strong className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg">{activeCharacter.ign || '(未設定角色)'}</strong>
                              <span className="text-slate-500">({activeCharacter.job || '無'} Lv.{activeCharacter.level || '?'})</span>
                            </p>
                          </div>
                          <div className="flex items-center select-none w-full md:w-auto">
                            <button
                              type="button"
                              onClick={() => handleVoteTime(activeRaid.id, 'interest', 'yes')}
                              className={`w-full md:w-auto py-2.5 px-6 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 active:scale-95 border ${
                                isMyCharacterVotedYes 
                                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/60' 
                                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:text-white'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${isMyCharacterVotedYes ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></span>
                              <span>{isMyCharacterVotedYes ? '🟢 已登記可以配合 (點擊取消)' : '🟢 可以配合'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-slate-800 pt-3 space-y-3 font-mono">
                          <div>
                            <span className="text-xs text-emerald-400 font-bold block mb-1">🟢 行程可以配合的人員 ({yesVotes.length} 人)：</span>
                            {yesVotes.length > 0 ? renderVoterBadges(yesVotes, '🟢') : <span className="text-slate-500 text-xs italic block py-1 font-sans">目前無隊員登記</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* datetime/time slots standard poll layout */
                <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3 sm:pb-4 select-none">
                    <div>
                      <h3 className="text-base sm:text-xl font-extrabold text-white">📅 候選出團時間投票</h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        請選擇可以配合的時間代入排班。再次點擊同個按鈕可智慧反選取消。
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {activeRaid.proposedTimes?.map((time: string, idx: number) => {
                      const yesVotes = activeRaid.votes?.filter((v: any) => v.votes?.[idx] === 'yes' || v.votes?.[String(idx)] === 'yes') || [];

                      const myVoteRecord = activeRaid.votes?.find((v: any) => 
                        (v.ign && v.ign.trim().toLowerCase() === activeCharacter.ign.trim().toLowerCase()) ||
                        (v.userId === customUid && v.ign === activeCharacter.ign) ||
                        (discordUser?.id && (v.discordId === discordUser.id || v.discord?.id === discordUser.id) && v.ign?.trim().toLowerCase() === activeCharacter.ign.trim().toLowerCase())
                      );
                      const isVotedYes = Boolean(myVoteRecord?.votes?.[idx] === 'yes' || myVoteRecord?.votes?.[String(idx)] === 'yes');

                      const isFinalized = activeRaid.finalTimeIndex === idx;

                      const renderVoterBadges = (votersList: any[], emoji: string) => {
                        if (votersList.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-2 mt-2 animate-in fade-in duration-300">
                            {votersList.map((voter, vIdx) => {
                              const alreadyInRaid = activeRaid.participants?.some((p: any) => p.userId === voter.userId && p.ign === voter.ign);
                              return (
                                <div 
                                  key={voter.userId + '-' + voter.ign + '-' + voter.job + '-' + vIdx}
                                  className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs transition hover:border-slate-700 max-w-full"
                                >
                                  <span className="text-sm shrink-0 select-none">{emoji}</span>
                                  
                                  {voter.discord && (
                                    <span className="inline-flex items-center space-x-1 bg-[#5865F2]/10 border border-[#5865F2]/30 px-1.5 py-0.5 rounded-md text-[10px] font-black text-indigo-300 shadow shrink-0 select-none max-w-[90px] truncate">
                                      <img src={voter.discord.avatar} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                                      <span className="truncate">@{voter.discord.username}</span>
                                    </span>
                                  )}

                                  <span className="font-extrabold text-slate-100 max-w-[120px] truncate select-all" title={voter.ign}>
                                    {voter.ign}
                                  </span>
                                  
                                  <span className="text-[10.5px] text-slate-400 font-bold shrink-0 flex items-center space-x-1 bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 rounded-lg select-none">
                                    <JobIcon jobName={voter.job} sizeClass="w-3 h-3" />
                                    <span className="text-slate-300 font-extrabold">{voter.job || '無'}</span>
                                    <span className="text-slate-500">•</span>
                                    <span className="text-white font-mono font-bold">Lv.{voter.level || '?'}</span>
                                  </span>

                                  {voter.memo && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVoterDetailModal({ isOpen: true, voter });
                                      }}
                                      className="text-[10px] bg-slate-900 hover:bg-slate-850 hover:border-slate-700 border border-slate-800 px-1.5 py-0.5 rounded text-amber-300 transition shrink-0 font-bold active:scale-95"
                                    >
                                      詳細
                                    </button>
                                  )}
                                  
                                  {isCreator && (
                                    <div className="flex items-center space-x-1 ml-1 border-l border-slate-800 pl-1.5 select-none shrink-0">
                                      {alreadyInRaid ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] shrink-0 select-none">
                                          已錄取
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickEnroll(activeRaid.id, voter)}
                                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded text-[10px] transition active:scale-95 shrink-0"
                                        >
                                          ➕ 錄取
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVote(activeRaid.id, voter.userId, voter.ign, voter.job)}
                                        className="bg-rose-950 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-black px-1.5 py-0.5 rounded text-[10px] transition active:scale-95 shrink-0"
                                        title="剔除"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      };

                      return (
                        <div 
                          key={idx} 
                          className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-3 sm:gap-4 ${isFinalized ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/40' : 'bg-slate-950 border-slate-800'}`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex-1 select-none">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-indigo-400 font-mono">時間候選區 #{idx + 1}</span>
                                {isFinalized && (
                                  <span className="bg-amber-400 text-slate-950 text-[10.5px] font-black px-2 py-0.5 rounded-lg shadow animate-pulse">
                                    ★ 最終拍板出征時段
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base sm:text-lg font-bold text-slate-100 mt-0.5 font-mono break-all">{formatDateTime(time)}</h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 select-none w-full md:w-auto">
                              <button
                                type="button"
                                onClick={() => handleVoteTime(activeRaid.id, idx, 'yes')}
                                className={`w-full md:w-auto py-2 px-5 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 border ${
                                  isVotedYes 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/60' 
                                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:text-white'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${isVotedYes ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></span>
                                <span>{isVotedYes ? '🟢 已登記可以配合 (點擊取消)' : '🟢 可以配合'}</span>
                              </button>

                              {isCreator && (
                                <div className="flex items-center gap-1.5 font-black w-full md:w-auto mt-1 md:mt-0">
                                  <button
                                    type="button"
                                    onClick={() => handleFinalizeTime(activeRaid.id, idx)}
                                    className={`flex-1 md:flex-none px-3 py-2 rounded-xl text-xs transition ${isFinalized ? 'bg-slate-900 border border-amber-500/40 text-amber-400' : 'bg-amber-400 text-slate-950 hover:bg-amber-300'}`}
                                  >
                                    {isFinalized ? '❌ 取消確定' : '🎯 確定此時間'}
                                  </button>
                                  
                                  {isFinalized && discordConfig?.webhookUrl && (
                                    <button
                                      type="button"
                                      onClick={() => sendDiscordRaidWebhook(activeRaid, 'finalize_time', { timeIndex: idx })}
                                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 py-2 rounded-xl text-xs flex items-center justify-center space-x-1 transition"
                                      title="發送出團時間至 Discord"
                                    >
                                      <span>📢 廣播時間</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-800/80 pt-3 space-y-2 font-mono">
                            {yesVotes.length > 0 ? (
                              <div>
                                <span className="text-xs text-emerald-400 font-bold block mb-1">🟢 可以配合的隊員 ({yesVotes.length} 人)：</span>
                                {renderVoterBadges(yesVotes, '🟢')}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs italic block py-1 font-sans">目前尚無人對此候選時段登記</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expedition parties / rosters group layout */}
              {(() => {
                const participants = activeRaid.participants || [];
                const party1 = participants.filter((p: any) => p.party === '1');
                const party2 = participants.filter((p: any) => p.party === '2');
                const party3 = participants.filter((p: any) => p.party === '3');
                const reserves = participants.filter((p: any) => p.party === 'reserve' || !p.party);

                const partyCount = activeRaid.partyCount || 1;

                const renderRosterGroup = (title: string, pList: any[], groupKey: string, color: string) => {
                  const slots = [...pList];
                  while (slots.length < 6) {
                    slots.push({ isPlaceholder: true });
                  }

                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-3.5 gap-2 select-none">
                          <h4 className="font-black text-base flex items-center space-x-2 min-w-0">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${color}`} />
                            <span className="text-slate-200 truncate">{title}</span>
                          </h4>
                          <div className="flex items-center space-x-2 shrink-0">
                            {groupKey !== 'reserve' && (
                              <button
                                type="button"
                                onClick={() => handleOpenThreadModal(groupKey, pList)}
                                className="text-[11px] bg-[#5865F2]/20 hover:bg-[#5865F2]/40 border border-[#5865F2]/30 hover:border-[#5865F2]/65 text-indigo-400 hover:text-indigo-300 font-extrabold px-2.5 py-1 rounded-lg transition shrink-0 select-none flex items-center space-x-1"
                                title="為此小隊在 Discord 建立專屬討論串"
                              >
                                <span>💬 討論串</span>
                              </button>
                            )}
                            <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 font-mono border border-slate-750">
                              {pList.length} / 6
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          {slots.map((p, idx) => {
                            if (p.isPlaceholder) {
                              return (
                                <div 
                                  key={`empty-${groupKey}-${idx}`} 
                                  className="border border-dashed border-slate-800/80 bg-slate-950/20 rounded-2xl py-3 px-4 flex items-center justify-between text-slate-600 text-sm italic select-none"
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <span className="font-mono font-bold text-slate-750 text-sm">{idx + 1}.</span>
                                    <span className="text-slate-500 tracking-wide text-sm font-medium">🪹 缺額待分配</span>
                                  </div>
                                  <span className="text-[10px] border border-dashed border-slate-850 px-2 py-0.5 rounded-lg font-bold text-slate-750 font-mono tracking-wider">EMPTY</span>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={p.userId + '-' + p.ign + '-' + p.job} 
                                className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 transition shadow-sm hover:border-slate-700"
                              >
                                <div className="flex flex-col gap-2 min-w-0">
                                  <div className="flex items-start justify-between min-w-0 gap-2">
                                    <div className="flex items-start space-x-2 min-w-0">
                                      <span className="font-mono font-bold text-slate-500 text-base mt-0.5">{idx + 1}.</span>
                                      <span className="font-black text-slate-100 text-[16px] break-all whitespace-normal select-text leading-tight" title={p.ign}>{p.ign}</span>
                                    </div>

                                    {p.discord && (
                                      <span className="inline-flex items-center space-x-1 bg-[#5865F2]/10 border border-[#5865F2]/30 px-2 py-0.5 rounded-lg text-[10px] font-black text-indigo-300 shadow shrink-0 select-none">
                                        <img src={p.discord.avatar} className="w-4 h-4 rounded-full object-cover" />
                                        <span className="max-w-[70px] truncate">@{p.discord.username}</span>
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-1.5 select-none">
                                    <span className="text-xs bg-slate-900 text-indigo-300 px-2.5 py-1 rounded-lg font-black border border-slate-800 shrink-0 flex items-center space-x-1.5">
                                      <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                                      <span>{p.job}</span>
                                    </span>
                                    <span className="text-xs bg-slate-900 text-slate-300 px-2 py-1 rounded-lg font-mono font-bold border border-slate-800 shrink-0">
                                      Lv.{p.level}
                                    </span>
                                  </div>
                                </div>

                                {p.memo && (
                                  <div className="bg-slate-900 border border-amber-500/10 text-amber-300 text-xs px-3.5 py-2.5 rounded-xl flex items-start space-x-2 leading-relaxed break-all select-text font-medium">
                                    <span className="shrink-0 text-amber-400 mt-0.5">💬</span>
                                    <span>{p.memo}</span>
                                  </div>
                                )}

                                {isCreator && (
                                  <div className="flex flex-col gap-2 mt-1 pt-2.5 border-t border-slate-800 select-none">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">調整組別或職等：</span>
                                    <div className="flex flex-wrap gap-1.5 items-center justify-between">
                                      <div className="flex flex-wrap gap-1">
                                        {groupKey !== '1' && (
                                          <button 
                                            type="button" 
                                            onClick={() => handleAssignParty(activeRaid.id, p.userId, p.ign, p.job, '1')} 
                                            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-800 font-bold transition"
                                          >
                                            一隊
                                          </button>
                                        )}
                                        {groupKey !== '2' && partyCount >= 2 && (
                                          <button 
                                            type="button" 
                                            onClick={() => handleAssignParty(activeRaid.id, p.userId, p.ign, p.job, '2')} 
                                            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-800 font-bold transition"
                                          >
                                            二隊
                                          </button>
                                        )}
                                        {groupKey !== '3' && partyCount >= 3 && (
                                          <button 
                                            type="button" 
                                            onClick={() => handleAssignParty(activeRaid.id, p.userId, p.ign, p.job, '3')} 
                                            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-800 font-bold transition"
                                          >
                                            三隊
                                          </button>
                                        )}
                                        {groupKey !== 'reserve' && (
                                          <button 
                                            type="button" 
                                            onClick={() => handleAssignParty(activeRaid.id, p.userId, p.ign, p.job, 'reserve')} 
                                            className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 font-bold transition"
                                          >
                                            候補
                                          </button>
                                        )}
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => handleKickParticipant(activeRaid.id, p.userId, p.ign, p.job)} 
                                        className="bg-rose-950 hover:bg-rose-900 border border-rose-900/60 text-rose-300 text-[11px] px-2.5 py-1.5 rounded-lg transition font-bold"
                                      >
                                        剔除
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="mt-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3 select-none">
                      <h3 className="text-xl font-black text-white">👥 遠征小隊編組名單</h3>
                      
                      {isCreator && (
                        <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                          <span className="text-xs text-slate-400 px-2 font-bold">調整小隊上限:</span>
                          {partyCount < 2 && (
                            <button 
                              type="button" 
                              onClick={() => handleUpdatePartyCount(activeRaid.id, 2)} 
                              className="bg-slate-850 hover:bg-slate-800 text-slate-250 border border-slate-750 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
                            >
                              ➕ 增加二隊
                            </button>
                          )}
                          {partyCount < 3 && partyCount >= 2 && (
                            <button 
                              type="button" 
                              onClick={() => handleUpdatePartyCount(activeRaid.id, 3)} 
                              className="bg-slate-850 hover:bg-slate-800 text-slate-250 border border-slate-755 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
                            >
                              ➕ 增加三隊
                            </button>
                          )}
                          {partyCount > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleUpdatePartyCount(activeRaid.id, partyCount - 1)} 
                              className="bg-slate-850 hover:bg-slate-800 text-rose-300 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 border border-slate-800"
                            >
                              ➖ 減少小隊數
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderRosterGroup('🔵 遠征一隊 (Party 1)', party1, '1', 'bg-blue-500')}
                      {partyCount >= 2 && renderRosterGroup('🟢 遠征二隊 (Party 2)', party2, '2', 'bg-emerald-500')}
                      {partyCount >= 3 && renderRosterGroup('🟣 遠征三隊 (Party 3)', party3, '3', 'bg-violet-500')}
                      {renderRosterGroup('🔸 預備 / 候補名單 (Reserves)', reserves, 'reserve', 'bg-slate-500')}
                    </div>

                    <div className="mt-8">
                      <SynergyAnalyzer 
                        participants={participants}
                        activeRaidId={activeRaid.id}
                        partyCount={partyCount}
                        boss={boss || undefined}
                        isCreator={isCreator}
                        onApplyOptimization={handleApplyOptimalRoster}
                        showToast={showToast}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </main>
      </div>

      {/* Floating Chat discussion compartment */}
      {activeRaid && (
        <ChatSection 
          raidId={activeRaid.id}
          appId={appId}
          customUid={customUid!}
          activeCharacter={activeCharacter}
          discordUser={discordUser}
          isAdminLoggedIn={isAdminLoggedIn}
          showToast={showToast}
          openProfileModal={() => setShowProfileModal(true)}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
        />
      )}

      {/* Footer controls */}
      <footer className="max-w-6xl mx-auto w-full px-4 py-8 text-center text-xs text-slate-700 border-t border-slate-900 mt-10 font-semibold select-none">
        <p>© 2026 NyxShade 遠征隊. All Rights Reserved.</p>
        <div className="mt-2 space-x-3 flex items-center justify-center flex-wrap gap-y-1">
          {isAdminLoggedIn ? (
            <>
              <button onClick={() => setShowAdminConsole(true)} className="text-amber-500 hover:text-amber-400 hover:underline font-bold transition cursor-pointer">🔑 開啟管理者控制台</button>
              <span className="text-slate-800">•</span>
              <button onClick={handleAdminLogout} className="text-rose-500 hover:text-rose-400 hover:underline transition cursor-pointer">登出 Master 管理模式</button>
            </>
          ) : isAuthorizedAdmin ? (
            <div className="inline-flex items-center space-x-2">
              <span className="text-emerald-400 font-extrabold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                👑 授權管理員 (免密碼)
              </span>
              <button onClick={() => setShowAdminConsole(true)} className="text-amber-400 hover:text-amber-300 font-extrabold hover:underline transition cursor-pointer">🔑 開啟管理者控制台</button>
            </div>
          ) : (
            <button onClick={() => setShowAdminLoginModal(true)} className="text-slate-600 hover:text-slate-500 hover:underline transition cursor-pointer">🔑 系統管理者登入</button>
          )}
          <span className="text-slate-800">•</span>
          <button onClick={() => setShowIssueReportModal(true)} className="text-rose-405 text-rose-400 hover:text-rose-300 hover:underline transition font-bold select-none cursor-pointer">🐛 問題或建議回報</button>
        </div>
      </footer>

      {/* Discord party thread creator modal */}
      <DiscordThreadModal
        isOpen={showThreadModal}
        onClose={() => setShowThreadModal(false)}
        partyTitle={threadPartyKey === '1' ? '🔵 遠征一隊' : threadPartyKey === '2' ? '🟢 遠征二隊' : '🟣 遠征三隊'}
        partyKey={threadPartyKey}
        threadTitle={threadTitle}
        setThreadTitle={setThreadTitle}
        threadMessage={threadMessage}
        setThreadMessage={setThreadMessage}
        onSend={handleSendDiscordThread}
        isSending={isSendingThread}
        members={threadMembers}
        discordConfig={discordConfig}
        showToast={showToast}
      />

      {/* Profile setups Modal */}
      <ProfileModal 
        appId={appId}
        customUid={customUid!}
        discordUser={discordUser}
        setDiscordUser={setDiscordUser}
        discordConfig={discordConfig}
        jobCategories={jobCategories}
        profile={profile}
        setProfile={setProfile}
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        getDiscordLoginUrl={getDiscordLoginUrl}
        handleDisconnectDiscord={handleDisconnectDiscord}
        showToast={showToast}
        raids={raids}
      />

      {/* Boss settings Modal */}
      <BossManagerModal 
        appId={appId}
        customBossesList={customBossesList}
        showBossManagerModal={showBossManagerModal}
        setShowBossManagerModal={setShowBossManagerModal}
        showToast={showToast}
        bosses={bosses}
        setBosses={setBosses}
      />

      {/* Jobs Manager Modal */}
      <JobManagerModal 
        appId={appId}
        jobCategories={jobCategories}
        setJobCategories={setJobCategories}
        showJobManagerModal={showJobManagerModal}
        setShowJobManagerModal={setShowJobManagerModal}
        showToast={showToast}
      />

      {/* Voter Profile Details Modal */}
      <VoterDetailModal 
        voter={voterDetailModal.voter}
        isOpen={voterDetailModal.isOpen}
        onClose={() => setVoterDetailModal({ isOpen: false, voter: null })}
      />

      {/* Admin Login Modal (With dark background bg-slate-900 to fix unreadable white input bug) */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative font-semibold">
            <button 
              type="button" 
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
            <h3 className="text-xl font-extrabold text-amber-400 mb-2">🔑 管理者後台登入</h3>
            <p className="text-xs text-slate-400 mb-5">請輸入管理者帳號與密碼以啟用名單編輯功能。</p>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-sm font-semibold font-bold">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 font-sans">管理員帳號</label>
                {/* FIXED background class bg-slate-950 for clear writing */}
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="請輸入帳號"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-505"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 font-sans">管理者密碼</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none bg-slate-950 focus:border-indigo-505"
                />
              </div>

              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[10px] text-amber-300 leading-relaxed font-bold">
                <span className="font-bold">💡 貼心提醒：</span><br />
                本系統目前預設管理帳號為 <code className="bg-slate-955 px-1 py-0.5 rounded font-mono text-[10px] bg-slate-950 text-slate-100">***</code>，密碼為 <code className="bg-slate-955 px-1 py-0.5 rounded font-mono text-[10px] bg-slate-950 text-slate-100">***</code>.
              </div>

              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl transition active:scale-95 shadow">核對密碼並登入</button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Console setups */}
      <AdminConsoleModal 
        appId={appId}
        isAdminLoggedIn={isAdmin}
        setIsAdminLoggedIn={setIsAdminLoggedIn}
        showAdminConsole={showAdminConsole}
        setShowAdminConsole={setShowAdminConsole}
        discordConfig={discordConfig}
        setDiscordConfig={setDiscordConfig}
        handleResetConfig={handleResetConfig}
        showToast={showToast}
        authorizedAdmins={authorizedAdmins}
      />

      {/* ==================== BUG / FEATURE SUGGESTION REPORT MODAL ==================== */}
      {showIssueReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative my-4 font-sans text-slate-100">
            <button 
              type="button" 
              onClick={() => setShowIssueReportModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
            <h3 className="text-lg md:text-xl font-extrabold text-rose-400 mb-1 flex items-center gap-2">
              <span>🐛 網頁故障與功能改版建議回報</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              當您使用網頁時遭遇 Bug、連線失效，或是對出團功能有任何新靈感點子，皆可在此送出！系統將自動排程，透過 Discord Webhook 幫您直接傳遞。
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleSendIssueReport(); }} className="space-y-4 text-xs font-bold leading-normal">
              <div>
                <label className="block text-xs font-extrabold text-slate-300 pr-1.5 pb-1.5">
                  📌 回報主旨 (問題或建議簡述)
                </label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="例如：排班名單跑版、登記新角色點不開、希望新增揪團通知..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-550 focus:border-indigo-500 placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 pr-1.5 pb-1.5">
                  ⚠️ 嚴重程度
                </label>
                <div className="grid grid-cols-3 gap-2 select-none">
                  {[
                    { value: 'suggestion', label: '🔵 功能優化建議', desc: '新構想或非致命優化' },
                    { value: 'bug', label: '🟡 網頁功能異常', desc: '按鈕失靈或資料有誤' },
                    { value: 'blocker', label: '🔴 嚴重阻礙使用', desc: '網頁當機或完全進不去' }
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setIssueSeverity(item.value as any)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 leading-tight ${
                        issueSeverity === item.value 
                          ? 'bg-rose-950/20 border-rose-500/80 text-rose-300 shadow'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/80 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-extrabold text-xs">{item.label}</span>
                      <span className="text-[9px] text-slate-500 font-normal">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 pr-1.5 pb-1.5">
                  📋 狀況詳細描述 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="請在此詳細填寫您所遇到的狀況、操作步驟，或希望加入的新功能構想內容..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-505 placeholder-slate-700 font-sans leading-relaxed"
                />
              </div>

              {/* User Identity Preview Frame */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 font-bold">
                <span className="text-[10px] text-slate-500 block">👤 回報身分關聯 (送出時將自動附加此身分資訊以便客服回覆)：</span>
                <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400">當前角色:</span>
                    {activeCharacter.ign ? (
                      <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                        <JobIcon jobName={activeCharacter.job} sizeClass="w-3.5 h-3.5" />
                        {activeCharacter.ign} ({activeCharacter.job} Lv.{activeCharacter.level})
                      </span>
                    ) : (
                      <span className="text-yellow-500/90 font-bold">未設定身分 (客人)</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400">Discord:</span>
                    {discordUser ? (
                      <span className="text-indigo-400 font-black">
                        @{discordUser.username}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal">未連結 Discord</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-2 select-none">
                <button 
                  type="button" 
                  onClick={() => setShowIssueReportModal(false)} 
                  className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 rounded-xl text-slate-300 transition"
                  disabled={isSendingIssue}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 py-2.5 rounded-xl text-white font-extrabold transition shadow-lg flex items-center justify-center space-x-2"
                  disabled={isSendingIssue}
                >
                  {isSendingIssue ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>正在傳送回報中...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀 傳送並回報至 Discord</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== FORM MODAL: CREATE EXPEDITION ==================== */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-semibold">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative my-8">
            <button 
              type="button" 
              onClick={() => setIsCreating(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
            <h3 className="text-xl font-extrabold text-white mb-2">🍁 發起全新遠征隊揪團</h3>
            <p className="text-xs text-slate-400 mb-6">請選擇出團模式與預設小隊組數，設定您的挑戰主題！</p>

            <form onSubmit={handleCreateRaid} className="space-y-4 text-sm">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">1. 選擇揪團模式</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRaid({ ...newRaid, mode: 'datetime' })}
                    className={`py-3 px-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${newRaid.mode !== 'interest' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow' : 'bg-slate-950 border-slate-805 text-slate-400'}`}
                  >
                    <span className="font-bold text-xs">📅 指定日期時間</span>
                    <span className="text-[10px] opacity-75 font-normal">提供時段供成員排班投票</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRaid({ ...newRaid, mode: 'interest' })}
                    className={`py-3 px-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${newRaid.mode === 'interest' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow' : 'bg-slate-950 border-slate-805 text-slate-400'}`}
                  >
                    <span className="font-bold text-xs">🙋 收集出團意願</span>
                    <span className="text-[10px] opacity-75 font-normal">只調查「可以/不行」線上協同</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">2. 選擇挑戰 Boss</label>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {bosses.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        const defaultParties = b.maxPlayers > 12 ? 3 : (b.maxPlayers > 6 ? 2 : 1);
                        setNewRaid({ ...newRaid, bossId: b.id, partyCount: defaultParties });
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-2 transition ${newRaid.bossId === b.id ? 'bg-slate-800 border-indigo-500 shadow-md' : 'bg-slate-950 border-slate-850 text-slate-300'}`}
                    >
                      <span className="text-2xl">{b.icon || '👹'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate">{b.name.split(' (')[0]}</p>
                        <p className="text-[10px] text-slate-400 truncate">最多{b.maxPlayers}人</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">3. 設定預設小隊組數</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setNewRaid({ ...newRaid, partyCount: count })}
                      className={`flex-1 py-2.5 rounded-xl border text-center font-bold text-xs transition ${
                        newRaid.partyCount === count
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-450 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      {count === 1 ? '🔵 一隊 (6人)' : count === 2 ? '🟢 二隊 (12人)' : '🟣 三隊 (18人)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">4. 揪團主題 / 團隊公告</label>
                {/* FIXED input background bg-slate-950 for readable typing */}
                <input
                  type="text"
                  required
                  value={newRaid.title}
                  onChange={(e) => setNewRaid({ ...newRaid, title: e.target.value })}
                  placeholder="例：週六晚上普通炎魔首發團"
                  className="w-full bg-slate-955 border border-slate-805 rounded-xl px-3 py-2 focus:outline-none text-slate-100 bg-slate-950 focus:border-indigo-500"
                />
              </div>

              {newRaid.mode !== 'interest' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                    <span>📅 候選日期與時間</span>
                    <button
                      type="button"
                      onClick={() => setNewRaid({ ...newRaid, proposedTimes: [...newRaid.proposedTimes, ''] })}
                      className="text-xs text-indigo-400 hover:underline font-bold"
                    >
                      + 新增時間段
                    </button>
                  </label>
                  <div className="space-y-2">
                    {newRaid.proposedTimes.map((time, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="datetime-local"
                          required
                          value={time}
                          onChange={(e) => {
                            const updated = [...newRaid.proposedTimes];
                            updated[index] = e.target.value;
                            setNewRaid({ ...newRaid, proposedTimes: updated });
                          }}
                          className="flex-1 bg-slate-955 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 focus:outline-none bg-slate-955/20 bg-slate-950"
                        />
                        {newRaid.proposedTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newRaid.proposedTimes.filter((_, i) => i !== index);
                              setNewRaid({ ...newRaid, proposedTimes: updated });
                            }}
                            className="text-rose-500 px-2 font-bold hover:text-rose-400"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">詳細備註</label>
                {/* FIXED background bg-slate-950 for readable typing */}
                <textarea
                  value={newRaid.notes}
                  onChange={(e) => setNewRaid({ ...newRaid, notes: e.target.value })}
                  placeholder="打王要求，自備藥水等..."
                  rows={3}
                  className="w-full bg-slate-955 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 focus:outline-none resize-none font-semibold bg-slate-950 placeholder-slate-650 focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-3 select-none">
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-slate-800 hover:bg-slate-755 border border-slate-705 py-2.5 rounded-xl text-slate-350 transition text-slate-300">取消</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 rounded-xl text-white font-bold transition duration-200">確認建立</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== FORM MODAL: EDIT EXPEDITION ==================== */}
      {isEditingRaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-semibold">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative my-8 animate-in fade-in duration-200">
            <button 
              type="button" 
              onClick={() => setIsEditingRaid(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
            <h3 className="text-xl font-extrabold text-amber-400 mb-2">✏️ 編輯遠征隊時間與設定</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">修改本次揪團的突襲王、公告主題、小隊組數 or 變更模式。</p>

            <form onSubmit={handleSaveRaidEdit} className="space-y-4 text-sm">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">揪團模式</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditRaidData({ ...editRaidData, mode: 'datetime' })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs ${editRaidData.mode !== 'interest' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow' : 'bg-slate-950 border-slate-805 text-slate-445 text-slate-400'}`}
                  >
                    📅 指定日期時間
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRaidData({ ...editRaidData, mode: 'interest' })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs ${editRaidData.mode === 'interest' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow' : 'bg-slate-955 border-slate-805 text-slate-445 text-slate-400 bg-slate-950'}`}
                  >
                    🙋 收集出團意願
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">挑戰 Boss</label>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {bosses.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        const defaultParties = b.maxPlayers > 12 ? 3 : (b.maxPlayers > 6 ? 2 : 1);
                        setEditRaidData({ ...editRaidData, bossId: b.id, partyCount: defaultParties });
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-2 transition ${editRaidData.bossId === b.id ? 'bg-slate-800 border-indigo-500 shadow-md bg-opacity-70' : 'bg-slate-950 border-slate-850 text-slate-300'}`}
                    >
                      <span className="text-2xl">{b.icon || '👹'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate">{b.name.split(' (')[0]}</p>
                        <p className="text-[10px] text-slate-400 truncate">最多{b.maxPlayers}人</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">設定小隊組數</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setEditRaidData({ ...editRaidData, partyCount: count })}
                      className={`flex-1 py-2 rounded-xl border text-center font-bold text-xs transition-all ${
                        editRaidData.partyCount === count
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-455 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      {count === 1 ? '🔵 一隊' : count === 2 ? '🟢 二隊' : '🟣 三隊'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">修改主題 / 團隊公告</label>
                {/* FIXED background bg-slate-950 for typing visibility */}
                <input
                  type="text"
                  required
                  value={editRaidData.title}
                  onChange={(e) => setEditRaidData({ ...editRaidData, title: e.target.value })}
                  placeholder="例如：週六晚上普通炎魔首發團"
                  className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none text-slate-100 bg-slate-950 focus:border-indigo-500"
                />
              </div>

              {editRaidData.mode !== 'interest' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                    <span>📅 調整候選出團時間</span>
                    <button
                      type="button"
                      onClick={() => setEditRaidData({ ...editRaidData, proposedTimes: [...editRaidData.proposedTimes, ''] })}
                      className="text-xs text-indigo-400 hover:underline font-bold"
                    >
                      + 新增候選時間
                    </button>
                  </label>
                  <div className="space-y-2">
                    {editRaidData.proposedTimes.map((time, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="datetime-local"
                          required
                          value={time}
                          onChange={(e) => {
                            const updated = [...editRaidData.proposedTimes];
                            updated[index] = e.target.value;
                            setEditRaidData({ ...editRaidData, proposedTimes: updated });
                          }}
                          className="flex-1 bg-slate-955 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 focus:outline-none bg-slate-955/20 bg-slate-955 bg-slate-950"
                        />
                        {editRaidData.proposedTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editRaidData.proposedTimes.filter((_, i) => i !== index);
                              setEditRaidData({ ...editRaidData, proposedTimes: updated });
                            }}
                            className="text-rose-500 px-2 font-bold hover:text-rose-400"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">修改詳細備註</label>
                {/* FIXED background bg-slate-950 for clear text entry */}
                <textarea
                  value={editRaidData.notes}
                  onChange={(e) => setEditRaidData({ ...editRaidData, notes: e.target.value })}
                  placeholder="打王戰術要求，或藥水等裝備限制..."
                  rows={3}
                  className="w-full bg-slate-955 border border-slate-805 rounded-xl px-3 py-2 text-slate-100 focus:outline-none resize-none bg-slate-950 placeholder-slate-650 focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-3 select-none">
                <button type="button" onClick={() => setIsEditingRaid(false)} className="flex-1 bg-slate-800 hover:bg-slate-755 border border-slate-705 py-2.5 rounded-xl text-slate-350 transition text-slate-300">取消</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 rounded-xl text-white font-bold transition duration-200 shadow">確認儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border ${
            toast.type === 'error' 
              ? 'bg-rose-950/95 border-rose-800 text-rose-200' 
              : 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
          }`}>
            <span>{toast.type === 'error' ? '❌' : '✅'}</span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Interactive Card Dispatch Modal */}
      <InteractiveCardModal
        isOpen={showInteractiveModal}
        onClose={() => setShowInteractiveModal(false)}
        raid={activeRaid}
        bossName={bosses.find(b => b.id === activeRaid?.bossId)?.name.split(' (')[0] || activeRaid?.title || '遠征隊'}
        discordConfig={discordConfig}
        onSend={executePostInteractiveCard}
        isSending={isSendingThread}
        showToast={showToast}
      />

      {/* PWA Install Guide Modal */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        showToast={showToast}
      />

    </div>
  );
}
