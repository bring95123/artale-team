/**
 * Types and Constants for NyxShade Expedition System
 */

export interface Boss {
  id: string;
  name: string;
  icon: string;
  color: string;
  maxPlayers: number;
  desc: string;
  isCustom?: boolean;
}

export interface Character {
  ign: string;
  job: string;
  level: number;
  memo: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
}

export interface Profile {
  activeCharacterIndex: number;
  characters: Character[];
  discord: DiscordUser | null;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  category: 'maintenance' | 'update' | 'event' | 'security';
  date: string;
  timeRange?: string;
  isLatest?: boolean;
  isImportant?: boolean;
  summary: string;
  highlights: {
    icon: string;
    label: string;
    content: string;
  }[];
  details: string[];
  sourceUrl?: string;
  author?: string;
}

export interface Participant {
  userId: string;
  ign: string;
  job: string;
  level: number;
  memo: string;
  discord: DiscordUser | null;
  party: string; // '1' | '2' | '3' | 'reserve'
  isPlaceholder?: boolean;
}

export interface Vote {
  userId: string;
  ign: string;
  job: string;
  level: number;
  memo: string;
  discord: DiscordUser | null;
  votes: {
    [key: string]: 'yes' | 'maybe' | 'no';
  };
}

export interface ChatMessage {
  id?: string;
  raidId: string;
  userId: string;
  ign: string;
  job: string;
  level: number;
  text: string;
  timestamp: number;
  recalled?: boolean;
  discord?: DiscordUser | null;
  createdAt?: any; // firebase timestamp
}

export interface WebhookChannel {
  id: string;
  name: string;
  url: string;
}

export interface DiscordConfig {
  clientId: string;
  redirectUri: string;
  mode: 'implicit' | 'code';
  apiEndpoint: string;
  webhookUrl: string;
  issueWebhookUrl?: string;
  webhooks?: WebhookChannel[];
  botToken?: string;
  botChannelId?: string;
  publicKey?: string;
}

export interface GachaFortune {
  status: string;
  color: string;
  dcColor: number;
  desc: string;
}

export interface GachaResult {
  fortune: GachaFortune;
  luckyNumbers: string;
  spot: string;
  almanac?: {
    luckyColor: string;
    luckyItem: string;
    shouldDo: string;
    shouldNotDo: string;
    luckyPartner: string;
  };
}

export interface AuthorizedAdmin {
  id: string;
  ign: string;
  discordUsername?: string;
  discordId?: string;
  customUid?: string;
  memo?: string;
  grantedAt?: string;
  grantedBy?: string;
}

// MaplesStory Artale Default Presets
export const DEFAULT_BOSS_LIST: Boss[] = [
  { id: 'zakum_normal', name: '普通炎魔 (Normal Zakum)', icon: '🔥', color: 'from-amber-600 to-red-700', maxPlayers: 6, desc: '最經典 of 8 手炎魔，需要良好調度。' },
  { id: 'papu_normal', name: '普通拉圖斯 (Normal Papulatus)', icon: '⏰', color: 'from-blue-550 to-indigo-600', maxPlayers: 6, desc: '需要注意計時器與地圖炸彈。' },
  { id: 'papu_hard', name: '困難拉圖斯 (Hard Papulatus)', icon: '⏰', color: 'from-violet-600 to-fuchsia-850', maxPlayers: 6, desc: 'Artale 超高難度挑戰，極度考驗輸出與走位。' },
  { id: 'horntail', name: '闇黑龍王 (Horntail)', icon: '🐉', color: 'from-emerald-600 to-teal-800', maxPlayers: 12, desc: '三顆龙头與多部位挑戰，誘惑控制是關鍵。' }
];

export const BOSS_EMOJIS_LIST = ['🔥', '⏰', '🐉', '🦋', '👹', '💀', '🐙', '👾', '🍁', '⚔️', '🛡️', '👑', '🧙', '🔮', '💎', '🦊', '🦁', '🦉', '🌋'];

export const BOSS_GRADIENTS_PRESETS = [
  { name: '烈焰紅', value: 'from-red-600 to-rose-950' },
  { name: '深海藍', value: 'from-blue-700 to-indigo-950' },
  { name: '翡翠綠', value: 'from-emerald-700 to-teal-950' },
  { name: '幻影紫', value: 'from-purple-850 to-violet-950' },
  { name: '琥珀金', value: 'from-amber-600 to-orange-950' },
  { name: '黯夜黑', value: 'from-slate-800 to-slate-900' }
];

