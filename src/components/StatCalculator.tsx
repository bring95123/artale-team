import React, { useState, useEffect } from 'react';

// Define Supported Jobs/Classes conform to Artale and classic setting
interface JobDetails {
  name: string;
  category: 'warrior' | 'magician' | 'archer' | 'thief' | 'pirate';
  defaultWeapon: string;
  allowedWeapons: string[];
}

const JOBS_LIST: Record<string, JobDetails> = {
  hero: { name: '英雄 (Hero)', category: 'warrior', defaultWeapon: '2h_sword', allowedWeapons: ['2h_sword', '1h_sword', '2h_axe', '1h_axe'] },
  paladin: { name: '聖騎士 (Paladin)', category: 'warrior', defaultWeapon: '2h_sword', allowedWeapons: ['2h_sword', '1h_sword', '2h_mace', '1h_mace'] },
  dark_knight: { name: '黑騎士 (Dark Knight)', category: 'warrior', defaultWeapon: '2h_spear', allowedWeapons: ['2h_spear', '2h_polearm'] },
  bishop: { name: '主教 (Bishop)', category: 'magician', defaultWeapon: 'staff', allowedWeapons: ['staff', 'wand'] },
  archmage_fp: { name: '火毒魔導士 (Archmage F/P)', category: 'magician', defaultWeapon: 'staff', allowedWeapons: ['staff', 'wand'] },
  archmage_il: { name: '冰雷魔導士 (Archmage I/L)', category: 'magician', defaultWeapon: 'staff', allowedWeapons: ['staff', 'wand'] },
  bowmaster: { name: '箭神 (Bowmaster)', category: 'archer', defaultWeapon: 'bow', allowedWeapons: ['bow'] },
  crossbowman: { name: '神射手 (Crossbowman)', category: 'archer', defaultWeapon: 'crossbow', allowedWeapons: ['crossbow'] },
  night_lord: { name: '夜使者 (Night Lord)', category: 'thief', defaultWeapon: 'claw', allowedWeapons: ['claw'] },
  shadower: { name: '暗影神偷 (Shadower)', category: 'thief', defaultWeapon: 'dagger', allowedWeapons: ['dagger'] },
  viper: { name: '拳霸 (Viper)', category: 'pirate', defaultWeapon: 'knuckle', allowedWeapons: ['knuckle'] },
  captain: { name: '槍神 (Captain)', category: 'pirate', defaultWeapon: 'gun', allowedWeapons: ['gun'] }
};

interface WeaponTypeInfo {
  name: string;
  maxMultiplier: number;
  minMultiplier: number;
  mainStat: 'str' | 'dex' | 'int' | 'luk';
  subStat: 'str' | 'dex' | 'int' | 'luk' | 'none' | 'both_thief'; // both_thief means str + dex
}

const WEAPONS_INFO: Record<string, WeaponTypeInfo> = {
  '1h_sword': { name: '單手劍 (1H Sword)', maxMultiplier: 4.2, minMultiplier: 4.2, mainStat: 'str', subStat: 'dex' },
  '2h_sword': { name: '雙手劍 (2H Sword)', maxMultiplier: 4.8, minMultiplier: 4.8, mainStat: 'str', subStat: 'dex' },
  '1h_axe': { name: '單手斧 (1H Axe)', maxMultiplier: 4.8, minMultiplier: 3.6, mainStat: 'str', subStat: 'dex' },
  '2h_axe': { name: '雙手斧 (2H Axe)', maxMultiplier: 5.2, minMultiplier: 4.0, mainStat: 'str', subStat: 'dex' },
  '1h_mace': { name: '單手鈍器 (1H Blunt)', maxMultiplier: 4.8, minMultiplier: 3.6, mainStat: 'str', subStat: 'dex' },
  '2h_mace': { name: '雙手鈍器 (2H Blunt)', maxMultiplier: 5.2, minMultiplier: 4.0, mainStat: 'str', subStat: 'dex' },
  '2h_spear': { name: '長槍 (Spear - 刺)', maxMultiplier: 5.1, minMultiplier: 3.6, mainStat: 'str', subStat: 'dex' },
  '2h_polearm': { name: '雙手矛 (Polearm - 揮)', maxMultiplier: 5.2, minMultiplier: 3.5, mainStat: 'str', subStat: 'dex' },
  'staff': { name: '長杖 (Staff)', maxMultiplier: 3.0, minMultiplier: 3.0, mainStat: 'str', subStat: 'dex' }, // Generic physical
  'wand': { name: '短杖 (Wand)', maxMultiplier: 3.0, minMultiplier: 3.0, mainStat: 'str', subStat: 'dex' },
  'bow': { name: '弓 (Bow)', maxMultiplier: 3.4, minMultiplier: 3.4, mainStat: 'dex', subStat: 'str' },
  'crossbow': { name: '弩 (Crossbow)', maxMultiplier: 3.6, minMultiplier: 3.6, mainStat: 'dex', subStat: 'str' },
  'claw': { name: '拳套 (Claw)', maxMultiplier: 3.6, minMultiplier: 3.6, mainStat: 'luk', subStat: 'both_thief' },
  'dagger': { name: '短刀 (Thief Dagger)', maxMultiplier: 4.1641, minMultiplier: 3.569, mainStat: 'luk', subStat: 'both_thief' },
  'knuckle': { name: '指虎 (Knuckle)', maxMultiplier: 4.8, minMultiplier: 4.8, mainStat: 'str', subStat: 'dex' },
  'gun': { name: '槍 (Gun)', maxMultiplier: 3.6, minMultiplier: 3.6, mainStat: 'dex', subStat: 'str' }
};

