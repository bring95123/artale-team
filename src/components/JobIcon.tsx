import React from 'react';

interface JobIconProps {
  jobName: string;
  sizeClass?: string;
}

export default function JobIcon({ jobName, sizeClass = "w-5 h-5" }: JobIconProps) {
  // Determine category
  const getJobCategory = (job: string) => {
    const s = job || '';
    if (['狂戰士', '見習騎士', '槍騎兵', '十字軍', '騎士', '龍騎士', '英雄', '聖騎士', '黑騎士', '劍士'].includes(s)) return '劍士';
    if (['僧侶', '火毒巫師', '冰雷巫師', '祭司', '火毒魔導士', '冰雷魔導士', '主教', '火毒大魔導', '冰雷大魔導', '法師'].includes(s)) return '法師';
    if (['獵人', '弩弓手', '遊俠', '狙擊手', '箭神', '神射手', '弓箭手'].includes(s)) return '弓箭手';
    if (['俠盜', '刺客', '神偷', '暗殺者', '暗影神偷', '夜使者', '盜賊'].includes(s)) return '盜賊';
    if (['打手', '槍手', '格鬥家', '神槍手', '拳霸', '槍神', '海盜'].includes(s)) return '海盜';
    return '未知';
  };

  const category = getJobCategory(jobName);

  switch (category) {
    case '劍士':
      return (
        <svg className={`${sizeClass} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#be185d" />
          <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" stroke="#fbcfe8" strokeWidth="1.5" fill="none" />
          <path d="M6 18L8 16M8 16L17 7M17 7L15 5M17 7L19 9M7 13L11 17" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case '法師':
      return (
        <svg className={`${sizeClass} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#0284c7" />
          <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" stroke="#bae6fd" strokeWidth="1.5" fill="none" />
          <path d="M12 7V17M12 7C10 5 6 5 6 5V15C6 15 10 15 12 17M12 7C14 5 18 5 18 5V15C18 15 14 15 12 17" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case '弓箭手':
      return (
        <svg className={`${sizeClass} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#16a34a" />
          <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" stroke="#bbf7d0" strokeWidth="1.5" fill="none" />
          <path d="M8 5C14 5 17 9 17 12C17 15 14 19 8 19" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 5V19" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          <path d="M6 12H18M18 12L14 9M18 12L14 15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case '盜賊':
      return (
        <svg className={`${sizeClass} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#7c3aed" />
          <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" stroke="#ddd6fe" strokeWidth="1.5" fill="none" />
          <path d="M12 4L14.5 9.5L20 12L14.5 14.5L12 20L9.5 14.5L4 12L9.5 9.5Z" fill="#ffffff" stroke="#ffffff" strokeWidth="0.5" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.2" fill="#7c3aed" />
        </svg>
      );
    case '海盜':
      return (
        <svg className={`${sizeClass} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#4b5563" />
          <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" stroke="#e5e7eb" strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="6" r="2" stroke="#ffffff" strokeWidth="2" />
          <path d="M12 8V18" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M9 10H15" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M6 13C6 17 9 19 12 19C15 19 18 17 18 13" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 14L6 12L7 14M17 14L18 12L19 14" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={`${sizeClass} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#6b7280" />
          <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="12" r="4" stroke="#ffffff" strokeWidth="2" />
        </svg>
      );
  }
}