export const DEFAULT_JOB_CATEGORIES: { [category: string]: { [tier: string]: string[] } } = {
  '劍士': {
    '2轉': ['狂戰士', '見習騎士', '槍騎兵'],
    '3轉': ['十字軍', '騎士', '龍騎士'],
    '4轉': ['英雄', '聖騎士', '黑騎士']
  },
  '法師': {
    '2轉': ['僧侶', '火毒巫師', '冰雷巫師'],
    '3轉': ['祭司', '火毒魔導士', '冰雷魔導士'],
    '4轉': ['主教', '火毒大魔導', '冰雷大魔導']
  },
  '弓箭手': {
    '2轉': ['獵人', '弩弓手'],
    '3轉': ['遊俠', '狙擊手'],
    '4轉': ['箭神', '神射手']
  },
  '盜賊': {
    '2轉': ['刺客', '俠盜'],
    '3轉': ['暗殺者', '神偷'],
    '4轉': ['夜使者', '暗影神偷']
  },
  '海盜': {
    '2轉': ['打手', '槍手'],
    '3轉': ['格鬥家', '神槍手'],
    '4轉': ['拳霸', '槍神']
  }
};

export const GACHA_FORTUNES: GachaFortune[] = [
  { status: '🌟 【氣運沖天】大吉', color: 'from-yellow-400 to-amber-500 bg-amber-500/10 text-amber-300 border-amber-400/40', dcColor: 16766720, desc: '今天氣運沖天！衝捲必過，打寶率提升 999%！闇黑龍王看到你都瑟瑟發抖，請直接點 10% 捲！' },
  { status: '🟢 【歐氣滿滿】中吉', color: 'from-emerald-500 to-teal-600 bg-emerald-500/10 text-emerald-400 border-emerald-400/40', dcColor: 3066993, desc: '諸事皆宜，出團隨手撿到頂級母書與裝備，點捲成功機率大增。快去多扶老奶奶過馬路維持歐氣！' },
  { status: '🔵 【春風得意】小吉', color: 'from-blue-550 to-indigo-600 bg-blue-500/10 text-blue-400 border-blue-400/30', dcColor: 3447003, desc: '平穩進步的幸運日，適合與老戰友一起組隊推拉圖斯，走位靈活不容易發生地圖事故。' },
  { status: '⚪ 【清爽舒暢】吉', color: 'from-slate-400 to-slate-600 bg-slate-500/10 text-slate-300 border-slate-500/20', dcColor: 10197915, desc: '運勢良好，野外打怪掉寶率穩定。雖然不會一夜暴富，但今天會有小驚喜。' },
  { status: '🟡 【平穩修行】末吉', color: 'from-orange-400 to-amber-600 bg-orange-500/10 text-amber-500 border-orange-500/20', dcColor: 15105570, desc: '今日衝裝有小機率爆炸！推薦使用 60% 捲求穩，或者把素材先屯在倉庫，今天不宜與機率對賭。' },
  { status: '🟣 【避世修行】凶', color: 'from-purple-500 to-slate-705 bg-purple-500/10 text-purple-400 border-purple-500/20', dcColor: 10181046, desc: '心緒不寧，今日衝捲有爆炸危機！不痛不癢的一天，適合發呆聊天當稱職的商人，推薦去找主教吸吸仙氣。' },
  { status: '💀 【水逆厄運】大凶', color: 'from-red-650 to-rose-950 bg-red-500/10 text-rose-500 border-red-500/30', dcColor: 15158332, desc: '今日衝捲必爆、挑戰 Boss 必被誘惑！強烈建議今天乖乖當個吹風機發呆，別碰任何機率裝備！' }
];