// Spell dictionaries for spell range prediction
interface SpellInfo {
  name: string;
  baseAttack: number;
  element: string;
}

const SPELLS_LIST: Record<string, SpellInfo[]> = {
  bishop: [
    { name: '創世之光 (Genesis 30)', baseAttack: 670, element: 'holy' },
    { name: '天使之箭 (Angel Ray 30)', baseAttack: 240, element: 'holy' },
    { name: '聖光 (Shining Ray 30)', baseAttack: 105, element: 'holy' },
    { name: '聖箭 (Holy Arrow 30)', baseAttack: 80, element: 'holy' }
  ],
  archmage_fp: [
    { name: '火牢術 (Meteor Shower 30)', baseAttack: 620, element: 'fire' },
    { name: '劇毒麻痺 (Paralyze 30)', baseAttack: 210, element: 'poison' },
    { name: '火焰箭 (Fire Arrow 30)', baseAttack: 120, element: 'fire' }
  ],
  archmage_il: [
    { name: '暴風雪 (Blizzard 30)', baseAttack: 570, element: 'ice' },
    { name: '連鎖電擊 (Chain Lightning 30)', baseAttack: 180, element: 'lightning' },
    { name: '冰咆哮 (Ice Strike 30)', baseAttack: 90, element: 'ice' }
  ]
};

