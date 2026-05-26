import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RotateCcw, 
  TrendingUp, 
  Flame, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Layers, 
  Play, 
  Check, 
  X,
  Gauge,
  HelpCircle,
  Copy
} from 'lucide-react';

// Sfx Sound Synthesizer using client-side Web Audio API
class NostalgiaSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialized when first sound plays to abide by browser autoplay restrictions
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.error('Failed to initialize Web Audio Context', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Classic golden rising arpeggio C4, E4, G4, C5 (major chord harmony)
    const notes = [261.63, 329.63, 392.00, 523.25];
    const duration = 0.12;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle'; // Retro 8-bit sound
      osc.frequency.setValueAtTime(freq, now + idx * duration);

      gain.gain.setValueAtTime(0, now + idx * duration);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * duration + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * duration + duration + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * duration);
      osc.stop(now + idx * duration + duration + 0.1);
    });
  }

  public playFailure() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Disappointing de-escalating retro buzzer slide
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    // Simple low pass filter to make it warmer/retro
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playBoom() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.6; // 0.6 seconds of sound
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to sweep the noise down (authentic explosion / boom sound)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    // Parallel low pitch sinewave rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.linearRampToValueAtTime(40, now + 0.45);
    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noiseNode.start(now);
    subOsc.start(now);
    
    noiseNode.stop(now + 0.6);
    subOsc.stop(now + 0.6);
  }
}

// Prefabricated Equipment Templates conforming to Nostalgic/Artale settings
interface EquipTemplate {
  name: string;
  type: string;
  slots: number;
  icon: string;
  desc: string;
  baseStats: {
    watk: number; // physical weapon attack
    matk: number; // magic attack
    def: number;
    str: number;
    dex: number;
    int: number;
    luk: number;
    acc: number;
    eva: number;
  };
}