export const FORTUNE_DESCRIPTIONS: { [status: string]: string[] } = {
  '🌟 【氣運沖天】大吉': [
    '今天氣運沖天！衝捲必過，打寶率提升 999%！闇黑龍王看到你都瑟瑟發抖，請直接點 10% 捲！',
    '神明在耳邊悄悄指點：今日點裝，一發入魂！全場裝備神光萬丈，千萬不要浪費這驚天好運！',
    '全身散發著不尋常的金色流光，路過的野怪都會自動掉落神級卷軸與紫裝！今日你就是楓之谷之神！',
    '天選之人！幸運女神親自為你倒茶！今日強烈推薦點爆 10% 或 30% 神卷，絕對能見證奇蹟誕生！'
  ],
  '🟢 【歐氣滿滿】中吉': [
    '諸事皆宜，出團隨手撿到頂級母書與裝備，點捲成功機率大增。快去多扶老奶奶過馬路維持歐氣！',
    '運勢極佳！今日去打王連掉寶率都高人一等，點 60% 卷軸更有如神助，快把握時間衝一波防具！',
    '走在路上連天空都變得特別藍，去打任何怪物都覺得格外輕鬆，可能一不小心就打到極品裝備！',
    '公會的歐皇就是你！今天與夥伴組隊，能為全隊帶來神秘的高掉寶加持符號，快去和隊友貼貼！'
  ],
  '🔵 【春風得意】小吉': [
    '平穩進步的幸運日，適合與老戰友一起組隊推拉圖斯，走位靈活不容易發生地圖事故。',
    '今天的心情就跟玩具城的輕快音樂一樣，衝裝成功率穩定，適合買賣裝備和稍微點個一兩張 60% 捲。',
    '今日操作極佳，技能施放行雲流水，挑戰各大 Boss 都有很好的輸出表現！有機會獲得不錯的母書。',
    '運氣雖然不是爆棚，但絕對能順風順水，打怪特別順手。點裝修煉也有平穩的幸運加護。'
  ],
  '⚪ 【清爽舒暢】吉': [
    '運勢良好，野外打怪掉寶率穩定。雖然不會一夜暴富，但今天會有小驚喜。',
    '清爽的一天，打獵和做任務的效率都稍微提高。適合清一下平時沒空解的任務或成就。',
    '運勢安定，適合跟朋友去黃金海岸曬太陽與泡茶，也許會在與路人交談中得到不錯的交易機會！',
    '今天是不錯的日子，野外打怪時會發現掉落金幣與特殊藥水機率小幅上升，平穩就是福！'
  ],
  '🟡 【平穩修行】末吉': [
    '今日衝裝有小機率爆炸！推薦使用 60% 捲求穩，或者把素材先屯在倉庫，今天不宜與機率對賭。',
    '心境不夠平靜，建議今天先做日常修行，不要因為一時衝動而點高價卷軸，穩扎穩打才是王道。',
    '今日運勢有些摩擦，去打怪有可能會多耗一些藥水。和朋友聊天打屁、逛逛自由市場是個好選擇！',
    '小有起伏的一天，做事要多留一個心眼，特別是交易與給裝備加持時，深呼吸三次再動手！'
  ],
  '🟣 【避世修行】凶': [
    '心緒不寧，今日衝捲有爆炸危機！不痛不癢的一天，適合發呆聊天當稱職的商人，推薦去找主教吸吸仙氣。',
    '運勢稍有黯淡，建議今天先不要去挑戰危險的主力王，可以多留在弓箭手村發呆聽音樂放鬆，沉著應變。',
    '今日在野外可能容易遇到斷尾事故，做事不宜過於激進。跟公會同伴多多聊天吹水，這樣能默默化解凶煞之氣！',
    '命格今天有些小坎坷，不適合與機率進行硬碰硬。帶帶公會新手、多解解趣味任務是消除今天厄運的良藥！'
  ],
  '💀 【水逆厄運】大凶': [
    '今日衝捲必爆、挑戰 Boss 必被誘惑！強烈建議今天乖乖當個吹風機發呆，別碰任何機率裝備！',
    '今日水逆在頭頂盤旋！可能喝水都會噎到，點 100% 卷軸都有可能產生錯覺，宜靜待今日過去。',
    '厄運附體！如果今天去打拉圖斯可能會連續踩雷，趕緊在弓箭手村找椅子坐下聽音樂，拒絕出征！',
    '千萬別在這天點神兵！防具和武器正在哭泣！建議今天多做善事，或者上線吹水就好！'
  ]
};

export const GACHA_SPOTS = [
  '楓之島嫩寶黃金狩獵場 🐌 (回到初心起點，讓藍嫩寶的純真提升衝卷成功率！)',
  '維多利亞 弓箭手村計程車旁 🚕 (全島最經典吸歐氣聚會聖地，在人群圍觀中點出神兵！)',
  '黃金海岸溫暖椰子樹下 🌴 (沐浴在黃金海岸海風中，神清氣爽，點卷自然成！)',
  '天空之城 塔頂女神雕像前 ☁️ (最接近女神的雲端神殿，吸飽高空星空靈氣精華！)',
  '冰原雪域長老公館暖爐旁 ❄️ (在極寒低溫中點卷，低溫冷卻能保證裝備防爆防熱！)',
  '玩具城時間通道扭曲處 ⏰ (扭曲時空的奇幻入口，倒轉厄運、修正非酋倒楣氣場！)',
  '地球防衛總部 愛斯卡爾艙外 🛸 (利用外星超高科技雷射加護，大幅激發卷軸波段能量！)',
  '童話村圖書館老書台 📖 (沉浸在古老東方傳說的墨香中，神明庇佑必得極品！)',
  '西門町捷運站三號出口 🚇 (在最潮的台北街頭喧囂中，用時尚潮流引領卷軸光學！)',
  '台北101 頂樓戶外觀景台 🏙️ (登上高塔之巔俯瞰眾生，一鳴驚人點爆神級白字屬性！)',
  '水世界 深海皮亞奴斯洞穴 🐟 (深海水壓緊密貼著，讓卷軸與裝備完美融合不留任何瑕疵！)',
  '桃花仙境 太極修煉場演武台 ☯️ (在太極和風熊貓的陰陽精氣交匯中，點卷化險為夷！)',
  '靈藥幻境 百年仙人藥草砂鍋 🧪 (將裝備浸泡於黃金人參精華中點卷，大補身骨推論不損壞！)',
  '神木村 生命之樹最頂端 🌳 (端坐於生命之樹的最頂梢，感受大自然古神的最強防爆防炸祝福！)',
  '日本 昭和村極道大姐頭背後 🌸 (在櫻花落葉下，伴隨大姐頭的震懾霸氣與粉色浪漫點卷！)',
  '泰國 水上市場金象神雕像前 🐘 (接受古老金光石象守護神的莊嚴洗禮，招財開運又防爆！)'
];
