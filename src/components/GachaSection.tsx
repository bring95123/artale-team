import React, { useState, useEffect } from 'react';
import { GachaResult, Character, DiscordUser, DiscordConfig, GACHA_FORTUNES, GACHA_SPOTS, FORTUNE_DESCRIPTIONS } from '../types';
import FortuneDashboard from './FortuneDashboard';

const ALMANAC_SHOULD_DOS = [
  '衝 10% 神秘卷軸 (絕地反擊大機率過！)',
  '找公會主教吸吸歐氣 (幸運Buff拉滿！)',
  '組隊推倒普通黑龍王 (隊伍掉寶率加倍！)',
  '在弓箭手村發呆吟詩 (心誠則靈逢凶化吉！)',
  '合成頂級屬性武器 (匠人之心附體必出神兵！)',
  '在玩具城與戰友聚會 (友情羈絆助你一臂之力！)',
  '熱心帶路新手解任務 (默默累積巨大好運！)',
  '在交易市場開市大吉 (高價拋售滯銷裝備！)'
];

const ALMANAC_SHOULD_NOT_DOS = [
  '深夜點 30% 卷軸對賭 (極高機率爆炸！)',
  '挑戰闇黑龍王時踩到尾巴炸死 (痛失整局遠征體驗！)',
  '在冰原雪域裸奔發呆 (容易降低自身幸運值！)',
  '忘記喝神秘補油藥水 (當心石碑凌空墜落！)',
  '隻身挑戰 Papulatus 困難 (直接送命回村！)',
  '與不熟識的商人私下交易 (提防被老中醫誆騙！)',
  '在深夜開罐子鑑定裝備 (心浮氣躁容易血虧！)',
  '未解日常任務就去衝裝 (會降低幸運神官好感度！)'
];

const ALMANAC_COLORS = [
  '烈焰紅 🔴 (火力全開，傷害直接翻倍！)',
  '深海藍 🔵 (沉著冷靜，微操走位如神！)',
  '翡翠綠 🟢 (生機盎然，野外掉寶率加乘！)',
  '幻影紫 🟣 (氣質非凡，自由市場遇貴人！)',
  '琥珀金 🟡 (財運亨通，金幣掉落叮噹響！)',
  '晶瑩白 ⚪ (光芒萬丈，點裝防爆安全！)',
  '黯夜黑 ⚫ (大智若愚，神明在暗中呵護！)'
];

const ALMANAC_ITEMS = [
  '初心藍嫩寶殼 (初心者的最強防爆開運符)',
  '百分百滿溢的超級藥水 (喝下瞬間重拾自信)',
  '主教贈與的暖心祝福光環 (完美驅散霉運)',
  '百分之十傳說卷軸 (觸發不尋常大暴擊)',
  '玩具城限定精緻落櫻洋傘 (遮風避雨擋水逆)',
  '粉色發光電吉他 (彈奏高雅的歐氣樂章)',
  '拉圖斯褪色鬧鐘指針 (可微調好運時軸偏角)',
  '黃金海岸的椰汁刨冰 (清熱消心魔，點卷最順！)'
];

const ALMANAC_PARTNERS = [
  '法師類 (主教/冰雷/火毒 - 淨化妖邪，好運連連)',
  '劍士類 (英雄/聖騎士/黑騎士 - 提供金石不壞防護)',
  '盜賊類 (夜使者/暗影神偷 - 隱身伺機切入歐氣線)',
  '弓箭手類 (箭神/神射手 - 遠程精準鎖定幸運星)',
  '海盜類 (拳霸/槍神 - 火力重炮，橫掃倒楣霉運)'
];

const generateAlmanac = () => {
  return {
    luckyColor: ALMANAC_COLORS[Math.floor(Math.random() * ALMANAC_COLORS.length)],
    luckyItem: ALMANAC_ITEMS[Math.floor(Math.random() * ALMANAC_ITEMS.length)],
    shouldDo: ALMANAC_SHOULD_DOS[Math.floor(Math.random() * ALMANAC_SHOULD_DOS.length)],
    shouldNotDo: ALMANAC_SHOULD_NOT_DOS[Math.floor(Math.random() * ALMANAC_SHOULD_NOT_DOS.length)],
    luckyPartner: ALMANAC_PARTNERS[Math.floor(Math.random() * ALMANAC_PARTNERS.length)]
  };
};