export default function StatCalculator() {
  const [selectedJobId, setSelectedJobId] = useState<string>('shadower');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('dagger');
  const [level, setLevel] = useState<number>(0);
  const [mastery, setMastery] = useState<number>(0);

  // Character raw stats inputs (Base + Equipment values split)
  const [strBase, setStrBase] = useState<number>(0);
  const [strEquip, setStrEquip] = useState<number>(0);
  const [dexBase, setDexBase] = useState<number>(0);
  const [dexEquip, setDexEquip] = useState<number>(0);
  const [intBase, setIntBase] = useState<number>(0);
  const [intEquip, setIntEquip] = useState<number>(0);
  const [lukBase, setLukBase] = useState<number>(0);
  const [lukEquip, setLukEquip] = useState<number>(0);

  // Battle metrics
  const [weaponAttack, setWeaponAttack] = useState<number>(0);
  const [equipMagicAttack, setEquipMagicAttack] = useState<number>(0);
  const [equipAcc, setEquipAcc] = useState<number>(0);
  const [equipAvoid, setEquipAvoid] = useState<number>(0);
  const [equipDef, setEquipDef] = useState<number>(0);
  const [equipMagicDef, setEquipMagicDef] = useState<number>(0);

  // Speed and Jump percentages (cosmetic default with sliders)
  const [speed, setSpeed] = useState<number>(100);
  const [jump, setJump] = useState<number>(100);

  // Pre-calculated total stats helper
  const totalStr = strBase + strEquip;
  const totalDex = dexBase + dexEquip;
  const totalInt = intBase + intEquip;
  const totalLuk = lukBase + lukEquip;

  // Selected Magician spells
  const [activeSpellIdx, setActiveSpellIdx] = useState<number>(0);

  // Set default weapon dynamically when jobId shifts, but do NOT overwriting typed stats
  useEffect(() => {
    const jobInfo = JOBS_LIST[selectedJobId];
    if (jobInfo) {
      setSelectedWeaponId(jobInfo.defaultWeapon);
    }
  }, [selectedJobId]);

  // One-click reset all data to 0
  const handleClearAllData = () => {
    setLevel(0);
    setMastery(0);
    setStrBase(0);
    setStrEquip(0);
    setDexBase(0);
    setDexEquip(0);
    setIntBase(0);
    setIntEquip(0);
    setLukBase(0);
    setLukEquip(0);
    setWeaponAttack(0);
    setEquipMagicAttack(0);
    setEquipAcc(0);
    setEquipAvoid(0);
    setEquipDef(0);
    setEquipMagicDef(0);
    setSpeed(100);
    setJump(100);
  };

  // One-click load precise template stats (e.g. user specified level 168 Shadower)
  const handleLoadJobPreset = (jobId: string) => {
    const jobInfo = JOBS_LIST[jobId];
    if (!jobInfo) return;

    if (jobId === 'shadower') {
      setLevel(168);
      setMastery(60);
      setStrBase(4);
      setStrEquip(26);
      setDexBase(55);
      setDexEquip(88);
      setIntBase(4);
      setIntEquip(26);
      setLukBase(797);
      setLukEquip(124);
      setWeaponAttack(124); // Yields precisely 2415 ~ 4970
      setEquipMagicAttack(0);
      setEquipAcc(15);
      setEquipAvoid(8);
      setEquipDef(140);
      setEquipMagicDef(80);
      setSpeed(140);
      setJump(122);
    } else {
      // Fallback pre-fills for convenience across other categories
      setLevel(120);
      setMastery(60);
      if (jobInfo.category === 'warrior') {
        setStrBase(585);
        setStrEquip(85);
        setDexBase(80);
        setDexEquip(45);
        setIntBase(4);
        setIntEquip(10);
        setLukBase(4);
        setLukEquip(10);
        setWeaponAttack(115);
        setEquipMagicAttack(0);
        setSpeed(100);
        setJump(100);
      } else if (jobInfo.category === 'magician') {
        setStrBase(4);
        setStrEquip(10);
        setDexBase(4);
        setDexEquip(10);
        setIntBase(585);
        setIntEquip(130);
        setLukBase(40);
        setLukEquip(35);
        setWeaponAttack(50);
        setEquipMagicAttack(135);
        setSpeed(100);
        setJump(100);
      } else if (jobInfo.category === 'thief') {
        setStrBase(4);
        setStrEquip(15);
        setDexBase(80);
        setDexEquip(45);
        setIntBase(4);
        setIntEquip(10);
        setLukBase(545);
        setLukEquip(110);
        setWeaponAttack(65);
        setEquipMagicAttack(0);
        setSpeed(140);
        setJump(123);
      } else if (jobInfo.category === 'archer') {
        setStrBase(80);
        setStrEquip(45);
        setDexBase(585);
        setDexEquip(110);
        setIntBase(4);
        setIntEquip(5);
        setLukBase(4);
        setLukEquip(5);
        setWeaponAttack(105);
        setEquipMagicAttack(0);
        setSpeed(100);
        setJump(100);
      } else if (jobInfo.category === 'pirate') {
        if (jobId === 'viper') {
          setStrBase(585);
          setStrEquip(75);
          setDexBase(100);
          setDexEquip(45);
        } else {
          setStrBase(100);
          setStrEquip(45);
          setDexBase(585);
          setDexEquip(75);
        }
        setIntBase(4);
        setIntEquip(5);
        setLukBase(4);
        setLukEquip(5);
        setWeaponAttack(85);
        setEquipMagicAttack(0);
        setSpeed(100);
        setJump(100);
      }
    }
  };

  // Formulas variables calculations
  const weapon = WEAPONS_INFO[selectedWeaponId] || WEAPONS_INFO['claw'];

  // Main stat value resolution
  const mainStatVal = 
    weapon.mainStat === 'str' ? totalStr :
    weapon.mainStat === 'dex' ? totalDex :
    weapon.mainStat === 'int' ? totalInt :
    totalLuk;

  // Sub stat value resolution
  const subStatVal = 
    weapon.subStat === 'str' ? totalStr :
    weapon.subStat === 'dex' ? totalDex :
    weapon.subStat === 'int' ? totalInt :
    weapon.subStat === 'luk' ? totalLuk :
    weapon.subStat === 'both_thief' ? (totalStr + totalDex) :
    0;

  // Max and Min Physical Range Formula Engine
  let maxPhysical = 0;
  let minPhysical = 0;

  // Compute physical ranges generically using coefficients from user guidelines
  maxPhysical = (mainStatVal * weapon.maxMultiplier + subStatVal) * weaponAttack / 100;
  minPhysical = (mainStatVal * weapon.minMultiplier * 0.9 * (mastery / 100) + subStatVal) * weaponAttack / 100;

  // Ensure logical ranges
  maxPhysical = Math.max(0, Math.floor(maxPhysical));
  minPhysical = Math.max(0, Math.floor(minPhysical));
  if (minPhysical > maxPhysical) minPhysical = maxPhysical;

  // Magic Attack (魔攻 = 總智力 + 裝備魔攻)
  const magicAP = totalInt + equipMagicAttack;

  // Magic Spell Damage Ranges
  let spellMin = 0;
  let spellMax = 0;
  const currentJobSpells = SPELLS_LIST[selectedJobId] || [];
  const activeSpell = currentJobSpells[activeSpellIdx] || null;

  if (activeSpell) {
    const skillBase = activeSpell.baseAttack;
    // Classic pre-BB formula
    // Max Magic Damage = ((MagicAP^2 / 1000 + MagicAP) / 30 + INT / 200) * SkillBase
    spellMax = ((magicAP * magicAP / 1000 + magicAP) / 30 + totalInt / 200) * skillBase;
    // Min Magic Damage = ((MagicAP^2 / 1000 + MagicAP) * Mastery * 0.9 / 30 + INT / 200) * SkillBase
    spellMin = ((magicAP * magicAP / 1000 + magicAP) * (mastery / 100) * 0.9 / 30 + totalInt / 200) * skillBase;

    spellMax = Math.max(0, Math.floor(spellMax));
    spellMin = Math.max(0, Math.floor(spellMin));
    if (spellMin > spellMax) spellMin = spellMax;
  }

  // Combat accuracy (物理命中率)
  // Thief/Archer: DEX * 0.6 + LUK * 0.3 + Equip ACC + Skill bonus
  // Warrior/Viper/Mage: DEX * 0.8 + LUK * 0.5 + Equip ACC + Skill bonus
  let calculatedAcc = 0;
  let extraSkillAcc = 0;
  const currentJobCategory = JOBS_LIST[selectedJobId]?.category;
  if (currentJobCategory === 'thief' || currentJobCategory === 'archer' || selectedJobId === 'captain') {
    extraSkillAcc = 20; // 技能精通 +20 命中
    calculatedAcc = Math.floor(totalDex * 0.6 + totalLuk * 0.3 + equipAcc + extraSkillAcc);
  } else {
    if (currentJobCategory === 'warrior' || selectedJobId === 'viper') {
      extraSkillAcc = 20; // 武器精通 +20 命中
    }
    calculatedAcc = Math.floor(totalDex * 0.8 + totalLuk * 0.5 + equipAcc + extraSkillAcc);
  }

  // Combat avoidability (物理迴避率)
  // Thief: LUK * 0.5 + DEX * 0.25 + Equip Avoid
  // Others: LUK * 0.25 + DEX * 0.125 + Equip Avoid
  let calculatedAvoid = 0;
  if (currentJobCategory === 'thief') {
    calculatedAvoid = Math.floor(totalLuk * 0.5 + totalDex * 0.25 + equipAvoid);
  } else {
    calculatedAvoid = Math.floor(totalLuk * 0.25 + totalDex * 0.125 + equipAvoid);
  }

  // Physical defense (物理防禦力)
  const calculatedDef = Math.floor(totalStr * 0.25 + totalDex * 0.125 + totalLuk * 0.125 + equipDef);

  // Magic defense (魔法防禦力)
  const calculatedMagicDef = Math.floor(totalInt * 0.5 + totalStr * 0.25 + totalDex * 0.25 + equipMagicDef);

  // What-if Marginal Benefits Analytics
  const mainStatKey = weapon.mainStat;
  const mainStatName = mainStatKey === 'str' ? '力量 (STR)' : mainStatKey === 'dex' ? '敏捷 (DEX)' : mainStatKey === 'luk' ? '幸運 (LUK)' : '智力 (INT)';

  // Re-calculate ranges with +1 increments to get absolute marginal changes
  const checkMarginalIncrease = (stat: 'str' | 'dex' | 'int' | 'luk' | 'wa' | 'ma') => {
    const testStr = totalStr + (stat === 'str' ? 1 : 0);
    const testDex = totalDex + (stat === 'dex' ? 1 : 0);
    const testLuk = totalLuk + (stat === 'luk' ? 1 : 0);
    const testWA = weaponAttack + (stat === 'wa' ? 1 : 0);

    const testMainVal = 
      weapon.mainStat === 'str' ? testStr :
      weapon.mainStat === 'dex' ? testDex :
      weapon.mainStat === 'int' ? totalInt :
      testLuk;

    const testSubVal = 
      weapon.subStat === 'str' ? testStr :
      weapon.subStat === 'dex' ? testDex :
      weapon.subStat === 'int' ? totalInt :
      weapon.subStat === 'luk' ? testLuk :
      weapon.subStat === 'both_thief' ? (testStr + testDex) :
      0;

    const testMax = (testMainVal * weapon.maxMultiplier + testSubVal) * testWA / 100;
    return Math.max(0, testMax - maxPhysical);
  };

  const strMarginal = checkMarginalIncrease('str');
  const dexMarginal = checkMarginalIncrease('dex');
  const lukMarginal = checkMarginalIncrease('luk');
  const waMarginal = checkMarginalIncrease('wa');

  // Value: 1 Weapon Attack is worth how many points of Main Stat?
  // 1 WA gives waMarginal attack. 1 MainStat gives mainStatMarginal attack.
  // Worthiness = waMarginal / mainStatMarginal
  let mainStatMarginal = 0;
  if (mainStatKey === 'str') mainStatMarginal = strMarginal;
  if (mainStatKey === 'dex') mainStatMarginal = dexMarginal;
  if (mainStatKey === 'luk') mainStatMarginal = lukMarginal;

  const waToMainStatRatio = mainStatMarginal > 0 ? (waMarginal / mainStatMarginal).toFixed(2) : '無窮小';

  return (
    <div className="w-full bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-slate-100">
      {/* Visual background details */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Title block */}
      <div className="border-b border-slate-850 pb-5 mb-6 select-none">
        <div className="flex items-center space-x-2.5">
          <span className="text-3xl">📊</span>
          <h3 className="text-lg font-black bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-wider">
            自身能力值屬性換算器 (Artale 面板設定)
          </h3>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          極致精準還原經典冒險島面板與魔防命中核心算式。深度解析玩家最愛問的：<span className="text-teal-400 font-extrabold">「 1 物理攻擊力到底等於幾點主屬性？」</span>點開即解！
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Input Sheet */}
        <div className="lg:col-span-7 bg-slate-900/45 border border-slate-850 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-black text-slate-200 tracking-wider flex items-center space-x-1">
              <span>🔧</span> <span>角色當前狀態與戰力配置</span>
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-bold">手動填寫</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Class selection */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 mb-1 select-none">選取職業 (Job)</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-amber-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                {Object.entries(JOBS_LIST).map(([id, info]) => (
                  <option key={id} value={id}>{info.name}</option>
                ))}
              </select>
            </div>

            {/* Weapon type selection */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 mb-1 select-none">裝備武器種類 (Weapon)</label>
              <select
                value={selectedWeaponId}
                onChange={(e) => setSelectedWeaponId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-teal-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                {JOBS_LIST[selectedJobId]?.allowedWeapons.map((wpId) => (
                  <option key={wpId} value={wpId}>{WEAPONS_INFO[wpId]?.name || wpId}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-wrap gap-2 border-t border-b border-slate-800/60 py-3 my-1">
            <button
              onClick={handleClearAllData}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/40 rounded-xl text-[11px] font-bold text-rose-300 transition flex items-center space-x-1"
            >
              <span>🧼</span> <span>一鍵數據歸零</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Level input */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 mb-1 select-none">角色等級 (Lv. 1 - 200)</label>
              <input
                type="number"
                min="1"
                max="200"
                value={level}
                onChange={(e) => setLevel(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-950 border border-slate-00 p-2 rounded-xl text-xs font-mono font-black text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Mastery input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10.5px] font-bold text-slate-400 select-none">技能熟練度 Mastery %</label>
                <span className="text-[10px] font-mono text-indigo-400 font-extrabold">{mastery}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={mastery}
                onChange={(e) => setMastery(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-505 accent-indigo-500"
              />
            </div>
          </div>

          {/* Core attributes splitting (Base + equipment) */}
          <div className="space-y-2 border-t border-slate-850 pt-3">
            <h4 className="text-[10.5px] font-bold text-slate-300 mb-2 flex items-center space-x-1 select-none">
              <span>🧬</span> <span>六維核心屬性配置 (輸入「基礎值 (Base)」與「裝備與藥水所得附加值 (Add)」)</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* STR */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[10.5px] font-black text-red-400 block mb-1">力量 (STR)</span>
                <div className="flex items-center space-x-1 justify-center">
                  <input
                    type="number"
                    value={strBase}
                    onChange={(e) => setStrBase(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-red-300"
                    placeholder="Base"
                  />
                  <span className="text-slate-500 text-xs">+</span>
                  <input
                    type="number"
                    value={strEquip}
                    onChange={(e) => setStrEquip(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-slate-300"
                    placeholder="Add"
                  />
                </div>
                <span className="text-[9.5px] text-slate-400 block mt-1">總額：{totalStr}</span>
              </div>

              {/* DEX */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[10.5px] font-black text-green-400 block mb-1">敏捷 (DEX)</span>
                <div className="flex items-center space-x-1 justify-center">
                  <input
                    type="number"
                    value={dexBase}
                    onChange={(e) => setDexBase(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-green-300"
                    placeholder="Base"
                  />
                  <span className="text-slate-500 text-xs">+</span>
                  <input
                    type="number"
                    value={dexEquip}
                    onChange={(e) => setDexEquip(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-slate-300"
                    placeholder="Add"
                  />
                </div>
                <span className="text-[9.5px] text-slate-400 block mt-1">總額：{totalDex}</span>
              </div>

              {/* INT */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[10.5px] font-black text-cyan-400 block mb-1">智力 (INT)</span>
                <div className="flex items-center space-x-1 justify-center">
                  <input
                    type="number"
                    value={intBase}
                    onChange={(e) => setIntBase(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-cyan-300"
                    placeholder="Base"
                  />
                  <span className="text-slate-500 text-xs">+</span>
                  <input
                    type="number"
                    value={intEquip}
                    onChange={(e) => setIntEquip(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-slate-300"
                    placeholder="Add"
                  />
                </div>
                <span className="text-[9.5px] text-slate-400 block mt-1">總額：{totalInt}</span>
              </div>

              {/* LUK */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[10.5px] font-black text-indigo-400 block mb-1">幸運 (LUK)</span>
                <div className="flex items-center space-x-1 justify-center">
                  <input
                    type="number"
                    value={lukBase}
                    onChange={(e) => setLukBase(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-indigo-300"
                    placeholder="Base"
                  />
                  <span className="text-slate-500 text-xs">+</span>
                  <input
                    type="number"
                    value={lukEquip}
                    onChange={(e) => setLukEquip(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-[11px] font-mono text-slate-300"
                    placeholder="Add"
                  />
                </div>
                <span className="text-[9.5px] text-slate-400 block mt-1">總額：{totalLuk}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-850 pt-3">
            <h4 className="text-[10.5px] font-bold text-slate-300 mb-2 flex items-center space-x-1">
              <span>🗡️</span> <span>神兵裝備屬性加成 (總武器物理攻擊與魔法攻擊總和)</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">總裝備物理攻擊 (Attack)</label>
                <input
                  type="number"
                  value={weaponAttack}
                  onChange={(e) => setWeaponAttack(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-xs text-center font-mono font-bold text-amber-400 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">總裝備魔法攻擊 (Magic Attack)</label>
                <input
                  type="number"
                  value={equipMagicAttack}
                  onChange={(e) => setEquipMagicAttack(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-xs text-center font-mono font-bold text-cyan-400 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">額外裝備命中 (Equip ACC)</label>
                <input
                  type="number"
                  value={equipAcc}
                  onChange={(e) => setEquipAcc(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-xs text-center font-mono font-bold text-emerald-400 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">額外裝備迴避 (Equip Avoid)</label>
                <input
                  type="number"
                  value={equipAvoid}
                  onChange={(e) => setEquipAvoid(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-xs text-center font-mono font-bold text-yellow-300"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">加總裝備物理防禦 (Equip Def)</label>
                <input
                  type="number"
                  value={equipDef}
                  onChange={(e) => setEquipDef(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-xs text-center font-mono font-bold text-slate-300"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">加總裝備魔法防禦 (Equip M.Def)</label>
                <input
                  type="number"
                  value={equipMagicDef}
                  onChange={(e) => setEquipMagicDef(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 p-1.5 rounded text-xs text-center font-mono font-bold text-indigo-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Traditional Card Display Replica */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Classic Character Card Layout Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg select-none">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
              <span className="text-xs font-black text-indigo-400 flex items-center space-x-1.5">
                <span>👤</span> <span>角色詳細能力值資料</span>
              </span>
              <span className="text-[10px] font-bold text-rose-400 animate-pulse bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/30">Artale 機制</span>
            </div>

            {/* Classic Layout split pane */}
            <div className="p-4 grid grid-cols-2 gap-px bg-slate-850">
              {/* Left Column (Stats Input Recap) */}
              <div className="bg-slate-900 p-3 space-y-2 rounded-l-xl text-xs">
                <div className="border-b border-slate-800 pb-1.5 mb-1.5 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-bold">基本屬性資訊</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Total</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-450 text-[11px]">名稱</span>
                  <span className="font-extrabold text-[#f1bf3e]">玩家</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-450 text-[11px]">職業</span>
                  <span className="font-extrabold text-slate-100">{JOBS_LIST[selectedJobId]?.name.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-450 text-[11px]">等級</span>
                  <span className="font-extrabold font-mono text-teal-400">{level}</span>
                </div>
                
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-red-400 font-bold">力量 (STR)</span>
                    <span className="font-black font-mono text-red-200">{totalStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400 font-bold">敏捷 (DEX)</span>
                    <span className="font-black font-mono text-green-200">{totalDex}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-bold">智力 (INT)</span>
                    <span className="font-black font-mono text-cyan-200">{totalInt}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-400 font-bold">幸運 (LUK)</span>
                    <span className="font-black font-mono text-indigo-200">{totalLuk}</span>
                  </div>
                </div>
              </div>

              {/* Right Column (Maple Panel Values Calculated) */}
              <div className="bg-slate-900 p-3 space-y-2.5 rounded-r-xl border-l border-slate-850">
                <div className="border-b border-slate-800 pb-1.5 mb-1.5">
                  <span className="text-[11px] text-slate-400 font-bold">戰鬥面板預計</span>
                </div>
                
                {/* Attack range */}
                <div className="flex flex-col">
                  <span className="text-slate-450 text-[10px] block select-none">🗡️ 攻擊力 (Panel Range)</span>
                  <span className="text-sm font-black font-mono text-[#f1bf3e] leading-snug drop-shadow-md">
                    {minPhysical} ~ {maxPhysical}
                  </span>
                </div>

                {/* Magic Attack AP */}
                <div className="flex flex-col">
                  <span className="text-slate-450 text-[10px] block select-none">🔮 魔法攻擊力</span>
                  <span className="text-xs font-black font-mono text-[#4ee9ff]">
                    {magicAP} <span className="text-[10px] text-slate-500 font-normal">({totalInt} + {equipMagicAttack}物)</span>
                  </span>
                </div>

                {/* Accuracy */}
                <div className="flex flex-col">
                  <span className="text-slate-450 text-[10px] block select-none">🎯 命中率 (Accuracy)</span>
                  <span className="text-xs font-black font-mono text-[#54fc4c]">
                    {calculatedAcc} <span className="text-[9px] text-slate-500 font-normal">({extraSkillAcc > 0 ? `內含熟練+${extraSkillAcc}` : '無增益'})</span>
                  </span>
                </div>

                {/* Avoidability */}
                <div className="flex flex-col">
                  <span className="text-slate-450 text-[10px] block select-none">🛡️ 迴避率 (Avoidability)</span>
                  <span className="text-xs font-black font-mono text-[#ffa043]">
                    {calculatedAvoid}
                  </span>
                </div>

                {/* Defenses */}
                <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[9px] block mb-0.5">物理防禦</span>
                    <span className="text-xs font-black font-mono text-slate-350">{calculatedDef}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block mb-0.5">魔法防禦</span>
                    <span className="text-xs font-black font-mono text-indigo-305 text-indigo-300">{calculatedMagicDef}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cosmetic speed panels */}
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex justify-between select-none">
            <div className="flex-1 border-r border-slate-800 pr-4 text-center">
              <span className="text-slate-400 text-[10.5px] block font-bold mb-1">🏃 移動速度</span>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-[13px] font-black font-mono text-emerald-450 text-emerald-400">{speed}%</span>
                <span className="text-[9.5px] text-slate-500">({speed >= 140 ? '最極限' : '普通'})</span>
              </div>
            </div>
            <div className="flex-1 pl-4 text-center">
              <span className="text-slate-400 text-[10.5px] block font-bold mb-1">🦘 跳躍力</span>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-[13px] font-black font-mono text-indigo-400">{jump}%</span>
                <span className="text-[9.5px] text-slate-500">({jump >= 123 ? '最極限' : '普通'})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic theorycrafting: "1物攻 (WA) 等於幾點主屬性" & Stat explanation details */}
      <div className="mt-6 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 mb-3 select-none">
          <span className="text-lg">🧮</span>
          <h4 className="text-xs font-black text-teal-300 uppercase tracking-widest">
            黃金效益大解析 (當前屬性配比評測)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Main Equivalence Card */}
          <div className="md:col-span-5 bg-slate-950/65 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-center text-center">
            <span className="text-[10.5px] font-black text-slate-400 tracking-wider uppercase mb-1">
              {JOBS_LIST[selectedJobId]?.name.split(' ')[0]} 關鍵比例換算：
            </span>
            <div className="my-2 select-all">
              <span className="text-xs font-bold text-slate-200">1 物理攻擊力 (WA) ≈</span>
              <div className="text-2xl font-black font-mono text-[#f1bf3e] my-1 drop-shadow">
                {selectedJobId === 'bishop' || selectedJobId === 'archmage_fp' || selectedJobId === 'archmage_il' ? (
                  <span className="text-cyan-400 text-lg">法師不吃物攻</span>
                ) : (
                  <span>{waToMainStatRatio} 點 {mainStatKey === 'str' ? '力量' : mainStatKey === 'dex' ? '敏捷' : '幸運'}</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              {selectedJobId === 'bishop' || selectedJobId === 'archmage_fp' || selectedJobId === 'archmage_il' ? (
                <span>法系職業請主力提升 <b>智力 (INT)</b> 與 <b>裝備魔攻</b>。1點智力與法術強度為等比關係。</span>
              ) : (
                <span>
                  意即在您目前的屬性基底中，若是衝一個卷軸增加 <b>1 物理攻擊</b>，相當於為您提升 <b>{waToMainStatRatio}</b> 點的 {mainStatName.split(' ')[0]}！此換算比率會隨您【總屬性的增高而變大】，隨【當前攻擊力的增高而變小】。
                </span>
              )}
            </p>
          </div>

          {/* Individual Points scale */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-3">
            <div className="bg-slate-950/40 border border-slate-850/60 p-3 rounded-xl">
              <span className="text-[10.5px] font-black text-indigo-400 block mb-2">當前狀態下 1 點屬性對面板【最大上限 Max】的直接增益：</span>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded select-none">
                  <span className="text-red-400 font-bold">+1 力量 (STR)</span>
                  <span className="text-slate-100 font-bold">+{strMarginal.toFixed(2)} 面板</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded select-none">
                  <span className="text-green-400 font-bold">+1 敏捷 (DEX)</span>
                  <span className="text-slate-100 font-bold">+{dexMarginal.toFixed(2)} 面板</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded select-none">
                  <span className="text-indigo-400 font-bold">+1 幸運 (LUK)</span>
                  <span className="text-slate-100 font-bold">+{lukMarginal.toFixed(2)} 面板</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded select-none">
                  <span className="text-amber-400 font-bold">+1 物理攻 (WA)</span>
                  <span className="text-amber-400 font-black">+{waMarginal.toFixed(2)} 面板</span>
                </div>
              </div>
            </div>

            {/* Magician Magic Spells Damage Prediction Sub-module */}
            {['magician'].includes(JOBS_LIST[selectedJobId]?.category) ? (
              <div className="bg-slate-950/40 border border-cyan-950 p-3 rounded-xl">
                <div className="flex justify-between items-center mb-1.5 border-b border-slate-800 pb-1">
                  <span className="text-[10.5px] font-black text-cyan-400 flex items-center space-x-1">
                    <span>✨</span> <span>法系核心法術傷害估算 (對 0 魔防怪單體)</span>
                  </span>
                  <span className="text-[9px] text-[#f1bf3e] font-bold">精準 4 期公式</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">魔法技能選擇</label>
                    <select
                      value={activeSpellIdx}
                      onChange={(e) => setActiveSpellIdx(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-bold focus:outline-none"
                    >
                      {currentJobSpells.map((sp, idx) => (
                        <option key={idx} value={idx}>{sp.name} (威力:{sp.baseAttack})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block pb-1">預估單發傷害範圍</label>
                    <div className="text-[11.5px] font-mono font-black text-teal-400 bg-slate-900 px-2 py-1 rounded text-center border border-slate-800 select-all">
                      {activeSpell ? `${spellMin} ~ ${spellMax}` : '未知技能'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/30 border border-slate-850 text-[10px] text-slate-500 rounded-xl leading-normal select-none">
                💡 <b>物理名言</b>：當前大後期物理職業，追求的高攻手套或高攻武器往往 1 點物攻價值不菲，蓋因你目前的 1 物理攻擊力能置換高達 <b>{waToMainStatRatio} 點</b>的本職核心主屬性，這正是為甚麼狂暴追求高攻卷極限的原因！
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