const PRIMITIVE_ITEMS: EquipTemplate[] = [
  {
    name: '帽',
    type: 'helmet',
    slots: 7,
    icon: '🪖',
    desc: '頭部防禦與屬性強化的關鍵部位。可用頭盔智力卷軸衝上智力。',
    baseStats: { watk: 0, matk: 0, def: 15, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '上衣',
    type: 'top',
    slots: 7,
    icon: '👕',
    desc: '上衣軀幹核心防護。支持力量、防禦力屬性極限砸卷。',
    baseStats: { watk: 0, matk: 0, def: 18, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '下衣',
    type: 'bottom',
    slots: 7,
    icon: '👖',
    desc: '下半身防禦與敏捷強化。最契合衝取敏捷與防禦力屬性。',
    baseStats: { watk: 0, matk: 0, def: 14, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '套服',
    type: 'overall',
    slots: 10,
    icon: '🥋',
    desc: '天生自帶高達 10 次的升級機會！物理職業衝敏捷、法師衝智力的黃金基底。',
    baseStats: { watk: 0, matk: 0, def: 25, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '鞋子',
    type: 'shoes',
    slots: 7,
    icon: '👟',
    desc: '腳底生風！可增加敏捷、跳躍或爆發敏捷、防禦等核心戰力。',
    baseStats: { watk: 0, matk: 0, def: 8, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '手套',
    type: 'gloves',
    slots: 5,
    icon: '🧤',
    desc: '全職業通用衝裝首選。乾淨手套不帶任何攻擊，為洗出極限破表多攻手套的夢想基石。',
    baseStats: { watk: 0, matk: 0, def: 2, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '披風',
    type: 'cape',
    slots: 5,
    icon: '🧣',
    desc: '懷舊披風，自帶防禦。可用披風各主屬性卷軸進行完美砸卷。',
    baseStats: { watk: 0, matk: 0, def: 5, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '盾牌',
    type: 'shield',
    slots: 7,
    icon: '🛡️',
    desc: '最令人垂涎的副手盾牌，可用「盾牌魔力卷軸」衝出魔法攻擊，極致法系必備。',
    baseStats: { watk: 0, matk: 0, def: 35, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '臉飾',
    type: 'face',
    slots: 5,
    icon: '🎭',
    desc: '臉部飾品，多用於衝取迴避率或力量屬性以補強力。',
    baseStats: { watk: 0, matk: 0, def: 1, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '眼飾',
    type: 'eye',
    slots: 5,
    icon: '🕶️',
    desc: '眼部精密掛件，通常使用眼飾命中卷（提高物理命中）或眼飾智力卷軸。',
    baseStats: { watk: 0, matk: 0, def: 1, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '耳環',
    type: 'earring',
    slots: 5,
    icon: '👂',
    desc: '法系與遠程飾品，砸入耳環智力卷軸，獲取高額魔攻與智力的王牌裝備。',
    baseStats: { watk: 0, matk: 0, def: 1, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '戒指',
    type: 'ring',
    slots: 5,
    icon: '💍',
    desc: '極致奢華之戒，六維屬性全面提升，高機率追加全屬性加持。',
    baseStats: { watk: 1, matk: 1, def: 1, str: 1, dex: 1, int: 1, luk: 1, acc: 0, eva: 0 }
  },
  {
    name: '墜飾',
    type: 'pendant',
    slots: 5,
    icon: '📿',
    desc: '掛墜飾品，可完美衝取力量或幸運屬性強化。',
    baseStats: { watk: 0, matk: 0, def: 2, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '腰帶',
    type: 'belt',
    slots: 5,
    icon: '🎗️',
    desc: '腰部防具，支持腰帶力量與防禦力砸卷，可補足大量力量屬性。',
    baseStats: { watk: 0, matk: 0, def: 3, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  },
  {
    name: '肩章',
    type: 'shoulder',
    slots: 5,
    icon: '🎖️',
    desc: '肩套飾品，少見的升級槽位，能衝特定物理攻擊或敏捷屬性。',
    baseStats: { watk: 0, matk: 0, def: 2, str: 0, dex: 0, int: 0, luk: 0, acc: 0, eva: 0 }
  }
];

// Scroll template specifications
interface ScrollTemplate {
  name: string;
  successRate: number;
  boomOnFail: number; // destruction percentage (0-100) if failed
  desc: string;
  stats: {
    watk?: number;
    matk?: number;
    str?: number;
    dex?: number;
    int?: number;
    luk?: number;
    acc?: number;
    def?: number;
    eva?: number;
  };
  isDark: boolean; // Curse scroll
}

const SCROLL_DICTIONARY: Record<string, ScrollTemplate[]> = {
  helmet: [
    { name: '頭盔智力卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '穩過！智力 +1', stats: { int: 1 } },
    { name: '頭盔智力卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '智力 +2, 防禦 +1', stats: { int: 2, def: 1 } },
    { name: '頭盔智力卷軸 10%', successRate: 10, boomOnFail: 0, isDark: false, desc: '夢想！智力 +5, 防禦 +3', stats: { int: 5, def: 3 } },
    { name: '頭盔智力詛咒卷軸 70% (詛咒)', successRate: 70, boomOnFail: 50, isDark: true, desc: '70%成功：智力 +3, 防禦 +2。失敗50%機率【摧毀裝備】', stats: { int: 3, def: 2 } },
    { name: '頭盔智力詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：智力 +5, 物理防 +3。失敗50%【摧毀裝備】', stats: { int: 5, def: 3 } }
  ],
  top: [
    { name: '上衣力量卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '穩過！力量 +1', stats: { str: 1 } },
    { name: '上衣力量卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '力量 +2, 防禦 +1', stats: { str: 2, def: 1 } },
    { name: '上衣力量卷軸 10%', successRate: 10, boomOnFail: 0, isDark: false, desc: '夢想！力量 +5, 防禦 +3', stats: { str: 5, def: 3 } },
    { name: '上衣力量詛咒卷軸 70% (詛咒)', successRate: 70, boomOnFail: 50, isDark: true, desc: '70%成功：力量 +3, 防禦 +2。失敗50%機率【摧毀裝備】', stats: { str: 3, def: 2 } },
    { name: '上衣力量詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：力量 +5, 物理防 +3。失敗50%【摧毀裝備】', stats: { str: 5, def: 3 } }
  ],
  bottom: [
    { name: '下衣敏捷卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '穩過！敏捷 +1', stats: { dex: 1 } },
    { name: '下衣敏捷卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '敏捷 +2, 防禦 +1', stats: { dex: 2, def: 1 } },
    { name: '下衣敏捷卷軸 10%', successRate: 10, boomOnFail: 0, isDark: false, desc: '夢想！敏捷 +5, 防禦 +3', stats: { dex: 5, def: 3 } },
    { name: '下衣敏捷詛咒卷軸 70% (詛咒)', successRate: 70, boomOnFail: 50, isDark: true, desc: '70%成功：敏捷 +3, 防禦 +2。失敗50%機率【摧毀裝備】', stats: { dex: 3, def: 2 } },
    { name: '下衣敏捷詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：敏捷 +5, 物理防 +3。失敗50%【摧毀裝備】', stats: { dex: 5, def: 3 } }
  ],
  overall: [
    { name: '套服敏捷卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '穩過！敏捷 +1', stats: { dex: 1 } },
    { name: '套服敏捷卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '敏捷 +2, 命中 +1', stats: { dex: 2, acc: 1 } },
    { name: '套服智力卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '法師必備！智力 +2, 防禦 +1', stats: { int: 2, def: 1 } },
    { name: '套服敏捷詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：敏捷 +5, 命中 +3。失敗50%【摧毀裝備】', stats: { dex: 5, acc: 3 } },
    { name: '套服智力詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：智力 +5, 防禦 +3。失敗50%【摧毀裝備】', stats: { int: 5, def: 3 } }
  ],
  shoes: [
    { name: '鞋子跳躍卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '穩過！迴避 +1', stats: { eva: 1 } },
    { name: '鞋子跳躍卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '敏捷 +1, 迴避 +2', stats: { dex: 1, eva: 2 } },
    { name: '鞋子敏捷卷軸 10%', successRate: 10, boomOnFail: 0, isDark: false, desc: '夢想！敏捷 +5, 迴避 +3', stats: { dex: 5, eva: 3 } },
    { name: '鞋子敏捷詛咒卷軸 70% (詛咒)', successRate: 70, boomOnFail: 50, isDark: true, desc: '70%成功：敏捷 +3, 迴避 +2。失敗50%【摧毀裝備】', stats: { dex: 3, eva: 2 } },
    { name: '鞋子敏捷詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：敏捷 +5, 迴避 +3。失敗50%【摧毀裝備】', stats: { dex: 5, eva: 3 } }
  ],
  gloves: [
    { name: '手套攻擊力卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '穩過！物理攻擊力 +1', stats: { watk: 1 } },
    { name: '手套攻擊力卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '主流熱門！物攻 +2', stats: { watk: 2 } },
    { name: '手套攻擊力卷軸 10%', successRate: 10, boomOnFail: 0, isDark: false, desc: '夢想單車！物攻 +5', stats: { watk: 5 } },
    { name: '手套攻擊力詛咒卷軸 70% (詛咒)', successRate: 70, boomOnFail: 50, isDark: true, desc: '70%成功：物攻 +2, 力量 +1。失敗50%【摧毀裝備】', stats: { watk: 2, str: 1 } },
    { name: '手套攻擊力詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '神人專屬！物攻 +5, 力量 +2。失敗50%【摧毀裝備】', stats: { watk: 5, str: 2 } }
  ],
  cape: [
    { name: '披風力量卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '力量型披風！力量 +2', stats: { str: 2 } },
    { name: '披風幸運卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '幸運型披風！幸運 +2', stats: { luk: 2 } },
    { name: '披風智力卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '智力型披風！智力 +2', stats: { int: 2 } },
    { name: '披風力量詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：力量 +5。失敗50%【摧毀裝備】', stats: { str: 5 } },
    { name: '披風幸運詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：幸運 +5。失敗50%【摧毀裝備】', stats: { luk: 5 } },
    { name: '披風智力詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：智力 +5。失敗50%【摧毀裝備】', stats: { int: 5 } }
  ],
  shield: [
    { name: '盾牌魔力卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '法系盾牌！魔法攻擊力 +2, 智力 +1', stats: { matk: 2, int: 1 } },
    { name: '盾牌魔力卷軸 10%', successRate: 10, boomOnFail: 0, isDark: false, desc: '夢幻法盾！魔法攻擊力 +5, 智力 +3', stats: { matk: 5, int: 3 } },
    { name: '盾牌魔力詛咒卷軸 70% (詛咒)', successRate: 70, boomOnFail: 50, isDark: true, desc: '70%成功：魔攻 +2, 智力 +1。失敗50%【摧毀裝備】', stats: { matk: 2, int: 1 } },
    { name: '盾牌魔力詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '極限法盾！魔攻 +5, 智力 +3。失敗50%【摧毀裝備】', stats: { matk: 5, int: 3 } },
    { name: '盾牌防禦卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '防禦 +2, 力量 +1', stats: { def: 2, str: 1 } }
  ],
  face: [
    { name: '臉飾迴避卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '迴避率 +2, 敏捷 +1', stats: { eva: 2, dex: 1 } },
    { name: '臉飾力量卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '力量 +2, 防禦 +1', stats: { str: 2, def: 1 } },
    { name: '臉飾迴避詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：迴避 +5, 敏捷 +3。失敗50%【摧毀裝備】', stats: { eva: 5, dex: 3 } },
    { name: '臉飾力量詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：力量 +5, 物理防 +3。失敗50%【摧毀裝備】', stats: { str: 5, def: 3 } }
  ],
  eye: [
    { name: '眼飾命中卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '命中率 +2, 敏捷 +1', stats: { acc: 2, dex: 1 } },
    { name: '眼飾智力卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '智力 +2, 魔法防禦 +1', stats: { int: 2, def: 1 } },
    { name: '眼飾命中詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：命中 +5, 敏捷 +3。失敗50%【摧毀裝備】', stats: { acc: 5, dex: 3 } },
    { name: '眼飾智力詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：智力 +5, 魔法防 +3。失敗50%【摧毀裝備】', stats: { int: 5, def: 3 } }
  ],
  earring: [
    { name: '耳環智力卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '穩過！魔法攻擊力 +1', stats: { matk: 1 } },
    { name: '耳環智力卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '魔法攻擊力 +2, 智力 +1', stats: { matk: 2, int: 1 } },
    { name: '耳環智力卷軸 10%', successRate: 10, boomOnFail: 0, isDark: false, desc: '狂熱！魔攻 +5, 智力 +3', stats: { matk: 5, int: 3 } },
    { name: '耳環智力詛咒卷軸 70% (詛咒)', successRate: 70, boomOnFail: 50, isDark: true, desc: '70%成功：魔攻 +2, 智力 +1。失敗50%【摧毀裝備】', stats: { matk: 2, int: 1 } },
    { name: '耳環智力詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：魔攻 +5, 智力 +3。失敗50%【摧毀裝備】', stats: { matk: 5, int: 3 } }
  ],
  ring: [
    { name: '戒指全屬性卷軸 100%', successRate: 100, boomOnFail: 0, isDark: false, desc: '六維全屬性 +1', stats: { str: 1, dex: 1, int: 1, luk: 1, def: 1 } },
    { name: '戒指全屬性卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '六維全屬性 +2', stats: { str: 2, dex: 2, int: 2, luk: 2, def: 2 } },
    { name: '戒指全屬性詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '極品！六維全屬性 +5。失敗50%【摧毀裝備】', stats: { str: 5, dex: 5, int: 5, luk: 5, def: 5 } }
  ],
  pendant: [
    { name: '墜飾力量卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '力量 +2, 防禦 +1', stats: { str: 2, def: 1 } },
    { name: '墜飾幸運卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '幸運 +2, 防禦 +1', stats: { luk: 2, def: 1 } },
    { name: '墜飾力量詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：力量 +5, 物理防 +3。失敗50%【摧毀裝備】', stats: { str: 5, def: 3 } },
    { name: '墜飾幸運詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '30%成功：幸運 +5, 物理防 +3。失敗50%【摧毀裝備】', stats: { luk: 5, def: 3 } }
  ],
  belt: [
    { name: '腰帶力量卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '穩當力量！力量 +2, 防禦 +1', stats: { str: 2, def: 1 } },
    { name: '腰帶力量詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '腰帶力量 +5, 物理防 +3。失敗50%【摧毀裝備】', stats: { str: 5, def: 3 } }
  ],
  shoulder: [
    { name: '肩章屬性卷軸 60%', successRate: 60, boomOnFail: 0, isDark: false, desc: '物理攻擊力 +1, 力量 +1', stats: { watk: 1, str: 1 } },
    { name: '肩章屬性詛咒卷軸 30% (詛咒)', successRate: 30, boomOnFail: 50, isDark: true, desc: '頂尖！物理攻擊力 +3, 力量 +2, 敏捷 +2。失敗50%【摧毀裝備】', stats: { watk: 3, str: 2, dex: 2 } }
  ]
};

// Current dynamic simulated item state
interface SimulatedItem {
  name: string;
  type: string;
  slotsTotal: number;
  slotsUsed: number;
  slotsRemaining: number;
  isCustom: boolean;
  status: 'active' | 'destroyed';
  upgradesSuccessful: number;
  stats: {
    watk: number;
    matk: number;
    def: number;
    str: number;
    dex: number;
    int: number;
    luk: number;
    acc: number;
    eva: number;
  };
  scrollHistory: Array<{
    scrollName: string;
    success: boolean;
    exploded: boolean;
    statsChanges: Partial<Record<keyof SimulatedItem['stats'], number>>;
  }>;
}

export default function EquipScrollSimulator({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEngine = useRef<NostalgiaSoundEngine | null>(null);

  // Active single scrolling simulator weapon/armor
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [activeItem, setActiveItem] = useState<SimulatedItem | null>(null);
  const [selectedScrollIdx, setSelectedScrollIdx] = useState(0);

  // Feature Options
  const [useWhiteScroll, setUseWhiteScroll] = useState(false);
  const [whiteScrollCount, setWhiteScrollCount] = useState(0); // White scroll consumed tracker
  const [scrollingLogs, setScrollingLogs] = useState<string[]>([]);
  const [isCursing, setIsCursing] = useState(false); // animation flash visual state
  const [dustParticles, setDustParticles] = useState<Array<{ id: number; delay: number; x: number; y: number }>>([]);

  // BIG DATA MULTIPLE SIMULATOR STATES (大數據量產模擬器)
  const [batchQuantity, setBatchQuantity] = useState(100);
  const [batchPresetIdx, setBatchPresetIdx] = useState(0);
  const [batchTargetScrollIdx, setBatchTargetScrollIdx] = useState(4); // default 30% Glove Atk
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<{
    totalSimulated: number;
    totalDestroyed: number;
    perfectItems: number; // +5, +7 completed without failures or fully survived
    distribution: Record<number, number>; // successful upgrade count -> item count surviving
    distributionByWatk: Record<number, number>; // total physical attack -> item count
    bestItemsList: Array<{
      watk: number;
      successfulUpgrades: number;
      displayStatName: string;
      scrollHistoryDetails: string;
    }>;
  } | null>(null);

  useEffect(() => {
    soundEngine.current = new NostalgiaSoundEngine();
  }, []);

  useEffect(() => {
    if (soundEngine.current) {
      soundEngine.current.enabled = soundEnabled;
    }
  }, [soundEnabled]);

  // Load preset item state
  useEffect(() => {
    resetToPreset(selectedPresetIdx);
  }, [selectedPresetIdx]);

  const resetToPreset = (idx: number) => {
    const preset = PRIMITIVE_ITEMS[idx];
    if (!preset) return;

    setActiveItem({
      name: preset.name,
      type: preset.type,
      slotsTotal: preset.slots,
      slotsUsed: 0,
      slotsRemaining: preset.slots,
      isCustom: false,
      status: 'active',
      upgradesSuccessful: 0,
      stats: { ...preset.baseStats },
      scrollHistory: []
    });
    setWhiteScrollCount(0);
    setScrollingLogs([`🛠️ 成功創建全新傳奇備用基底：【${preset.name}】，升級次數：${preset.slots}。請選擇心儀捲軸開始豪賭！`]);
  };

  const handleCustomBaseline = (field: 'watk' | 'matk' | 'slotsTotal', val: number) => {
    if (!activeItem) return;
    const cleanValue = Math.max(0, val);
    const updatedStats = { ...activeItem.stats };

    if (field === 'watk') updatedStats.watk = cleanValue;
    if (field === 'matk') updatedStats.matk = cleanValue;

    setActiveItem({
      ...activeItem,
      slotsTotal: field === 'slotsTotal' ? Math.min(15, Math.max(1, cleanValue)) : activeItem.slotsTotal,
      slotsRemaining: field === 'slotsTotal' ? Math.min(15, Math.max(1, cleanValue)) : activeItem.slotsRemaining,
      stats: updatedStats
    });
  };

  // Run scroll simulator logic for a single item
  const executeScrollSingle = () => {
    if (!activeItem) return;
    if (activeItem.status === 'destroyed') {
      showToast('⚠️ 這件裝備已經化為灰燼爆炸了！請點選重置或選擇基底重新開始。', 'error');
      return;
    }
    if (activeItem.slotsRemaining <= 0) {
      showToast('⚠️ 這件裝備的升級次數已耗盡！精雕細琢已達完美極限。', 'info');
      return;
    }

    const scrollList = SCROLL_DICTIONARY[activeItem.type];
    const scroll = scrollList[selectedScrollIdx];
    if (!scroll) return;

    // Trigger visual scroll action state
    setIsCursing(true);

    // Dynamic particles burst inside container
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i,
      delay: Math.random() * 0.4,
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 160
    }));
    setDustParticles(newParticles);

    setTimeout(() => {
      setIsCursing(false);
      setDustParticles([]);

      const rand = Math.random() * 100;
      const success = rand <= scroll.successRate;

      // Handle fail and possible explosion logic (Curses!)
      let exploded = false;
      let whiteScrollConsumed = false;

      if (!success) {
        // Cursed Dark checks
        if (scroll.isDark) {
          // Failure and blowup chance is usually 50% on failure inside Artale (Wait, success 30% -> failed 70%. Cursed destruction is 50% of fails = 35% absolute)
          const boomRoll = Math.random() * 100;
          if (boomRoll <= scroll.boomOnFail) {
            exploded = true;
          }
        }
      }

      if (exploded) {
        soundEngine.current?.playBoom();
        setActiveItem(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'destroyed',
            slotsRemaining: 0,
            scrollHistory: [
              ...prev.scrollHistory,
              { scrollName: scroll.name, success: false, exploded: true, statsChanges: {} }
            ]
          };
        });
        setScrollingLogs(prev => [
          `💥 黑影閃過、大火蔓延！【${scroll.name}】失敗，裝備在劇烈轟鳴中【不可逆炸毀爆炸】！裝備化為了一抹厚厚的灰燼...哀悼亡兵。`,
          ...prev
        ]);
        showToast(`💥 裝備不幸炸毀爆炸了！痛失大作！`, 'error');
        return;
      }

      // Success implementation
      if (success) {
        soundEngine.current?.playSuccess();
        const statsDiff: Partial<SimulatedItem['stats']> = {};
        
        // Add stats modifications
        const nextStats = { ...activeItem.stats };
        Object.entries(scroll.stats).forEach(([statName, val]) => {
          const key = statName as keyof SimulatedItem['stats'];
          nextStats[key] = (nextStats[key] || 0) + (val || 0);
          statsDiff[key] = val;
        });

        setActiveItem(prev => {
          if (!prev) return null;
          return {
            ...prev,
            slotsUsed: prev.slotsUsed + 1,
            slotsRemaining: prev.slotsRemaining - 1,
            upgradesSuccessful: prev.upgradesSuccessful + 1,
            stats: nextStats,
            scrollHistory: [
              ...prev.scrollHistory,
              { scrollName: scroll.name, success: true, exploded: false, statsChanges: statsDiff }
            ]
          };
        });

        const successLogs = Object.entries(statsDiff)
          .map(([k, v]) => `${k.toUpperCase()}: +${v}`)
          .join(', ');

        setScrollingLogs(prev => [
          `✨ 隨著璀璨的金光灑落，【${scroll.name}】驚現成功！升級進度：[+${activeItem.upgradesSuccessful + 1}]。數值增幅：(${successLogs})`,
          ...prev
        ]);
        showToast(`✨ 恭喜！手氣驚人，衝卷成功！`, 'success');

      } else {
        // Failed but safe (Not exploded)
        soundEngine.current?.playFailure();
        const useWhite = useWhiteScroll;

        if (useWhite) {
          setWhiteScrollCount(c => c + 1);
          whiteScrollConsumed = true;
        }

        setActiveItem(prev => {
          if (!prev) return null;
          const slotsDeducted = useWhite ? 0 : 1;
          return {
            ...prev,
            slotsUsed: prev.slotsUsed + (useWhite ? 0 : 1),
            slotsRemaining: prev.slotsRemaining - slotsDeducted,
            scrollHistory: [
              ...prev.scrollHistory,
              { scrollName: scroll.name, success: false, exploded: false, statsChanges: {} }
            ]
          };
        });

        setScrollingLogs(prev => [
          useWhite 
            ? `🛡️ 【${scroll.name}】失敗！感恩「白卷軸」之加護，完美隔絕失敗！升級次數未扣減，消釋：白卷軸 * 1。`
            : `💨 卷軸化為淡煙消散...【${scroll.name}】不幸失敗。失去 1 次寶貴的改裝次數。`,
          ...prev
        ]);
        showToast(useWhite ? `🛡️ 衝卷失败，白卷軸完美守護次數！` : `💨 衝卷失敗，浪費升級次数！`, 'info');
      }

    }, 600);
  };

  // Run Grand Big Data Batch Simulation (大量批次量產測試)
  const runBatchSimulation = () => {
    setIsBatchRunning(true);
    
    // Defer for asynchronous frame loading effect
    setTimeout(() => {
      const parentPreset = PRIMITIVE_ITEMS[batchPresetIdx];
      const scrollList = SCROLL_DICTIONARY[parentPreset.type];
      const scroll = scrollList[batchTargetScrollIdx];

      if (!parentPreset || !scroll) {
        showToast('配置加載失敗', 'error');
        setIsBatchRunning(false);
        return;
      }

      const loops = Math.min(10000, Math.max(1, batchQuantity));
      const successesTracker: Record<number, number> = {};
      const watkTracker: Record<number, number> = {};
      let totalBoom = 0;
      let totalPerfect = 0; // successfully scrolled all slots
      const sampledBestItems: Array<{ watk: number; successfulUpgrades: number; displayStatName: string; scrollHistoryDetails: string }> = [];

      for (let i = 0; i <= parentPreset.slots; i++) {
        successesTracker[i] = 0;
      }

      for (let i = 0; i < loops; i++) {
        // Run full scrolling simulation for one single item from +0 to completion
        let currentItemWatk = parentPreset.baseStats.watk;
        let currentItemMatk = parentPreset.baseStats.matk;
        let currentItemDef = parentPreset.baseStats.def;
        let currentItemStr = parentPreset.baseStats.str;
        let currentItemDex = parentPreset.baseStats.dex;
        let currentItemInt = parentPreset.baseStats.int;
        let currentItemLuk = parentPreset.baseStats.luk;
        let currentItemAcc = parentPreset.baseStats.acc;
        let currentItemEva = parentPreset.baseStats.eva;

        let activeSlots = parentPreset.slots;
        let successfulUpgrades = 0;
        let isBlownUp = false;

        while (activeSlots > 0 && !isBlownUp) {
          const rand = Math.random() * 100;
          const success = rand <= scroll.successRate;

          if (success) {
            successfulUpgrades++;
            activeSlots--;

            // Gained stats depending on scroll selected
            if (scroll.stats.watk) currentItemWatk += scroll.stats.watk;
            if (scroll.stats.matk) currentItemMatk += scroll.stats.matk;
            if (scroll.stats.def) currentItemDef += scroll.stats.def;
            if (scroll.stats.str) currentItemStr += scroll.stats.str;
            if (scroll.stats.dex) currentItemDex += scroll.stats.dex;
            if (scroll.stats.int) currentItemInt += scroll.stats.int;
            if (scroll.stats.luk) currentItemLuk += scroll.stats.luk;
            if (scroll.stats.acc) currentItemAcc += scroll.stats.acc;
            if (scroll.stats.eva) currentItemEva += scroll.stats.eva;
          } else {
            // check explosion if cursed
            if (scroll.isDark) {
              const rollBoom = Math.random() * 100;
              if (rollBoom <= scroll.boomOnFail) {
                isBlownUp = true;
              }
            }
            if (!isBlownUp) {
              activeSlots--; // standard slot loss
            }
          }
        }

        if (isBlownUp) {
          totalBoom++;
        } else {
          // Success tier tracker
          successesTracker[successfulUpgrades] = (successesTracker[successfulUpgrades] || 0) + 1;
          
          // Stat tracker dynamically linked to whatever attribute this scroll improves
          let displayStatName = '物理攻';
          let baseDisplayStat = parentPreset.baseStats.watk;
          let displayStatKey = currentItemWatk;

          if (scroll.stats.watk) {
            displayStatName = '物理攻';
            baseDisplayStat = parentPreset.baseStats.watk;
            displayStatKey = currentItemWatk;
          } else if (scroll.stats.matk) {
            displayStatName = '魔法攻';
            baseDisplayStat = parentPreset.baseStats.matk;
            displayStatKey = currentItemMatk;
          } else if (scroll.stats.str) {
            displayStatName = '力量';
            baseDisplayStat = parentPreset.baseStats.str;
            displayStatKey = currentItemStr;
          } else if (scroll.stats.dex) {
            displayStatName = '敏捷';
            baseDisplayStat = parentPreset.baseStats.dex;
            displayStatKey = currentItemDex;
          } else if (scroll.stats.int) {
            displayStatName = '智力';
            baseDisplayStat = parentPreset.baseStats.int;
            displayStatKey = currentItemInt;
          } else if (scroll.stats.luk) {
            displayStatName = '幸運';
            baseDisplayStat = parentPreset.baseStats.luk;
            displayStatKey = currentItemLuk;
          } else if (scroll.stats.def) {
            displayStatName = '防禦';
            baseDisplayStat = parentPreset.baseStats.def;
            displayStatKey = currentItemDef;
          } else if (scroll.stats.eva) {
            displayStatName = '迴避';
            baseDisplayStat = parentPreset.baseStats.eva;
            displayStatKey = currentItemEva;
          } else if (scroll.stats.acc) {
            displayStatName = '命中';
            baseDisplayStat = parentPreset.baseStats.acc;
            displayStatKey = currentItemAcc;
          }

          watkTracker[displayStatKey] = (watkTracker[displayStatKey] || 0) + 1;

          if (successfulUpgrades === parentPreset.slots) {
            totalPerfect++;
          }

          // Sample excellent items for output showcase
          if (successfulUpgrades >= parentPreset.slots - 2 || sampledBestItems.length < 5) {
            const hasBetter = sampledBestItems.some(i => i.watk === displayStatKey && i.successfulUpgrades === successfulUpgrades);
            if (!hasBetter || sampledBestItems.length < 5) {
              sampledBestItems.push({
                watk: displayStatKey,
                successfulUpgrades,
                displayStatName,
                scrollHistoryDetails: `起步：${baseDisplayStat} 點 ⮕ [+${successfulUpgrades}] 升級成功，最終${displayStatName}：${displayStatKey}`
              });
            }
          }
        }
      }

      // Sort sample showcase by Attack high to low
      sampledBestItems.sort((a, b) => b.watk - a.watk);

      setBatchResults({
        totalSimulated: loops,
        totalDestroyed: totalBoom,
        perfectItems: totalPerfect,
        distribution: successesTracker,
        distributionByWatk: watkTracker,
        bestItemsList: sampledBestItems.slice(0, 6)
      });
      setIsBatchRunning(false);
      showToast(`⚡ 大數據分析成功！已在下方為您統計 ${loops} 組數據。`, 'success');
    }, 100);
  };

  const currentScrolls = activeItem ? SCROLL_DICTIONARY[activeItem.type] : [];
  const currentScroll = currentScrolls[selectedScrollIdx] || null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl space-y-6 select-none" id="classic-scroll-simulator-section">
      {/* Title Header with retro flair */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3 select-none">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔨</span>
            <h3 className="text-lg font-black bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent uppercase tracking-wider">
              衝裝模擬器 (Artale 懷舊設定)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            重現 10%/60%/100% 機率，以及 <span className="text-rose-400 font-extrabold">30% / 70% 暗黑詛咒卷 (失敗50%機率炸裂)</span>
          </p>
        </div>

        {/* Audio control switcher */}
        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all ${soundEnabled ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'}`}
            title={soundEnabled ? "音效：開啟" : "音效：靜音"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Simulator Mode Tab Switcher */}
      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-850">
        <button
          type="button"
          onClick={() => {
            setBatchResults(null); 
            // set mode, since we keep single view simple, we just toggle local sub-tab state!
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${!batchResults ? 'bg-indigo-600 text-white shadow' : 'text-slate-450 hover:text-slate-200'}`}
        >
          <span>🎯 單裝升級拼機緣</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!batchResults) {
              runBatchSimulation();
            }
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${batchResults ? 'bg-indigo-600 text-white shadow' : 'text-slate-450 hover:text-slate-200'}`}
        >
          <span>📊 批次大數據量產爆衝</span>
        </button>
      </div>

      {!batchResults ? (
        /* ==================== 1. SINGLE SCROLL SIMULATOR VIEW ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Controls Left Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3.5 select-none">
              <label className="block text-xs font-black text-slate-400">选择裝備基底 Preset</label>
              <div className="relative">
                <select
                  value={selectedPresetIdx}
                  onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 leading-none py-2.5 px-3 rounded-xl text-xs text-amber-300 font-extrabold focus:outline-none cursor-pointer transition"
                >
                  {PRIMITIVE_ITEMS.map((item, idx) => (
                    <option key={idx} value={idx} className="bg-slate-950 font-bold">
                      {item.icon} {item.name} (可升級{item.slots}次)
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Description */}
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                {PRIMITIVE_ITEMS[selectedPresetIdx]?.desc}
              </p>

              {/* Baseline stats modifiers */}
              {activeItem && !activeItem.isCustom && (
                <div className="pt-2.5 border-t border-slate-900 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-[9px] text-slate-500 font-bold uppercase">初始攻/魔</span>
                    <input
                      type="number"
                      value={activeItem.type === 'shield' || activeItem.type === 'cape' ? activeItem.stats.matk || activeItem.stats.watk : activeItem.stats.watk}
                      onChange={(e) => handleCustomBaseline(activeItem.type === 'shield' ? 'matk' : 'watk', Number(e.target.value))}
                      className="w-full bg-slate-900 text-center font-bold text-xs text-slate-200 border border-slate-800 rounded-lg py-1 mt-1 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 font-bold uppercase">總升級次數</span>
                    <input
                      type="number"
                      value={activeItem.slotsTotal}
                      min={1}
                      max={12}
                      onChange={(e) => handleCustomBaseline('slotsTotal', Number(e.target.value))}
                      className="w-full bg-slate-900 text-center font-bold text-xs text-slate-200 border border-slate-800 rounded-lg py-1 mt-1 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => resetToPreset(selectedPresetIdx)}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 font-black py-1.5 rounded-lg active:scale-95 transition"
                      title="完全初始化"
                    >
                      ↩️ 重置基底
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Scroll Select option list */}
            {activeItem && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3 select-none">
                <label className="block text-xs font-black text-slate-400">選擇想使用的卷軸類別</label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {currentScrolls.map((scroll, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setSelectedScrollIdx(sIdx)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2 ${selectedScrollIdx === sIdx ? 'bg-indigo-600/10 border-indigo-500/60 ring-1 ring-indigo-550' : 'bg-slate-900 border-slate-850 hover:bg-slate-850 hover:border-slate-800'}`}
                    >
                      <span className={`text-sm shrink-0 mt-0.5 ${scroll.isDark ? 'text-amber-500' : 'text-slate-300'}`}>
                        {scroll.isDark ? '🔥' : '📜'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11.5px] font-black tracking-tight text-slate-100 truncate">{scroll.name}</span>
                          <span className={`text-[10px] shrink-0 font-extrabold px-1.5 rounded font-mono ${scroll.isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                            {scroll.successRate}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{scroll.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* White scroll mechanic option */}
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="checkbox-white-scroll"
                      checked={useWhiteScroll}
                      onChange={(e) => setUseWhiteScroll(e.target.checked)}
                      className="cursor-pointer rounded border-slate-800 bg-slate-900 text-indigo-600"
                    />
                    <label htmlFor="checkbox-white-scroll" className="text-xs font-semibold text-slate-350 cursor-pointer select-none flex items-center space-x-1">
                      <span>👼 使用白卷軸 (White Scroll)</span>
                    </label>
                  </div>
                  <span className="text-[9.5px] font-bold bg-amber-550/10 text-amber-450 border border-amber-550/20 px-1.5 py-0.5 rounded">
                    失敗不扣次數
                  </span>
                </div>
                {useWhiteScroll && (
                  <p className="text-[9.5px] text-slate-500 mt-1 line-clamp-2">
                    💡 使用白卷軸後，若捲軸不幸失敗，將**完美守護防具/武器不被扣減可升級次數**！但請注意，白卷軸依然防護不了【暗黑詛咒卷失败炸毀裝】的情形！
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Interactive Screen Center Column */}
          <div className="lg:col-span-5 space-y-4">
            {activeItem ? (
              <div className="relative overflow-hidden bg-slate-950 rounded-2xl border border-slate-850 p-6 flex flex-col items-center justify-between min-h-[380px] shadow-inner select-none">
                
                {/* Curse Sparkles effect layer */}
                <AnimatePresence>
                  {isCursing && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-0 z-10 flex items-center justify-center mix-blend-color-dodge transition-all duration-300 ${currentScroll?.isDark ? 'bg-amber-500/20' : 'bg-indigo-500/20'}`}
                    >
                      {/* Exploded dust effect mapping */}
                      <span className="text-5xl animate-ping">✨</span>
                    </motion.div>
                  )}
                  {activeItem.status === 'destroyed' && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center p-4 text-center space-y-4"
                    >
                      <div className="p-4 bg-red-950/20 border border-rose-900/60 rounded-full animate-bounce">
                        <Flame className="w-12 h-12 text-rose-500" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-rose-505">💥 裝備已化為灰燼 💥</h4>
                        <p className="text-[11.5px] text-slate-400 font-mono">很遺憾！詛咒卷觸發了失敗摧毀機率，該裝備已被徹底熔煉氣化。</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => resetToPreset(selectedPresetIdx)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl border border-indigo-500 shadow-md transition transform hover:-translate-y-0.5 active:scale-95"
                      >
                        🔄 重置並召回一件乾淨基底
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Status Bar */}
                <div className="w-full flex justify-between items-center text-[10px] font-bold text-slate-500 font-mono">
                  <span>ITEM TYPE: {activeItem.type.toUpperCase()}</span>
                  <span className={activeItem.upgradesSuccessful > 0 ? "text-amber-400 font-black animate-pulse" : ""}>
                    💎 UPGRADED [+{activeItem.upgradesSuccessful}]
                  </span>
                </div>

                {/* Big Visual Equip Icon */}
                <div className="my-5 relative flex flex-col items-center">
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-4xl shadow-md relative">
                    <span>{PRIMITIVE_ITEMS[selectedPresetIdx]?.icon || '🧤'}</span>
                    
                    {/* Successful Upgrades Badge */}
                    {activeItem.upgradesSuccessful > 0 && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10.5px] font-black h-6 w-6 rounded-full flex items-center justify-center shadow font-mono border border-amber-300">
                        +{activeItem.upgradesSuccessful}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-200 mt-3 flex items-center space-x-1.5">
                    {activeItem.upgradesSuccessful > 0 && <span className="text-amber-400">★</span>}
                    <span>{activeItem.name.split(' (')[0]}</span>
                    {activeItem.upgradesSuccessful > 0 && <span className="text-amber-400">+{activeItem.upgradesSuccessful}</span>}
                  </h4>
                </div>

                {/* Upgrade slot list visual circles */}
                <div className="w-full space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400 px-1">
                    <span>升級欄位剩餘度：{activeItem.slotsRemaining} / {activeItem.slotsTotal}</span>
                    {whiteScrollCount > 0 && (
                      <span className="text-amber-450 border border-amber-550/20 bg-amber-550/5 text-[9px] px-1.5 rounded">
                        🛡️ 累計耗消白卷: {whiteScrollCount}
                      </span>
                    )}
                  </div>

                  {/* Slot visual progress map */}
                  <div className="flex flex-wrap gap-2.5 justify-center py-1">
                    {Array.from({ length: activeItem.slotsTotal }).map((_, i) => {
                      // Determine status of this slot
                      let slotStatus: 'empty' | 'success' | 'failed' = 'empty';
                      if (i < activeItem.slotsUsed) {
                        // find historical scrolls that did not blew up
                        const validScrolls = activeItem.scrollHistory.filter(h => !h.exploded);
                        const correspondingScroll = validScrolls[i];
                        if (correspondingScroll) {
                          slotStatus = correspondingScroll.success ? 'success' : 'failed';
                        }
                      }

                      return (
                        <div 
                          key={i} 
                          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 text-xs font-black shadow-md ${
                            slotStatus === 'success' 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 ring-1 ring-amber-500/20' 
                              : slotStatus === 'failed'
                              ? 'bg-rose-950/20 border-rose-900/60 text-rose-455'
                              : 'bg-slate-950 border-slate-800 text-slate-600'
                          }`}
                        >
                          {slotStatus === 'success' && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
                          {slotStatus === 'failed' && <X className="w-4 h-4 text-rose-500 stroke-[3]" />}
                          {slotStatus === 'empty' && <span className="text-[10px] text-slate-700">{i + 1}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live values stats card */}
                <div className="w-full grid grid-cols-4 gap-2 text-center mt-3 font-mono">
                  {Object.entries(activeItem.stats)
                    .filter(([_, value]) => (value as number) > 0)
                    .map(([statName, val]) => (
                      <div key={statName} className="p-2 border border-slate-850 bg-slate-900/50 rounded-xl">
                        <span className="block text-[9.5px] font-bold text-slate-500 uppercase">{statName === 'watk' ? '物理攻' : statName === 'matk' ? '魔術攻' : statName.toUpperCase()}</span>
                        <span className="text-xs font-black text-slate-200">{val}</span>
                      </div>
                    ))}
                  {Object.values(activeItem.stats).every(v => v === 0) && (
                    <div className="col-span-4 p-2 text-xs italic text-slate-600 text-center">沒有溢出任何屬性</div>
                  )}
                </div>

                {/* Big Scrolling Trigger Buttons */}
                <div className="w-full mt-5 select-none z-10">
                  <button
                    type="button"
                    onClick={executeScrollSingle}
                    disabled={isCursing || activeItem.slotsRemaining === 0}
                    className={`w-full py-3.5 rounded-xl text-sm font-black transition duration-300 shadow-lg active:scale-[0.98] transform flex items-center justify-center space-x-2 ${
                      activeItem.slotsRemaining === 0 
                        ? 'bg-slate-800 border border-slate-750 text-slate-500 cursor-not-allowed'
                        : currentScroll?.isDark
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 border border-amber-450/40 text-slate-950 shadow-amber-500/10'
                        : 'bg-indigo-600 hover:bg-indigo-700 hover:border-indigo-550 text-white shadow-indigo-500/10'
                    }`}
                  >
                    {isCursing ? (
                      <div className="flex items-center space-x-1.5 font-bold">
                        <span className="animate-spin inline-block w-4.5 h-4.5 border-2 border-slate-900/40 border-t-slate-900 rounded-full"></span>
                        <span>命運洗牌中...</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>
                          {activeItem.slotsRemaining === 0 
                            ? '冷卻耗盡 (升級上限已滿)' 
                            : currentScroll 
                            ? `使用 【${currentScroll.name.split(' ')[0]}】 (${currentScroll.successRate}%) 砸下去！`
                            : '請選擇一張卷軸'
                          }
                        </span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 min-h-[380px] flex items-center justify-center text-slate-500 italic text-sm">
                加載中...
              </div>
            )}
          </div>

          {/* Scrolling Logging History Column */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 h-full flex flex-col justify-between min-h-[380px]">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2 select-none">
                <span className="text-xs font-black text-slate-400">📜 裝物衝捲日誌 (Log)</span>
                <button
                  type="button"
                  onClick={() => setScrollingLogs([])}
                  className="text-[10px] text-slate-500 hover:text-rose-400 font-extrabold transition"
                >
                  清除日誌
                </button>
              </div>

              {/* Autoscrolling long logs */}
              <div className="my-3 flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1 font-mono text-[10.5px] leading-relaxed select-text">
                {scrollingLogs.length === 0 ? (
                  <p className="text-slate-600 italic">暫無任何衝裝歷史，在中間點擊衝卷，好玩日志會在此打印！</p>
                ) : (
                  scrollingLogs.map((log, idx) => {
                    let logClass = "text-slate-400 border-b border-slate-950/20 pb-1";
                    if (log.includes('成功')) logClass = "text-amber-400 font-bold border-b border-slate-950/30 pb-1";
                    else if (log.includes('詛咒') || log.includes('炸毀')) logClass = "text-rose-450 font-black border-b border-rose-950/20 pb-1";
                    else if (log.includes('白卷軸')) logClass = "text-indigo-405 font-bold border-b border-slate-950/20 pb-1";

                    return (
                      <div key={idx} className={logClass}>
                        {log}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-900 select-none text-center">
                <span className="text-[9px] text-slate-550">
                  純機遇模擬 · 每次點擊均採用高精度隨機密碼學函式運算
                </span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ==================== 2. BIG DATA MULTI BATCH SIMULATOR VIEW ==================== */
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 items-end select-none">
            
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">測試武器裝備基底</label>
              <select
                value={batchPresetIdx}
                onChange={(e) => {
                  setBatchPresetIdx(Number(e.target.value));
                  setBatchTargetScrollIdx(0); // reset scroll index
                }}
                className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-200 font-extrabold cursor-pointer"
              >
                {PRIMITIVE_ITEMS.map((item, idx) => (
                  <option key={idx} value={idx}>
                    {item.icon} {item.name.split(' (')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">選擇要覆蓋砸下的卷軸</label>
              <select
                value={batchTargetScrollIdx}
                onChange={(e) => setBatchTargetScrollIdx(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-amber-300 font-extrabold cursor-pointer"
              >
                {(SCROLL_DICTIONARY[PRIMITIVE_ITEMS[batchPresetIdx]?.type] || []).map((scroll, idx) => (
                  <option key={idx} value={idx}>
                    {scroll.name} ({scroll.successRate}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 mb-2">量產測試防具/武器總數</label>
              <select
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-indigo-400 font-black cursor-pointer font-mono"
              >
                <option value={100}>💸 100 件 (急速模擬)</option>
                <option value={500}>💸 500 件 (規模測試)</option>
                <option value={1000}>🏰 1,000 件 (高級探究)</option>
                <option value={5000}>⚔️ 5,000 件 (國庫暴走)</option>
                <option value={10000}>👑 10,000 件 (神明級海量大統計)</option>
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={runBatchSimulation}
                disabled={isBatchRunning}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl text-xs transition active:scale-95 disabled:bg-slate-800"
              >
                {isBatchRunning ? '正在全功率運算中...' : '🪄 一鍵極致推演大數據!'}
              </button>
            </div>

          </div>

          {/* Results Summary and Visual Graphics */}
          {batchResults && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Highlight metrics panel */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4.5 select-none">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider border-b border-slate-900 pb-2">
                    🎯 推算成果摘要 (Summary)
                  </h4>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-center">
                      <span className="block text-[9.5px] text-slate-500 font-bold uppercase">投放乾淨總量</span>
                      <span className="text-xl font-black text-slate-100 font-mono">{batchResults.totalSimulated}</span>
                    </div>

                    <div className="p-3 bg-rose-950/10 border border-rose-900/20 rounded-xl text-center">
                      <span className="block text-[9.5px] text-rose-400 font-bold uppercase">詛咒炸毀損害</span>
                      <span className="text-xl font-black text-rose-500 font-mono">
                        {batchResults.totalDestroyed} 
                        <span className="text-[10px] text-slate-500 font-normal ml-0.5">
                          ({((batchResults.totalDestroyed / batchResults.totalSimulated) * 100).toFixed(1)}%)
                        </span>
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-950/10 border border-emerald-900/20 rounded-xl text-center">
                      <span className="block text-[9.5px] text-emerald-400 font-bold uppercase">完整存活總量</span>
                      <span className="text-xl font-black text-emerald-450 font-mono">
                        {batchResults.totalSimulated - batchResults.totalDestroyed}
                      </span>
                    </div>

                    <div className="p-3 bg-amber-955/10 border border-amber-900/20 rounded-xl text-center">
                      <span className="block text-[9.5px] text-amber-400 uppercase font-black">極緻全過金裝 (+{PRIMITIVE_ITEMS[batchPresetIdx].slots})</span>
                      <span className="text-xl font-black text-amber-400 font-mono">
                        {batchResults.perfectItems}
                        <span className="text-[10px] text-slate-550 font-normal ml-0.5">
                          ({((batchResults.perfectItems / batchResults.totalSimulated) * 100).toFixed(4)}%)
                        </span>
                      </span>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-500 leading-relaxed text-center italic border-t border-slate-900 pt-3">
                    💡 **殘酷統計事實**：
                    {batchResults.totalDestroyed > 0 ? (
                      <span>
                        衝詛咒卷高達 <strong className="text-rose-450">{((batchResults.totalDestroyed / batchResults.totalSimulated) * 100).toFixed(1)}%</strong> 的裝備在升級中途【直接損毀蒸發】。這就是為什麼在 Artale 中，多攻防具或頂底極品裝的價格會呈現爆發式、幾何倍數瘋漲的原因！
                      </span>
                    ) : (
                      <span>普通安全卷軸不會損壞裝備，但能完美衝到滿次數的機率依然極低。手滑一次，前功盡棄！</span>
                    )}
                  </p>
                </div>

                {/* Custom best item showcase lists */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-855 select-none space-y-3">
                  <h4 className="text-xs font-black text-amber-450 uppercase tracking-wider flex items-center justify-between">
                    <span>👑 推演批次最高神作一覽</span>
                    <span className="text-[9.5px] bg-amber-500/10 text-amber-400 px-1.5 rounded font-mono">Best 6</span>
                  </h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {batchResults.bestItemsList.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-850 flex items-center justify-between text-xs font-sans">
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-105 block">
                            {PRIMITIVE_ITEMS[batchPresetIdx]?.name.split(' (')[0]} <span className="text-amber-400">+{item.successfulUpgrades}</span>
                          </span>
                          <span className="text-[9.5px] text-slate-500 font-mono">{item.scrollHistoryDetails}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-amber-450 font-mono">
                            {item.displayStatName || '物理攻'} {item.watk}
                          </span>
                        </div>
                      </div>
                    ))}
                    {batchResults.bestItemsList.length === 0 && (
                      <p className="text-slate-600 text-center italic text-xs py-4">全軍覆沒...沒有任何一件装备生還！太難了！</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Graphical distribution charts Column */}
              <div className="lg:col-span-8 bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-6">
                
                {/* 1. Bar chart showing successful upgrade slots DISTRIBUTION (升級次數存活率分布) */}
                <div className="space-y-3 select-none">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-350 uppercase">
                      📊 成功升級次数 (Upgrades Survived) 比例分布圖
                    </h4>
                    <span className="text-[10px] text-slate-505 font-mono">
                      成功次數越多、製造難度呈指數級上揚
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    {Array.from({ length: PRIMITIVE_ITEMS[batchPresetIdx].slots + 1 }).map((_, upgradeIndex) => {
                      const countOfThisTier = batchResults.distribution[upgradeIndex] || 0;
                      const percentage = ((countOfThisTier / batchResults.totalSimulated) * 105);
                      const displayPercent = ((countOfThisTier / batchResults.totalSimulated) * 100).toFixed(2);

                      return (
                        <div key={upgradeIndex} className="flex items-center space-x-3 text-xs font-mono">
                          {/* Label */}
                          <span className="w-16 shrink-0 text-slate-400 text-right font-black">
                            +{upgradeIndex} 次成功:
                          </span>

                          {/* Graphical Bar */}
                          <div className="flex-1 bg-slate-900 border border-slate-850 h-5.5 rounded-md overflow-hidden relative flex items-center pr-2">
                            {countOfThisTier > 0 && (
                              <div 
                                className={`h-full transition-all duration-500 rounded-r shadow ${
                                  upgradeIndex === PRIMITIVE_ITEMS[batchPresetIdx].slots 
                                    ? 'bg-gradient-to-r from-amber-600 to-yellow-500' // Gold perfect
                                    : upgradeIndex >= PRIMITIVE_ITEMS[batchPresetIdx].slots - 2
                                    ? 'bg-indigo-650' // High tier
                                    : 'bg-slate-750' // Ordinary
                                }`}
                                style={{ width: `${Math.max(1.5, Math.min(100, percentage))}%` }}
                              />
                            )}
                            {/* Inner absolute text */}
                            <span className="absolute left-2.5 text-[9.5px] font-bold text-slate-300">
                              {countOfThisTier} 件產品
                            </span>
                          </div>

                          {/* Percentage label */}
                          <span className="w-12 shrink-0 font-extrabold text-slate-400 text-right">
                            {displayPercent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Total attack frequency breakdown list (最終物理攻擊/魔法攻擊 產量統計) */}
                <div className="space-y-3 pt-4 border-t border-slate-900 select-none">
                  <h4 className="text-xs font-black text-slate-350 uppercase">
                    💎 最終攻/魔值分布機率表 (Gained Stats Yields)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1 font-mono">
                    {Object.entries(batchResults.distributionByWatk)
                      .map(([watkVal, qty]) => ({ watkVal: Number(watkVal), qty: Number(qty) }))
                      .sort((a, b) => b.watkVal - a.watkVal) // high attack first
                      .map((p, idx) => {
                        const percent = ((p.qty / batchResults.totalSimulated) * 100).toFixed(2);
                        const curScroll = SCROLL_DICTIONARY[PRIMITIVE_ITEMS[batchPresetIdx]?.type]?.[batchTargetScrollIdx];
                        let statLabel = '物攻';
                        if (curScroll) {
                          if (curScroll.stats.watk) statLabel = '物攻';
                          else if (curScroll.stats.matk) statLabel = '魔攻';
                          else if (curScroll.stats.str) statLabel = '力量';
                          else if (curScroll.stats.dex) statLabel = '敏捷';
                          else if (curScroll.stats.int) statLabel = '智力';
                          else if (curScroll.stats.luk) statLabel = '幸運';
                          else if (curScroll.stats.def) statLabel = '防禦';
                          else if (curScroll.stats.eva) statLabel = '迴避';
                          else if (curScroll.stats.acc) statLabel = '命中';
                        }
                        return (
                          <div key={idx} className="p-2 border border-slate-900 bg-slate-900/30 rounded-xl text-center flex flex-col justify-between w-full">
                            <span className="text-[10.5px] font-black text-indigo-400">{statLabel} {p.watkVal}</span>
                            <div className="mt-1">
                              <span className="block text-[11px] font-bold text-slate-205">{p.qty} 件</span>
                              <span className="text-[9.5px] text-slate-500">{percent}%</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