interface GachaSectionProps {
  activeCharacter: Character;
  discordUser: DiscordUser | null;
  discordConfig: DiscordConfig | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openProfileModal: () => void;
  onSaveFortune?: (result: GachaResult, note?: string) => Promise<void>;
  fortunesList?: any[];
  customUid?: string | null;
}

export default function GachaSection({
  activeCharacter,
  discordUser,
  discordConfig,
  showToast,
  openProfileModal,
  onSaveFortune,
  fortunesList = [],
  customUid = null
}: GachaSectionProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [isSendingToDiscord, setIsSendingToDiscord] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('default');
  const [wishingNote, setWishingNote] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState(false);

  // Check 8 AM reset for daily gacha
  const checkHasResetPassed = (lastTime: number) => {
    if (!lastTime) return true;
    const now = new Date();
    const lastDate = new Date(lastTime);

    const getEightAm = (date: Date) => {
      const d = new Date(date);
      d.setHours(8, 0, 0, 0);
      return d.getTime();
    };

    const nowEightAm = getEightAm(now);
    const lastEightAm = now.getTime() >= nowEightAm ? nowEightAm : nowEightAm - 24 * 60 * 60 * 1000;

    return lastDate.getTime() < lastEightAm;
  };

  useEffect(() => {
    const savedTime = localStorage.getItem('nyxshade_last_gacha_time');
    const savedResult = localStorage.getItem('nyxshade_last_gacha_result');
    const savedNote = localStorage.getItem('nyxshade_last_wishing_note');

    if (savedNote) {
      setWishingNote(savedNote);
    }

    if (savedTime && savedResult) {
      if (!checkHasResetPassed(Number(savedTime))) {
        try {
          setGachaResult(JSON.parse(savedResult));
        } catch (e) {
          console.error("Failed to parse saved gacha", e);
        }
      }
    }
  }, []);

  const generateLuckyNumbers = (): string => {
    const numbers: number[] = [];
    while (numbers.length < 3) {
      const n = Math.floor(Math.random() * 99) + 1;
      if (!numbers.includes(n)) numbers.push(n);
    }
    return `${numbers[0]}, ${numbers[1]}, ${numbers[2]}`;
  };

  const handleSpinGacha = () => {
    if (!activeCharacter || !activeCharacter.ign) {
      showToast("⚠️ 請先設定右上角的身分角色卡才能啟用轉蛋！", "error");
      openProfileModal();
      return;
    }

    const lastGachaTime = localStorage.getItem('nyxshade_last_gacha_time');
    if (lastGachaTime && !checkHasResetPassed(Number(lastGachaTime))) {
      showToast("🛑 今天已經求過籤囉！請靜候明日早上 08:00 重新解鎖神社。", "error");
      return;
    }

    setIsSpinning(true);
    setGachaResult(null);

    let count = 0;
    const interval = setInterval(() => {
      const randomFortuneRaw = GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)];
      const randomSpot = GACHA_SPOTS[Math.floor(Math.random() * GACHA_SPOTS.length)];

      const pool = FORTUNE_DESCRIPTIONS[randomFortuneRaw.status] || [randomFortuneRaw.desc];
      const randomDesc = pool[Math.floor(Math.random() * pool.length)];

      const randomFortune = {
        ...randomFortuneRaw,
        desc: randomDesc
      };

      setGachaResult({
        fortune: randomFortune,
        luckyNumbers: generateLuckyNumbers(),
        spot: randomSpot,
        almanac: generateAlmanac()
      });

      count++;
      if (count > 15) {
        clearInterval(interval);
        
        const finalFortuneRaw = GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)];
        const finalSpot = GACHA_SPOTS[Math.floor(Math.random() * GACHA_SPOTS.length)];
        const finalNumbers = generateLuckyNumbers();

        const finalPool = FORTUNE_DESCRIPTIONS[finalFortuneRaw.status] || [finalFortuneRaw.desc];
        const finalDesc = finalPool[Math.floor(Math.random() * finalPool.length)];

        const finalFortune = {
          ...finalFortuneRaw,
          desc: finalDesc
        };

        const finalResult = {
          fortune: finalFortune,
          luckyNumbers: finalNumbers,
          spot: finalSpot,
          almanac: generateAlmanac()
        };

        setGachaResult(finalResult);
        setIsSpinning(false);

        localStorage.setItem('nyxshade_last_gacha_time', String(Date.now()));
        localStorage.setItem('nyxshade_last_gacha_result', JSON.stringify(finalResult));
        localStorage.setItem('nyxshade_last_wishing_note', wishingNote);

        if (onSaveFortune) {
          onSaveFortune(finalResult, wishingNote).catch((e) => console.error("Failed to save fortune to firestore", e));
        }

        showToast("🔮 今日好運轉蛋抽取完成！快秀出運勢給公會吧！");
      }
    }, 80);
  };

  const generateGachaImageBlob = async (
    fortuneStatus: string,
    fortuneDesc: string,
    luckyNumbers: string,
    spot: string,
    ign: string,
    job: string,
    level: number,
    almanac?: any
  ): Promise<Blob> => {
    const width = 800;
    const height = 635;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create 2D canvas context");

    // 1. Draw light theme gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Helper for rounded rect
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    // Card frame
    drawRoundedRect(20, 20, width - 40, height - 40, 24, '#ffffff', '#e2e8f0');

    // Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("🍁 NyxShade 遠征幸運神社 • 今日好運神籤", 45, 68);

    ctx.fillStyle = '#475569';
    ctx.font = '13px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText(`冒險家：${ign} (${job} Lv.${level})  •  每日 08:00 重置`, 45, 95);

    // Left card: Fortune Status
    drawRoundedRect(45, 125, 340, 440, 20, '#f8fafc', '#cbd5e1');

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 12px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("TODAY'S DESTINY • 今日命定運勢", 70, 160);

    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 26px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText(fortuneStatus, 70, 205);

    // Fortune description
    ctx.fillStyle = '#334155';
    ctx.font = '13.5px "Microsoft JhengHei", sans-serif';
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const chars = text.split('');
      let line = '';
      let currentY = y;
      for (let i = 0; i < chars.length; i++) {
        const testLine = line + chars[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, x, currentY);
          line = chars[i];
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
    };
    wrapText(fortuneDesc, 70, 255, 290, 24);

    // Right widgets
    // Widget 1: Lucky numbers
    drawRoundedRect(410, 125, 345, 100, 16, '#f8fafc', '#e2e8f0');
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 11px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("LUCKY NUMBERS • 幸運數字", 430, 150);

    ctx.fillStyle = '#4338ca';
    ctx.font = 'bold 22px Courier, monospace';
    ctx.fillText(`🎲  [ ${luckyNumbers} ]`, 430, 185);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px "Microsoft JhengHei", sans-serif';
    ctx.fillText("與此尾數相配、或名字有相關的角色組隊最神！", 430, 208);

    // Widget 2: Upgrade destination
    drawRoundedRect(410, 240, 345, 100, 16, '#f8fafc', '#e2e8f0');
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 11px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("BEST UPGRADE SPOT • 衝卷聖地", 430, 265);

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 13px Arial, "Microsoft JhengHei", sans-serif';
    wrapText(`🔨 ${spot}`, 430, 292, 305, 18);

    // Widget 3: Daily Almanac
    drawRoundedRect(410, 355, 345, 210, 16, '#f8fafc', '#e2e8f0');
    ctx.fillStyle = '#7e22ce';
    ctx.font = 'bold 11px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("MAPLE DAILY ALMANAC • 冒險黃曆", 430, 380);

    if (almanac) {
      ctx.fillStyle = '#065f46';
      ctx.font = '12px "Microsoft JhengHei", sans-serif';
      ctx.fillText(`🏮 宜：${almanac.shouldDo || '打怪'}`, 430, 410);

      ctx.fillStyle = '#9f1239';
      ctx.font = '12px "Microsoft JhengHei", sans-serif';
      ctx.fillText(`❌ 忌：${almanac.shouldNotDo || '衝裝'}`, 430, 440);

      ctx.fillStyle = '#334155';
      ctx.font = '12px "Microsoft JhengHei", sans-serif';
      ctx.fillText(`🎨 色：${almanac.luckyColor || '無'}`, 430, 470);
      ctx.fillText(`💍 物：${almanac.luckyItem || '無'}`, 430, 500);
      ctx.fillText(`🤝 伴：${almanac.luckyPartner || '無'}`, 430, 530);
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, 'image/png');
    });
  };

  const handleSendFortuneToDiscord = async () => {
    if (!gachaResult || isSendingToDiscord) return;
    if (!discordConfig) return;

    let targetWebhookUrl = discordConfig.webhookUrl;
    let channelName = "預設通用頻道";

    if (selectedWebhookId !== 'default' && discordConfig.webhooks) {
      const found = discordConfig.webhooks.find(wh => wh.id === selectedWebhookId);
      if (found) {
        targetWebhookUrl = found.url;
        channelName = `#${found.name}`;
      }
    }

    if (!targetWebhookUrl) {
      showToast("⚠️ 所選的廣播頻道尚未設定 Webhook 連結！", "error");
      return;
    }

    setIsSendingToDiscord(true);
    showToast("🎨 正在為您精繪今日運勢卡片...", "info");

    const dcTag = discordUser ? `<@${discordUser.id}>` : '';
    const authorName = activeCharacter.ign;
    const job = activeCharacter.job;
    const level = activeCharacter.level;

    try {
      const imageBlob = await generateGachaImageBlob(
        gachaResult.fortune.status,
        gachaResult.fortune.desc,
        gachaResult.luckyNumbers,
        gachaResult.spot,
        authorName,
        job,
        level,
        gachaResult.almanac
      );

      const formData = new FormData();
      formData.append('files[0]', imageBlob, 'gacha_fortune.png');

      const payload = {
        content: `🔮 **楓之谷今日幸運求籤** ${dcTag} 推開了命運神社的門扉...`,
        embeds: [{
          title: `🍁 NyxShade 遠征幸運轉蛋報告 🔮`,
          description: `冒險者 **${authorName}** (${job} Lv.${level}) 的今日好運籤已經出爐！`,
          color: gachaResult.fortune.dcColor,
          fields: [
            { name: "🏮 今日宜事 (Do)", value: gachaResult.almanac?.shouldDo || "無特別宜事", inline: true },
            { name: "❌ 今日相忌 (Don't)", value: gachaResult.almanac?.shouldNotDo || "無特別相忌", inline: true },
            { name: "🎨 幸運色彩", value: gachaResult.almanac?.luckyColor || "無特別色彩", inline: true },
            { name: "💍 命定神物", value: gachaResult.almanac?.luckyItem || "無特別神物", inline: true },
            { name: "🤝 命伴職業", value: gachaResult.almanac?.luckyPartner || "無特別夥伴", inline: true }
          ],
          image: {
            url: 'attachment://gacha_fortune.png'
          },
          footer: {
            text: `NyxShade 命運神宮 • 傳送至 ${channelName} ✧`
          },
          timestamp: new Date().toISOString()
        }]
      };

      formData.append('payload_json', JSON.stringify(payload));

      const response = await fetch(targetWebhookUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        showToast(`📢 成功將今日運勢卡片傳送到 Discord ${channelName} 頻道！`, "success");
      } else {
        throw new Error("Discord API rejected request");
      }
    } catch (err: any) {
      console.error(err);
      showToast("發送至 Discord 失敗，請確認該頻道 Webhook 網址是否正確！", "error");
    } finally {
      setIsSendingToDiscord(false);
    }
  };

  return (
    <div id="gacha-panel" className="mb-6 p-4 sm:p-6 md:p-8 rounded-3xl bg-white border border-slate-200 shadow-md relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md font-extrabold select-none">
            MAPLE GACHA
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 mt-1.5">
            <span>🔮 楓之谷幸運神社</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            立刻來抽一發幸運神籤，看看今日衝裝與打寶運勢！（每人每天早上 08:00 重置一次喔）
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowDashboard(!showDashboard)}
            className={`flex-1 md:flex-none border font-black px-3.5 py-2.5 rounded-xl shadow-sm transition text-xs flex items-center justify-center space-x-1.5 cursor-pointer ${
              showDashboard 
                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <span>📊 {showDashboard ? '收合公會大數據' : '查看公會大數據'}</span>
          </button>

          <button
            type="button"
            onClick={handleSpinGacha}
            disabled={isSpinning}
            className="flex-1 md:flex-none bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-400 text-white font-black px-4 sm:px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            {isSpinning ? (
              <span className="flex items-center space-x-1.5">
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full"></span>
                <span>神宮求籤中...</span>
              </span>
            ) : (
              <span>🎰 抽取今日好運轉蛋</span>
            )}
          </button>

          {gachaResult && !isSpinning && (discordConfig?.webhookUrl || (discordConfig?.webhooks && discordConfig.webhooks.length > 0)) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0 w-full md:w-auto">
              <select
                value={selectedWebhookId}
                onChange={(e) => setSelectedWebhookId(e.target.value)}
                className="bg-white border border-slate-300 text-xs text-slate-800 rounded-lg py-2 px-2.5 outline-none font-bold sm:max-w-[130px]"
                title="選擇要發送的 Discord 頻道"
                disabled={isSendingToDiscord}
              >
                {discordConfig?.webhookUrl && (
                  <option value="default">📢 預設主要頻道</option>
                )}
                {discordConfig?.webhooks?.map(wh => (
                  <option key={wh.id} value={wh.id}>💬 #{wh.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSendFortuneToDiscord}
                disabled={isSendingToDiscord}
                className="bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-slate-300 text-white font-black px-3.5 py-2 rounded-lg text-xs transition shadow-sm flex items-center justify-center space-x-1.5 shrink-0 flex-1 sm:flex-none cursor-pointer"
                title="將此好運勢精繪成圖卡，發佈至選定的 Discord 頻道！"
              >
                {isSendingToDiscord ? (
                  <span className="flex items-center space-x-1">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full"></span>
                    <span>發送中...</span>
                  </span>
                ) : (
                  <span>🖼️ 秀圖片到 DC</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wishing Note Input Field */}
      {!gachaResult && !isSpinning && (
        <div className="mb-4 bg-slate-50 border border-slate-200 p-3.5 sm:p-4 rounded-2xl">
          <label className="block text-xs font-black text-indigo-700 uppercase tracking-widest mb-1.5 font-mono select-none">
            ⭐ 撰寫今日星空願望 (選填，展示於公會星空祈願牆)
          </label>
          <input
            type="text"
            maxLength={60}
            value={wishingNote}
            onChange={(e) => setWishingNote(e.target.value)}
            placeholder="例如：希望今天衝10%手卷能成功一發入魂！"
            className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition"
          />
        </div>
      )}
      {gachaResult && !isSpinning && (
        <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 select-none">
            <span className="text-sm">✨</span>
            <span className="text-xs text-slate-800 font-semibold">
              今日許願：<strong className="text-indigo-800 font-extrabold">“ {wishingNote || '希望衝裝順利、全隊爆寶！'} ”</strong>
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              const newWish = prompt("修改您的今日星空願望：", wishingNote);
              if (newWish !== null) {
                setWishingNote(newWish);
                localStorage.setItem('nyxshade_last_wishing_note', newWish);
                if (onSaveFortune) {
                  onSaveFortune(gachaResult, newWish).catch(e => console.error(e));
                }
                showToast("✨ 星空願望儲存成功！已同步展示於公會大數據看板！", "success");
              }
            }}
            className="text-[10px] text-indigo-700 hover:text-indigo-900 font-black bg-white px-3 py-1 rounded-xl border border-indigo-200 shrink-0 select-none text-center shadow-sm"
          >
            ✏️ 修改心願
          </button>
        </div>
      )}

      {/* Gacha Results Panel */}
      {gachaResult ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 animate-in fade-in slide-in-from-top-4 duration-350">
          {/* Status card */}
          <div className={`p-4 rounded-2xl border transition bg-gradient-to-br ${gachaResult.fortune.color} flex flex-col justify-between shadow-md text-white`}>
            <div>
              <span className="text-[10.5px] font-bold text-white/80 block uppercase tracking-wide">TODAY STATUS</span>
              <h4 className="text-lg font-black text-white mt-1 drop-shadow-sm">{gachaResult.fortune.status}</h4>
            </div>
            <p className="text-xs text-white/95 leading-relaxed mt-3.5 bg-black/25 p-2.5 rounded-xl border border-white/20">
              {gachaResult.fortune.desc}
            </p>
          </div>

          {/* Lucky numbers card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 block uppercase tracking-wide">LUCKY NUMBERS</span>
              <h4 className="text-lg font-black text-indigo-700 mt-1 flex items-center space-x-1.5 font-mono">
                <span>🎲</span>
                <span className="truncate tracking-wider">[ {gachaResult.luckyNumbers} ]</span>
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-3.5 bg-white p-2.5 rounded-xl border border-slate-200">
              今日大發幸運數字：與身邊含有這些數字的戰友一起出征吧！
            </p>
          </div>

          {/* Upgrade spot card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 block uppercase tracking-wide">BEST UPGRADE SPOT</span>
              <h4 className="text-base font-black text-amber-800 mt-1 flex items-center space-x-1.5">
                <span>🔨</span>
                <span className="truncate">衝裝首選聖地</span>
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-3.5 bg-white p-2.5 rounded-xl border border-slate-200">
              {gachaResult.spot}
            </p>
          </div>

          {/* Daily Almanac card */}
          {gachaResult.almanac && (
            <div className="col-span-full mt-2 p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
              <span className="text-[10.5px] font-black text-indigo-700 block uppercase tracking-widest font-mono mb-3 select-none">
                🏮 MAPLE DAILY ALMANAC • 命運遠征冒險黃曆
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10.5px] text-emerald-700 font-extrabold flex items-center gap-1 mb-1 select-none">
                    <span>🏮</span> 宜 (Should Do)
                  </div>
                  <div className="text-xs font-black text-slate-900">{gachaResult.almanac.shouldDo}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10.5px] text-rose-700 font-extrabold flex items-center gap-1 mb-1 select-none">
                    <span>❌</span> 忌 (Don't Do)
                  </div>
                  <div className="text-xs font-black text-slate-900">{gachaResult.almanac.shouldNotDo}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10.5px] text-amber-800 font-extrabold flex items-center gap-1 mb-1 select-none">
                    <span>🎨</span> 幸運色彩
                  </div>
                  <div className="text-xs font-black text-slate-900">{gachaResult.almanac.luckyColor}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10.5px] text-indigo-700 font-extrabold flex items-center gap-1 mb-1 select-none">
                    <span>💍</span> 命定神物
                  </div>
                  <div className="text-xs font-black text-slate-900">{gachaResult.almanac.luckyItem}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10.5px] text-purple-700 font-extrabold flex items-center gap-1 mb-1 select-none">
                    <span>🤝</span> 命伴職業
                  </div>
                  <div className="text-xs font-black text-slate-900">{gachaResult.almanac.luckyPartner}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-500 text-xs italic bg-slate-50 select-none">
          🔮 還沒有求籤喔！請點選上方「🎰 抽取今日好運轉蛋」啟動運勢預測。
        </div>
      )}

      {showDashboard && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <FortuneDashboard
            fortunesList={fortunesList}
            activeCharacter={activeCharacter}
            customUid={customUid}
            showToast={showToast}
          />
        </div>
      )}
    </div>
  );
}
