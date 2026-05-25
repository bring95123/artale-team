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

export interface DiscordConfig {
  clientId: string;
  redirectUri: string;
  mode: 'implicit' | 'code';
  apiEndpoint: string;
  webhookUrl: string;
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
}

// MaplesStory Artale Default Presets
export const DEFAULT_BOSS_LIST: Boss[] = [
  { id: 'zakum_normal', name: '普通炎魔 (Normal Zakum)', icon: '🔥', color: 'from-amber-600 to-red-700', maxPlayers: 6, desc: '最經典 of 8 手炎魔，需要良好調度。' },
  { id: 'papu_normal', name: '普通拉圖斯 (Normal Papulatus)', icon: '⏰', color: 'from-blue-500 to-indigo-600', maxPlayers: 6, desc: '需要注意計時器與地圖炸彈。' },
  { id: 'papu_hard', name: '困難拉圖斯 (Hard Papulatus)', icon: '⏰', color: 'from-violet-600 to-fuchsia-850', maxPlayers: 6, desc: 'Artale 超高難度挑戰，極度考驗輸出與走位。' },
  { id: 'horntail', name: '闇黑龍王 (Horntail)', icon: '🐉', color: 'from-emerald-600 to-teal-800', maxPlayers: 12, desc: '三顆龙头與多部位挑戰，誘惑控制是關鍵。' },
  { id: 'pink_bean', name: '蝴蝶(艾畢) (Pink Bean)', icon: '🦋', color: 'from-pink-400 to-rose-600', maxPlayers: 12, desc: '目前終極 Boss，雕像攻略與反射考驗。' }
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
    '2轉': ['俠盜', '刺客'],
    '3轉': ['神偷', '暗殺者'],
    '4轉': ['暗影神偷', '夜使者']
  },
  '海盜': {
    '2轉': ['打手', '槍手'],
    '3轉': ['格鬥家', '神槍手'],
    '4轉': ['拳霸', '槍神']
  }
};

export const GACHA_FORTUNES: GachaFortune[] = [
  { status: '🌟 【神之狂熱】超大吉！', color: 'from-yellow-400 to-amber-500 bg-amber-500/10 text-amber-300 border-amber-400/40', dcColor: 16766720, desc: '今天氣運沖天！衝捲必過，打寶率提升 999%！Pink Bean 看到你都瑟瑟發抖，請直接點 10% 捲！' },
  { status: '🟢 【歐氣滿滿】大吉', color: 'from-emerald-500 to-teal-600 bg-emerald-500/10 text-emerald-400 border-emerald-400/40', dcColor: 3066993, desc: '諸事皆宜，出團隨手撿到頂級母書與裝備，點捲成功機率大增。快去多扶老奶奶過馬路維持歐氣！' },
  { status: '🔵 【春風得意】中吉', color: 'from-blue-550 to-indigo-600 bg-blue-500/10 text-blue-400 border-blue-400/30', dcColor: 3447003, desc: '平穩進步的幸運日，適合與老戰友一起組隊推拉圖斯，走位靈活不容易發生地圖事故。' },
  { status: '⚪ 【清爽舒暢】吉', color: 'from-slate-400 to-slate-600 bg-slate-500/10 text-slate-300 border-slate-500/20', dcColor: 10197915, desc: '運勢良好，野外打怪掉寶率穩定。雖然不會一夜暴富，但今天會有小驚喜。' },
  { status: '🟡 【平穩修行】末吉', color: 'from-orange-400 to-amber-600 bg-orange-500/10 text-amber-500 border-orange-500/20', dcColor: 15105570, desc: '今日衝裝有小機率爆炸！推薦使用 60% 捲求穩，或者把素材先屯在倉庫，今天不宜與機率對賭。' },
  { status: '🟣 【靜心放空】平', color: 'from-purple-500 to-slate-700 bg-purple-500/10 text-purple-400 border-purple-500/20', dcColor: 10181046, desc: '不痛不癢的一天，適合發呆聊天。今天去帶帶公會新手，或在市場當稱職的商人吧！' },
  { status: '💀 【水逆退散】凶', color: 'from-red-650 to-rose-950 bg-red-500/10 text-rose-500 border-red-500/30', dcColor: 15158332, desc: '今日衝捲必爆、挑戰 Boss 必被誘惑！強烈建議今天乖乖當個吹風機發呆，別碰任何機率裝備！' }
];

export const GACHA_SPOTS = [
  '墮落城市下水道 🪠 (聽著BGM與達克魯斯一同冥想)',
  '弓箭手村計程車旁 🚕 (最經典的養老與發呆吸歐氣聖地)',
  '玩具城時間通道 ⏰ (時間倒流，修正非酋運氣)',
  '天空之城塔頂 ☁️ (最接近女神的地方，風水極佳)',
  '勇士之村麥吉身旁 ⚔️ (在烈日鐵血中淬鍊神兵利器)',
  '冰原雪域長老公館 ❄️ (寒風刺骨，讓頭腦保持最清醒的點捲狀態)',
  '神木村大樹頂端 🌳 (吸收世界之樹的自然靈氣精華)',
  '水世界皮亞奴斯洞穴 🐟 (深海沉靜，阻絕一切厄運喧囂)'
];
