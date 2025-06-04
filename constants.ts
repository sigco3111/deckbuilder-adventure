

import { Card, CardType, TargetType, EnemyDefinition, EnemyState, PlayerState, EnemyIntent, EnemyBehavior, MapNodeData, Buff } from './types';
// Removed: import { createCardInstance } from './gameLogic/deckUtils';

// --- GAME SETTINGS ---
export const PLAYER_MAX_HP = 70;
export const PLAYER_INITIAL_ENERGY = 3;
export const PLAYER_INITIAL_DRAW_COUNT = 5;
export const INITIAL_GOLD = 0;
export const CARD_REWARD_COUNT = 3;

// --- MASTERY SETTINGS ---
export const MASTERY_BONUS_DAMAGE_PER_LEVEL = 1; 
export const MASTERY_BONUS_BLOCK_PER_LEVEL = 1;  
export const MAX_MASTERED_CARDS = 999999; // This constant now signifies that virtually any card can have its mastery level increased.

// --- ASCENSION SETTINGS ---
export const MAX_ASCENSION_LEVEL = 3; // 최대 승천 레벨
export const ASCENSION_SETTINGS = {
  ENEMY_HP_BONUS_L1: 0.20, // 승천 1: 모든 적 체력 +20%
  ELITE_BOSS_HP_BONUS_L2: 0.25, // 승천 2: 정예/보스 체력 추가 +25% (L1 효과에 곱연산)
  // 승천 3은 시작 시 저주 카드 추가 (App.tsx에서 처리)
};

export const CURSE_REGRET_DEF: Card = {
  id: 'CURSE_REGRET_DEF',
  definitionId: 'CURSE_REGRET_DEF',
  name: '후회',
  cost: 0, // 실제로 비용을 표시하지 않거나, 사용할 수 없음을 명확히 하기 위해 0
  type: CardType.CURSE,
  description: '사용할 수 없습니다. 손에 있으면 버릴 수도 없습니다.', // 더 정확한 설명
  effects: [], // 저주 카드는 일반적으로 직접적인 효과보다는 존재 자체로 패널티
  targetType: TargetType.NONE,
  rarity: 'SPECIAL', // 보상으로 나오지 않도록 특별 등급
  artUrl: 'https://picsum.photos/seed/curseofregret/200/300',
  masteryLevel: 0,
};


// --- BUFF DEFINITIONS ---
export const BUFF_DEFINITIONS: Record<string, { icon: string, defaultDescription: (value: number, duration: number) => string }> = {
  '힘': { icon: '💪', defaultDescription: (v, d) => `힘 ${v}. (공격력 증가)` + (d === -1 ? ' (영구)' : ` (${d}턴)`) },
  '취약': { icon: '🎯', defaultDescription: (v, d) => `취약 ${v}. (받는 피해 50% 증가)` + (d === -1 ? ' (영구)' : ` (${d}턴)`) },
  '약화': { icon: '📉', defaultDescription: (v, d) => `약화 ${v}. (공격 피해량 25% 감소)` + (d === -1 ? ' (영구)' : ` (${d}턴)`) },
  '요새화 (지속)': { icon: '🛡️⏳', defaultDescription: (v, d) => `다음 턴 시작 시 방어도 ${v} 추가 획득` + (d > 0 ? ` (${d-1}턴 후 만료)` : '') },
  '유령 갑옷 지속': { icon: '👻🛡️', defaultDescription: (v, d) => `이번 턴 종료 시 방어도가 유지됩니다.` },
  '비상 버튼 후폭풍': { icon: '💥⏳', defaultDescription: (v) => `다음 턴 시작 시 체력 ${v} 잃음` },
};


// --- CARD DEFINITIONS ---
// Descriptions are base, mastery bonus will be appended or dynamically inserted in CardComponent/applyCardEffect
export const STRIKE_CARD_DEF: Card = {
  id: 'STRIKE_DEF_COMMON',
  definitionId: 'STRIKE_DEF_COMMON',
  name: '강타',
  cost: 1,
  type: CardType.ATTACK,
  description: '6의 피해를 줍니다.',
  effects: [{ type: 'DAMAGE', value: 6 }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/strike/200/300',
  masteryLevel: 0,
};

export const DEFEND_CARD_DEF: Card = {
  id: 'DEFEND_DEF_COMMON',
  definitionId: 'DEFEND_DEF_COMMON',
  name: '수비',
  cost: 1,
  type: CardType.SKILL,
  description: '5의 방어도를 얻습니다.',
  effects: [{ type: 'BLOCK', value: 5 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/defend/200/300',
  masteryLevel: 0,
};

export const HEAVY_STRIKE_CARD_DEF: Card = {
  id: 'HEAVY_STRIKE_DEF_COMMON',
  definitionId: 'HEAVY_STRIKE_DEF_COMMON',
  name: '강력한 일격',
  cost: 2,
  type: CardType.ATTACK,
  description: '12의 피해를 줍니다.',
  effects: [{ type: 'DAMAGE', value: 12 }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/bigstrike/200/300',
  masteryLevel: 0,
};

export const QUICK_DRAW_CARD_DEF: Card = {
  id: 'QUICK_DRAW_DEF_COMMON',
  definitionId: 'QUICK_DRAW_DEF_COMMON',
  name: '쾌속 뽑기',
  cost: 1,
  type: CardType.SKILL,
  description: '카드 1장을 뽑습니다.',
  effects: [{ type: 'DRAW', value: 1 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/quickdraw/200/300',
  masteryLevel: 0,
};

// --- NEW CARD DEFINITIONS ---

// Common Attack Cards (10)
export const SWIFT_STRIKE_DEF: Card = {
  id: 'SWIFT_STRIKE_DEF',
  definitionId: 'SWIFT_STRIKE_DEF',
  name: '신속한 공격',
  cost: 0,
  type: CardType.ATTACK,
  description: '3의 피해를 줍니다.',
  effects: [{ type: 'DAMAGE', value: 3 }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/swiftstrike/200/300',
  masteryLevel: 0,
};

export const PIERCING_ARROW_DEF: Card = {
  id: 'PIERCING_ARROW_DEF',
  definitionId: 'PIERCING_ARROW_DEF',
  name: '관통 화살',
  cost: 1,
  type: CardType.ATTACK,
  description: '적의 방어도를 무시하고 4의 피해를 줍니다.',
  effects: [{ type: 'DAMAGE', value: 4, ignoresBlock: true }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/piercingarrow/200/300',
  masteryLevel: 0,
};

export const DOUBLE_TAP_DEF: Card = {
  id: 'DOUBLE_TAP_DEF',
  definitionId: 'DOUBLE_TAP_DEF',
  name: '더블 탭',
  cost: 1,
  type: CardType.ATTACK,
  description: '4의 피해를 두 번 줍니다.',
  effects: [{ type: 'DAMAGE', value: 4 }, { type: 'DAMAGE', value: 4 }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/doubletap/200/300',
  masteryLevel: 0,
};

export const SHIELD_BASH_DEF: Card = {
  id: 'SHIELD_BASH_DEF',
  definitionId: 'SHIELD_BASH_DEF',
  name: '방패 가격',
  cost: 1,
  type: CardType.ATTACK,
  description: '자신의 현재 방어도만큼 피해를 줍니다.', 
  effects: [{ type: 'DAMAGE', value: 0 }], // value is dynamically set
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/shieldbash/200/300',
  masteryLevel: 0,
};

export const BLOODLETTING_DEF: Card = {
  id: 'BLOODLETTING_DEF',
  definitionId: 'BLOODLETTING_DEF',
  name: '방혈',
  cost: 0,
  type: CardType.ATTACK,
  description: '체력을 2 잃고, 8의 피해를 줍니다.',
  effects: [{type: 'HEAL', value: -2, target: TargetType.SELF}, { type: 'DAMAGE', value: 8 }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/bloodletting/200/300',
  masteryLevel: 0,
};

export const FEINT_DEF: Card = {
  id: 'FEINT_DEF',
  definitionId: 'FEINT_DEF',
  name: '기만 공격',
  cost: 1,
  type: CardType.ATTACK,
  description: '5의 피해를 줍니다. 3의 방어도를 얻습니다.',
  effects: [{ type: 'DAMAGE', value: 5 }, { type: 'BLOCK', value: 3, target: TargetType.SELF }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/feint/200/300',
  masteryLevel: 0,
};

export const HEADBUTT_DEF: Card = {
  id: 'HEADBUTT_DEF',
  definitionId: 'HEADBUTT_DEF',
  name: '박치기',
  cost: 1,
  type: CardType.ATTACK,
  description: '9의 피해를 줍니다. 버린 카드 더미에서 카드 1장을 뽑을 카드 더미 맨 위에 놓습니다.',
  effects: [{ type: 'DAMAGE', value: 9 }, { type: 'RETRIEVE_FROM_DISCARD_TO_DRAW_TOP', value: 1 }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/headbutt/200/300',
  masteryLevel: 0,
};

export const CLEAVE_DEF: Card = {
  id: 'CLEAVE_DEF',
  definitionId: 'CLEAVE_DEF',
  name: '휩쓸기',
  cost: 1,
  type: CardType.ATTACK,
  description: '모든 적에게 4의 피해를 줍니다.',
  effects: [{ type: 'DAMAGE', value: 4 }],
  targetType: TargetType.ALL_ENEMIES,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/cleave/200/300',
  masteryLevel: 0,
};

export const RECKLESS_SWING_DEF: Card = {
  id: 'RECKLESS_SWING_DEF',
  definitionId: 'RECKLESS_SWING_DEF',
  name: '무모한 휘두르기',
  cost: 1,
  type: CardType.ATTACK,
  description: '10의 피해를 줍니다. 다음 턴에 받는 피해가 증가합니다 (취약 1 부여).',
  effects: [
    { type: 'DAMAGE', value: 10 },
    { type: 'APPLY_BUFF', buffName: '취약', buffValue: 1, buffDuration: 1, target: TargetType.SELF }
  ],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/recklessswing/200/300',
  masteryLevel: 0,
};

export const POMMEL_STRIKE_DEF: Card = {
  id: 'POMMEL_STRIKE_DEF',
  definitionId: 'POMMEL_STRIKE_DEF',
  name: '손잡이 공격',
  cost: 1,
  type: CardType.ATTACK,
  description: '7의 피해를 줍니다. 카드 1장을 뽑습니다.',
  effects: [{ type: 'DAMAGE', value: 7 }, { type: 'DRAW', value: 1, target: TargetType.SELF }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/pommelstrike/200/300',
  masteryLevel: 0,
};


// Common Skill Cards (10)
export const MINOR_HEAL_DEF: Card = {
  id: 'MINOR_HEAL_DEF',
  definitionId: 'MINOR_HEAL_DEF',
  name: '가벼운 치유',
  cost: 1,
  type: CardType.SKILL,
  description: '체력 5를 회복합니다.',
  effects: [{ type: 'HEAL', value: 5 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/minorheal/200/300',
  masteryLevel: 0,
};

export const PREPARE_DEF: Card = {
  id: 'PREPARE_DEF',
  definitionId: 'PREPARE_DEF',
  name: '준비',
  cost: 0,
  type: CardType.SKILL,
  description: '카드 1장을 뽑고, 2의 방어도를 얻습니다.',
  effects: [{ type: 'DRAW', value: 1 }, { type: 'BLOCK', value: 2 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/prepare/200/300',
  masteryLevel: 0,
};

export const GUARD_DEF: Card = {
  id: 'GUARD_DEF',
  definitionId: 'GUARD_DEF',
  name: '경계',
  cost: 1,
  type: CardType.SKILL,
  description: '7의 방어도를 얻습니다.',
  effects: [{ type: 'BLOCK', value: 7 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/guard/200/300',
  masteryLevel: 0,
};

export const ENERGY_BOOST_DEF: Card = {
  id: 'ENERGY_BOOST_DEF',
  definitionId: 'ENERGY_BOOST_DEF',
  name: '에너지 증폭',
  cost: 0,
  type: CardType.SKILL,
  description: '이번 턴에 에너지 1을 얻습니다.',
  effects: [{ type: 'GAIN_ENERGY', value: 1 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/energyboost/200/300',
  masteryLevel: 0,
};

export const STRATEGIC_WITHDRAWAL_DEF: Card = {
  id: 'STRATEGIC_WITHDRAWAL_DEF',
  definitionId: 'STRATEGIC_WITHDRAWAL_DEF',
  name: '전략적 후퇴',
  cost: 1,
  type: CardType.SKILL,
  description: '5의 방어도를 얻고, 카드 1장을 뽑습니다.',
  effects: [{ type: 'BLOCK', value: 5 }, { type: 'DRAW', value: 1 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/strategicwithdrawal/200/300',
  masteryLevel: 0,
};

export const SIDESTEP_DEF: Card = {
  id: 'SIDESTEP_DEF',
  definitionId: 'SIDESTEP_DEF',
  name: '옆걸음',
  cost: 0,
  type: CardType.SKILL,
  description: '3의 방어도를 얻습니다.',
  effects: [{ type: 'BLOCK', value: 3 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/sidestep/200/300',
  masteryLevel: 0,
};

export const TRIP_DEF: Card = {
  id: 'TRIP_DEF',
  definitionId: 'TRIP_DEF',
  name: '발 걸기',
  cost: 1,
  type: CardType.SKILL,
  description: '적에게 2의 피해를 주고, 다음 턴에 적의 공격 피해량이 감소합니다 (약화 1 부여).',
  effects: [
    { type: 'DAMAGE', value: 2 },
    { type: 'APPLY_BUFF', buffName: '약화', buffValue: 1, buffDuration: 1 }
  ],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/trip/200/300',
  masteryLevel: 0,
};

export const QUICK_THINKING_DEF: Card = {
  id: 'QUICK_THINKING_DEF',
  definitionId: 'QUICK_THINKING_DEF',
  name: '빠른 판단',
  cost: 0,
  type: CardType.SKILL,
  description: '카드 2장을 뽑습니다. 그 후 손에서 무작위 카드 1장을 버립니다.',
  effects: [{ type: 'DRAW', value: 2 }, { type: 'DISCARD_HAND_RANDOM', value: 1 }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/quickthinking/200/300',
  masteryLevel: 0,
};

export const FORTIFY_DEF: Card = {
  id: 'FORTIFY_DEF',
  definitionId: 'FORTIFY_DEF',
  name: '요새화',
  cost: 2,
  type: CardType.SKILL,
  description: '10의 방어도를 얻습니다. 다음 턴 시작 시 5의 방어도를 추가로 얻습니다.',
  effects: [
    { type: 'BLOCK', value: 10 },
    { type: 'APPLY_BUFF', buffName: '요새화 (지속)', buffValue: 5, buffDuration: 2, target: TargetType.SELF }
  ],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/fortify/200/300',
  masteryLevel: 0,
};

export const PROVOKE_DEF: Card = {
  id: 'PROVOKE_DEF',
  definitionId: 'PROVOKE_DEF',
  name: '도발',
  cost: 1,
  type: CardType.SKILL,
  description: '3의 방어도를 얻습니다. 적이 다음 턴에 당신을 공격할 확률이 높아집니다.', // Taunt mechanic not implemented.
  effects: [{ type: 'BLOCK', value: 3 }],
  targetType: TargetType.SELF, 
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/provoke/200/300',
  masteryLevel: 0,
};

// Uncommon Attack Cards (7)
export const WHIRLWIND_DEF: Card = {
  id: 'WHIRLWIND_DEF',
  definitionId: 'WHIRLWIND_DEF',
  name: '소용돌이',
  cost: 2,
  type: CardType.ATTACK,
  description: '모든 적에게 5의 피해를 2번 줍니다.',
  effects: [{ type: 'DAMAGE', value: 5 }, { type: 'DAMAGE', value: 5 }],
  targetType: TargetType.ALL_ENEMIES,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/whirlwind/200/300',
  masteryLevel: 0,
};

export const BODY_SLAM_DEF: Card = {
  id: 'BODY_SLAM_DEF',
  definitionId: 'BODY_SLAM_DEF',
  name: '몸통 박치기',
  cost: 1,
  type: CardType.ATTACK,
  description: '자신의 현재 방어도만큼 추가 피해를 줍니다. 기본 피해 3.',
  effects: [{ type: 'DAMAGE', value: 3 }], // Base damage, block is added dynamically
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/bodyslam/200/300',
  masteryLevel: 0,
};

export const SUNDER_DEF: Card = {
  id: 'SUNDER_DEF',
  definitionId: 'SUNDER_DEF',
  name: '분쇄',
  cost: 2,
  type: CardType.ATTACK,
  description: '10의 피해를 주고, 대상의 방어도를 모두 제거합니다.',
  effects: [{ type: 'DAMAGE', value: 10 }, { type: 'REMOVE_ALL_BLOCK' }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/sunder/200/300',
  masteryLevel: 0,
};

export const PERFECTED_STRIKE_DEF: Card = {
  id: 'PERFECTED_STRIKE_DEF',
  definitionId: 'PERFECTED_STRIKE_DEF',
  name: '완벽한 일격',
  cost: 2,
  type: CardType.ATTACK,
  description: '6의 피해를 줍니다. 덱에 있는 "강타" 카드마다 피해량이 +2 증가합니다.',
  effects: [{ type: 'DAMAGE', value: 6 }], // Base damage, bonus calculated dynamically
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/perfectedstrike/200/300',
  masteryLevel: 0,
};

export const GLASS_KNIFE_DEF: Card = {
  id: 'GLASS_KNIFE_DEF',
  definitionId: 'GLASS_KNIFE_DEF',
  name: '유리 칼',
  cost: 1,
  type: CardType.ATTACK,
  description: '12의 피해를 줍니다. 전투 중 이 카드를 사용하면 다음부터 피해량이 4 감소합니다.',
  effects: [{ type: 'DAMAGE', value: 12 }], // Initial base damage
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/glassknife/200/300',
  masteryLevel: 0,
};

export const SWORD_BOOMERANG_DEF: Card = {
  id: 'SWORD_BOOMERANG_DEF',
  definitionId: 'SWORD_BOOMERANG_DEF',
  name: '검 부메랑',
  cost: 1,
  type: CardType.ATTACK,
  description: '무작위 적에게 3의 피해를 3번 줍니다.',
  effects: [{ type: 'DAMAGE', value: 3 },{ type: 'DAMAGE', value: 3 },{ type: 'DAMAGE', value: 3 }],
  targetType: TargetType.NONE, 
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/swordboomerang/200/300',
  masteryLevel: 0,
};

export const RAMPAGE_DEF: Card = {
  id: 'RAMPAGE_DEF',
  definitionId: 'RAMPAGE_DEF',
  name: '광란',
  cost: 1,
  type: CardType.ATTACK,
  description: '8의 피해를 줍니다. 이번 전투에서 이 카드를 사용할 때마다 피해량이 +5 증가합니다.',
  effects: [{ type: 'DAMAGE', value: 8 }], // Initial base damage
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/rampage/200/300',
  masteryLevel: 0,
};

// Uncommon Skill Cards (8)
export const SHROUD_OF_DARKNESS_DEF: Card = {
  id: 'SHROUD_OF_DARKNESS_DEF',
  definitionId: 'SHROUD_OF_DARKNESS_DEF',
  name: '어둠의 장막',
  cost: 1,
  type: CardType.SKILL,
  description: '10의 방어도를 얻습니다. 카드 1장을 뽑습니다.',
  effects: [{ type: 'BLOCK', value: 10 }, { type: 'DRAW', value: 1 }],
  targetType: TargetType.SELF,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/shroudofdarkness/200/300',
  masteryLevel: 0,
};

export const ADRENALINE_DEF: Card = {
  id: 'ADRENALINE_DEF',
  definitionId: 'ADRENALINE_DEF',
  name: '아드레날린',
  cost: 0,
  type: CardType.SKILL,
  description: '에너지 2를 얻습니다. 카드 1장을 뽑습니다. 소멸.',
  effects: [{ type: 'GAIN_ENERGY', value: 2 }, { type: 'DRAW', value: 1 }, { type: 'EXHAUST_SELF' }],
  targetType: TargetType.SELF,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/adrenaline/200/300',
  masteryLevel: 0,
};

export const GHOSTLY_ARMOR_DEF: Card = {
  id: 'GHOSTLY_ARMOR_DEF',
  definitionId: 'GHOSTLY_ARMOR_DEF',
  name: '유령 갑옷',
  cost: 1,
  type: CardType.SKILL,
  description: '10의 방어도를 얻습니다. 이 방어도는 턴이 끝나도 사라지지 않습니다. (1회 지속)',
  effects: [{ type: 'BLOCK', value: 10 }, { type: 'APPLY_BUFF', buffName: '유령 갑옷 지속', buffValue: 1, buffDuration: 1, target: TargetType.SELF }],
  targetType: TargetType.SELF,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/ghostlyarmor/200/300',
  masteryLevel: 0,
};

export const TRUE_GRIT_DEF: Card = {
  id: 'TRUE_GRIT_DEF',
  definitionId: 'TRUE_GRIT_DEF',
  name: '진정한 용기',
  cost: 1,
  type: CardType.SKILL,
  description: '7의 방어도를 얻습니다. 무작위 카드 1장을 소멸시킵니다.',
  effects: [{ type: 'BLOCK', value: 7 }, { type: 'EXHAUST_FROM_HAND_RANDOM', value: 1 }],
  targetType: TargetType.SELF,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/truegrit/200/300',
  masteryLevel: 0,
};

export const DISARM_DEF: Card = {
  id: 'DISARM_DEF',
  definitionId: 'DISARM_DEF',
  name: '무장 해제',
  cost: 1,
  type: CardType.SKILL,
  description: '대상의 힘을 2 감소시킵니다 (이번 전투 동안).',
  effects: [{type: 'APPLY_BUFF', buffName: '힘', buffValue: -2, buffDuration: -1}],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/disarm/200/300',
  masteryLevel: 0,
};

export const PANIC_BUTTON_DEF: Card = {
  id: 'PANIC_BUTTON_DEF',
  definitionId: 'PANIC_BUTTON_DEF',
  name: '비상 버튼',
  cost: 0,
  type: CardType.SKILL,
  description: '30의 방어도를 얻습니다. 다음 턴 시작 시 체력을 10 잃습니다. 소멸.',
  effects: [
    { type: 'BLOCK', value: 30 }, 
    { type: 'APPLY_BUFF', buffName: '비상 버튼 후폭풍', buffValue: 10, buffDuration: 2, target: TargetType.SELF },
    { type: 'EXHAUST_SELF' }
  ],
  targetType: TargetType.SELF,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/panicbutton/200/300',
  masteryLevel: 0,
};


// Rare Attack Cards (5)
export const BLUDGEON_DEF: Card = {
  id: 'BLUDGEON_DEF',
  definitionId: 'BLUDGEON_DEF',
  name: '강타', // Different from Strike
  cost: 3,
  type: CardType.ATTACK,
  description: '32의 피해를 줍니다.',
  effects: [{ type: 'DAMAGE', value: 32 }],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'RARE',
  artUrl: 'https://picsum.photos/seed/bludgeon/200/300',
  masteryLevel: 0,
};

export const REAPER_DEF: Card = {
  id: 'REAPER_DEF',
  definitionId: 'REAPER_DEF',
  name: '사신',
  cost: 2,
  type: CardType.ATTACK,
  description: '모든 적에게 4의 피해를 줍니다. 입힌 피해만큼 체력을 회복합니다.',
  effects: [{ type: 'DAMAGE', value: 4, target: TargetType.ALL_ENEMIES }, {type: 'HEAL', value: 0, target: TargetType.SELF}], 
  targetType: TargetType.ALL_ENEMIES, 
  rarity: 'RARE',
  artUrl: 'https://picsum.photos/seed/reaper/200/300',
  masteryLevel: 0,
};


// Rare Skill Cards (5)
export const IMPERVIOUS_DEF: Card = {
  id: 'IMPERVIOUS_DEF',
  definitionId: 'IMPERVIOUS_DEF',
  name: '무적',
  cost: 2,
  type: CardType.SKILL,
  description: '30의 방어도를 얻습니다. 소멸.',
  effects: [{ type: 'BLOCK', value: 30 }, { type: 'EXHAUST_SELF' }],
  targetType: TargetType.SELF,
  rarity: 'RARE',
  artUrl: 'https://picsum.photos/seed/impervious/200/300',
  masteryLevel: 0,
};


// Remaining cards
export const NEUTRALIZE_DEF: Card = {
  id: 'NEUTRALIZE_DEF',
  definitionId: 'NEUTRALIZE_DEF',
  name: '무력화',
  cost: 0,
  type: CardType.ATTACK,
  description: '3의 피해를 줍니다. 적에게 취약 1을 겁니다.',
  effects: [
    { type: 'DAMAGE', value: 3 },
    { type: 'APPLY_BUFF', buffName: '취약', buffValue: 1, buffDuration: 1 }
  ],
  targetType: TargetType.SINGLE_ENEMY,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/neutralize/200/300',
  masteryLevel: 0,
};

export const SURVIVOR_DEF: Card = {
  id: 'SURVIVOR_DEF',
  definitionId: 'SURVIVOR_DEF',
  name: '생존자',
  cost: 1,
  type: CardType.SKILL,
  description: '8의 방어도를 얻습니다. 카드 1장을 뽑습니다. 소멸.',
  effects: [{ type: 'BLOCK', value: 8 }, {type: 'DRAW', value: 1}, { type: 'EXHAUST_SELF' }],
  targetType: TargetType.SELF,
  rarity: 'COMMON',
  artUrl: 'https://picsum.photos/seed/survivor/200/300',
  masteryLevel: 0,
};

export const INTIMIDATE_DEF: Card = {
  id: 'INTIMIDATE_DEF',
  definitionId: 'INTIMIDATE_DEF',
  name: '위협',
  cost: 1,
  type: CardType.SKILL,
  description: '모든 적에게 약화 1을 겁니다.', 
  effects: [{ type: 'APPLY_BUFF', buffName: '약화', buffValue: 1, buffDuration: 1 }], 
  targetType: TargetType.ALL_ENEMIES,
  rarity: 'UNCOMMON',
  artUrl: 'https://picsum.photos/seed/intimidate/200/300',
  masteryLevel: 0,
};

export const EXPOSE_WEAKNESS_DEF: Card = {
    id: 'EXPOSE_WEAKNESS_DEF',
    definitionId: 'EXPOSE_WEAKNESS_DEF',
    name: '약점 노출',
    cost: 1,
    type: CardType.SKILL,
    description: '적에게 2턴 동안 취약 상태를 부여합니다.',
    effects: [{ type: 'APPLY_BUFF', buffName: '취약', buffValue: 1, buffDuration: 2 }],
    targetType: TargetType.SINGLE_ENEMY,
    rarity: 'COMMON',
    artUrl: 'https://picsum.photos/seed/exposeweakness/200/300',
    masteryLevel: 0,
};


// --- INITIAL PLAYER DECK ---
export const INITIAL_PLAYER_DECK_DEFINITIONS: Card[] = [
  STRIKE_CARD_DEF,
  STRIKE_CARD_DEF,
  STRIKE_CARD_DEF,
  STRIKE_CARD_DEF,
  STRIKE_CARD_DEF,
  DEFEND_CARD_DEF,
  DEFEND_CARD_DEF,
  DEFEND_CARD_DEF,
  DEFEND_CARD_DEF,
  DEFEND_CARD_DEF,
];

export const ALL_GAME_CARDS: Card[] = [ // Does not include curses
  STRIKE_CARD_DEF,
  DEFEND_CARD_DEF,
  HEAVY_STRIKE_CARD_DEF,
  QUICK_DRAW_CARD_DEF,
  EXPOSE_WEAKNESS_DEF,

  // Common Attacks
  SWIFT_STRIKE_DEF,
  PIERCING_ARROW_DEF,
  DOUBLE_TAP_DEF,
  SHIELD_BASH_DEF,
  BLOODLETTING_DEF,
  FEINT_DEF,
  HEADBUTT_DEF,
  CLEAVE_DEF,
  RECKLESS_SWING_DEF,
  POMMEL_STRIKE_DEF,
  NEUTRALIZE_DEF,

  // Common Skills
  MINOR_HEAL_DEF,
  PREPARE_DEF,
  GUARD_DEF,
  ENERGY_BOOST_DEF,
  STRATEGIC_WITHDRAWAL_DEF,
  SIDESTEP_DEF,
  TRIP_DEF,
  QUICK_THINKING_DEF,
  FORTIFY_DEF,
  PROVOKE_DEF,
  SURVIVOR_DEF,

  // Uncommon Attacks
  WHIRLWIND_DEF,
  BODY_SLAM_DEF,
  SUNDER_DEF,
  PERFECTED_STRIKE_DEF,
  GLASS_KNIFE_DEF,
  SWORD_BOOMERANG_DEF,
  RAMPAGE_DEF,

  // Uncommon Skills
  SHROUD_OF_DARKNESS_DEF,
  ADRENALINE_DEF,
  GHOSTLY_ARMOR_DEF,
  TRUE_GRIT_DEF,
  DISARM_DEF,
  PANIC_BUTTON_DEF,
  INTIMIDATE_DEF,

  // Rare Attacks
  BLUDGEON_DEF,
  REAPER_DEF,

  // Rare Skills
  IMPERVIOUS_DEF,
];


// --- ENEMY DEFINITIONS ---

const genericAttackBehavior: EnemyBehavior['performAction'] = (self, player, intent) => {
  let updatedPlayer = { ...player };
  let updatedSelf = { ...self }; 
  updatedPlayer.buffs = player.buffs.map(b => ({...b})); 
  updatedSelf.buffs = self.buffs.map(b => ({...b})); 

  let logMsg = "";

  const baseDamage = intent.value || 0;
  logMsg = `${self.name}이(가) ${intent.description} (기본 피해 ${baseDamage}).`;

  const strength = updatedSelf.buffs.find(b => b.name === '힘')?.value || 0;
  let attackDamage = baseDamage + strength;

  const weakStacks = updatedSelf.buffs.find(b => b.name === '약화')?.value || 0;
  if (weakStacks > 0) {
    attackDamage = Math.floor(attackDamage * 0.75); // 25% damage reduction
    logMsg += ` ${self.name}은(는) 약화되어 피해량이 감소합니다!`;
  }

  let finalDamage = attackDamage;
  const vulnerableStacks = updatedPlayer.buffs.find(b => b.name === '취약')?.value || 0;
  if (vulnerableStacks > 0) {
    finalDamage = Math.floor(finalDamage * 1.5);
  }

  const damageAfterBlock = Math.max(0, finalDamage - updatedPlayer.block);
  updatedPlayer.hp = Math.max(0, updatedPlayer.hp - damageAfterBlock);
  updatedPlayer.block = Math.max(0, updatedPlayer.block - finalDamage);
  logMsg = `${self.name}이(가) ${intent.description}. 플레이어가 ${damageAfterBlock}의 피해를 입었습니다. (최종 ${finalDamage} 피해, 약화 적용 시 ${attackDamage}에서 계산됨)`;


  return { updatedPlayer, updatedSelf, log: logMsg };
};

const genericDefendBehavior: EnemyBehavior['performAction'] = (self, player, intent) => {
  let updatedSelf = { ...self, block: self.block + (intent.value || 0) }; // self.behavior preserved
  updatedSelf.buffs = self.buffs.map(b => ({...b}));
  const logMsg = `${self.name}이(가) ${intent.description}.`;
  return { updatedPlayer: player, updatedSelf, log: logMsg };
};

const genericBuffBehavior: EnemyBehavior['performAction'] = (self, player, intent) => {
    const logMsg = `${self.name}이(가) ${intent.description}`;
    let finalSelfState: EnemyState;

    if (intent.updatedSelfState) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { behavior: _ussBehaviorIgnored, ...dataFromIntentSelf } = intent.updatedSelfState;
        finalSelfState = {
            ...self, 
            ...dataFromIntentSelf, 
        };
        if (intent.updatedSelfState.buffs) {
            finalSelfState.buffs = intent.updatedSelfState.buffs.map(b => ({...b}));
        } else {
            finalSelfState.buffs = self.buffs.map(b => ({...b}));
        }
    } else {
        finalSelfState = { ...self, buffs: self.buffs.map(b => ({...b})) };
    }
    return { updatedPlayer: player, updatedSelf: finalSelfState, log: logMsg };
};


export const GOBLIN_GRUNT_DEF: EnemyDefinition = {
  key: 'GOBLIN_GRUNT',
  name: '고블린 그런트',
  maxHp: 30,
  artUrl: 'https://picsum.photos/seed/goblin/150/150',
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      if (self.buffs.find(b => b.id === 'goblin_alt_attack_indicator')) {
        const newBuffs = self.buffs.filter(b => b.id !== 'goblin_alt_attack_indicator');
        return { type: 'ATTACK', value: 4, description: '4의 피해로 찌르기', updatedSelfState: {...self, buffs: newBuffs} };
      } else {
         const newBuffs = [...self.buffs, {id: 'goblin_alt_attack_indicator', name: '다음 공격 예고', duration: 2, value: 0, description:'', icon:'🗡️'}]; 
        return { type: 'ATTACK', value: 7, description: '7의 피해로 공격', updatedSelfState: {...self, buffs: newBuffs} };
      }
    },
    performAction: genericAttackBehavior,
  }
};

export const SLIME_DEF: EnemyDefinition = {
  key: 'SLIME',
  name: '부식성 슬라임',
  maxHp: 45,
  artUrl: 'https://picsum.photos/seed/slime/150/150',
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      const rand = Math.random();
      if (rand < 0.6) {
        return { type: 'ATTACK', value: 8, description: '8의 피해로 물튀기기' };
      } else {
        return { type: 'DEFEND', value: 6, description: '경화, 6 방어도 획득' };
      }
    },
    performAction: (self, player, intent) => {
      if (intent.type === 'ATTACK') return genericAttackBehavior(self, player, intent);
      if (intent.type === 'DEFEND') return genericDefendBehavior(self, player, intent);
      return { updatedPlayer: player, updatedSelf: self, log: `${self.name}이(가) 혼란스러워 보입니다.` };
    },
  }
};

export const BRUTE_DEF: EnemyDefinition = {
  key: 'BRUTE_BOSS',
  name: '오크 투사 (보스)',
  maxHp: 100,
  artUrl: 'https://picsum.photos/seed/bruteboss/200/200',
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      let updatedSelf = { ...self, buffs: [...self.buffs] };

      if (self.hp < self.maxHp / 2 && !self.buffs.find(b => b.id === 'brute_enraged_strength_applied')) {
        const strengthToAdd = 3;
        const existingStrengthBuffIndex = updatedSelf.buffs.findIndex(b => b.name === '힘');
        if (existingStrengthBuffIndex !== -1) {
            updatedSelf.buffs[existingStrengthBuffIndex].value += strengthToAdd;
        } else {
            updatedSelf.buffs.push({
                id: `str_${Date.now()}`, name: '힘', value: strengthToAdd, duration: -1,
                icon: BUFF_DEFINITIONS['힘'].icon, description: BUFF_DEFINITIONS['힘'].defaultDescription(strengthToAdd, -1)
            });
        }
        updatedSelf.buffs.push({ id: 'brute_enraged_strength_applied', name: '격노함', value: 1, duration: -1, icon: '😡', description: '격노 상태' });
        return { type: 'BUFF', description: '격노하며 힘을 +3 얻습니다!', updatedSelfState: updatedSelf };
      }

      if (self.buffs.find(b => b.id === 'brute_big_next_indicator')) {
         updatedSelf.buffs = updatedSelf.buffs.filter(b => b.id !== 'brute_big_next_indicator');
         return { type: 'ATTACK', value: 15, description: `강타`, updatedSelfState: updatedSelf };
      } else {
         updatedSelf.buffs.push({id: 'brute_big_next_indicator', name: '강력한 공격 예고', duration: 2, value: 0, description:'', icon:'💥'}); 
         return { type: 'ATTACK', value: 8, description: `휘두르기`, updatedSelfState: updatedSelf };
      }
    },
    performAction: (self, player, intent) => {
      if (intent.type === 'ATTACK') return genericAttackBehavior(self, player, intent);
      if (intent.type === 'BUFF') return genericBuffBehavior(self, player, intent);
      return { updatedPlayer: player, updatedSelf: self, log: `${self.name}이(가) 혼란스러워 보입니다.` };
    },
  }
};


export const CULTIST_ACOLYTE_DEF: EnemyDefinition = {
  key: 'CULTIST_ACOLYTE',
  name: '광신도 수련사',
  maxHp: 25,
  artUrl: 'https://picsum.photos/seed/cultist/150/150',
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      const turnCounterBuff = self.buffs.find(b => b.id === 'cultist_turn_cycle');
      const currentTurn = turnCounterBuff?.value || 0;
      let updatedSelf = {...self, buffs: self.buffs.filter(b => b.id !== 'cultist_turn_cycle')};
      updatedSelf.buffs.push({id: 'cultist_turn_cycle', name: '턴 사이클', duration: -1, value: (currentTurn + 1) % 2, description: '', icon: ''});

      if (currentTurn % 2 === 0) {
        return { type: 'ATTACK', value: 5, description: `암흑의 일격`, updatedSelfState: updatedSelf };
      } else {
        const strengthToAdd = 2;
        const existingStrengthBuffIndex = updatedSelf.buffs.findIndex(b => b.name === '힘');
        if (existingStrengthBuffIndex !== -1) {
            updatedSelf.buffs[existingStrengthBuffIndex].value += strengthToAdd;
            updatedSelf.buffs[existingStrengthBuffIndex].description = BUFF_DEFINITIONS['힘'].defaultDescription(updatedSelf.buffs[existingStrengthBuffIndex].value, -1);
        } else {
            updatedSelf.buffs.push({
                id: `str_${self.uiId}_${Date.now()}`, name: '힘', value: strengthToAdd, duration: -1,
                icon: BUFF_DEFINITIONS['힘'].icon, description: BUFF_DEFINITIONS['힘'].defaultDescription(strengthToAdd, -1)
            });
        }
        return { type: 'BUFF', description: '암흑의 주문을 외워 힘을 +2 얻습니다.', updatedSelfState: updatedSelf };
      }
    },
    performAction: (self, player, intent) => {
      if (intent.type === 'ATTACK') return genericAttackBehavior(self, player, intent);
      if (intent.type === 'BUFF') return genericBuffBehavior(self, player, intent);
      return { updatedPlayer: player, updatedSelf: self, log: `${self.name}이(가) 행동을 망설입니다.` };
    },
  }
};

export const SPIKED_SLIME_DEF: EnemyDefinition = {
  key: 'SPIKED_SLIME',
  name: '가시 슬라임',
  maxHp: 40,
  artUrl: 'https://picsum.photos/seed/spikedslime/150/150',
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      const turnCounterBuff = self.buffs.find(b => b.id === 'spiked_turn_cycle');
      const currentTurn = turnCounterBuff?.value || 0;
      let updatedBuffs = self.buffs.filter(b => b.id !== 'spiked_turn_cycle');
      updatedBuffs.push({id: 'spiked_turn_cycle', name: '턴 사이클', duration: -1, value: (currentTurn + 1) % 2, description: '', icon: ''});

      if (currentTurn % 2 === 0) {
        return { type: 'ATTACK', value: 10, description: '부식성 점액 공격', updatedSelfState: {...self, buffs:updatedBuffs} };
      } else {
        return { type: 'DEFEND', value: 8, description: '몸을 굳혀 방어도 획득', updatedSelfState: {...self, buffs:updatedBuffs} };
      }
    },
    performAction: (self, player, intent) => {
      if (intent.type === 'ATTACK') return genericAttackBehavior(self, player, intent);
      if (intent.type === 'DEFEND') return genericDefendBehavior(self, player, intent);
      return { updatedPlayer: player, updatedSelf: self, log: `${self.name}이(가) 꿈틀거립니다.` };
    },
  }
};

export const SENTRY_BOT_DEF: EnemyDefinition = {
  key: 'SENTRY_BOT',
  name: '경비 로봇 (정예)',
  maxHp: 60, 
  artUrl: 'https://picsum.photos/seed/sentrybot_elite/150/150',
  isElite: true,
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      const turnCounterBuff = self.buffs.find(b => b.id === 'sentry_mode_cycle');
      const currentMode = turnCounterBuff?.value || 0;

      let updatedBuffs = self.buffs.filter(b => b.id !== 'sentry_mode_cycle');
      updatedBuffs.push({id: 'sentry_mode_cycle', name: '모드 사이클', duration: -1, value: (currentMode + 1) % 3, description: '', icon: ''});
      const updatedSelf = {...self, buffs: updatedBuffs};

      if (currentMode === 0) {
        return { type: 'ATTACK', value: 8, description: '레이저 발사', updatedSelfState: updatedSelf }; 
      } else if (currentMode === 1) {
        return { type: 'DEFEND', value: 15, description: '강화 방어 태세', updatedSelfState: updatedSelf }; 
      } else {
        return { type: 'ATTACK', value: 12, description: '과충전 빔', updatedSelfState: updatedSelf }; 
      }
    },
    performAction: (self, player, intent) => {
      if (intent.type === 'ATTACK') return genericAttackBehavior(self, player, intent);
      if (intent.type === 'DEFEND') return genericDefendBehavior(self, player, intent);
      return { updatedPlayer: player, updatedSelf: self, log: `${self.name}이(가) 시스템을 점검합니다.` };
    },
  }
};

export const GREMLIN_SCOUT_DEF: EnemyDefinition = {
  key: 'GREMLIN_SCOUT',
  name: '그렘린 정찰병',
  maxHp: 20,
  artUrl: 'https://picsum.photos/seed/gremlinscout/150/150',
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      return { type: 'ATTACK', value: 3, description: '빠르게 두 번 공격' }; // Base damage per hit
    },
     performAction: (self, player, intent) => {
      let updatedPlayer = { ...player };
      let updatedSelf = { ...self };
      updatedPlayer.buffs = player.buffs.map(b => ({...b}));
      updatedSelf.buffs = self.buffs.map(b => ({...b}));

      let totalDamageDealtThisAction = 0;
      let log = `${self.name}이(가) ${intent.description}: `;

      const baseDamagePerHit = intent.value || 0;
      const strength = self.buffs.find(b => b.name === '힘')?.value || 0;
      let damagePerHitWithStrength = baseDamagePerHit + strength;

      const weakStacks = updatedSelf.buffs.find(b => b.name === '약화')?.value || 0;
      if (weakStacks > 0) {
        damagePerHitWithStrength = Math.floor(damagePerHitWithStrength * 0.75); 
        log += `(${self.name} 약화됨!) `;
      }

      for (let i = 0; i < 2; i++) { // Two hits
        let finalDamagePerHit = damagePerHitWithStrength;
        const vulnerableStacks = updatedPlayer.buffs.find(b => b.name === '취약')?.value || 0;
        if (vulnerableStacks > 0) {
          finalDamagePerHit = Math.floor(finalDamagePerHit * 1.5);
        }

        const damageAfterBlock = Math.max(0, finalDamagePerHit - updatedPlayer.block);
        updatedPlayer.hp = Math.max(0, updatedPlayer.hp - damageAfterBlock);
        updatedPlayer.block = Math.max(0, updatedPlayer.block - finalDamagePerHit);
        totalDamageDealtThisAction += damageAfterBlock;
        log += `${i > 0 ? ', ' : ''}${damageAfterBlock} 피해`;
      }
      log += `. 총 ${totalDamageDealtThisAction}의 피해를 입혔습니다.`;
      return { updatedPlayer, updatedSelf, log };
    }
  }
};

export const STONE_GOLEM_DEF: EnemyDefinition = {
  key: 'STONE_GOLEM',
  name: '돌 골렘 (정예)',
  maxHp: 90, 
  artUrl: 'https://picsum.photos/seed/stonegolem_elite/150/150',
  isElite: true,
  behavior: {
    getNextIntent: (self: EnemyState, player: PlayerState): EnemyIntent => {
      const isChargingBuff = self.buffs.find(b => b.id === 'golem_charging_indicator');
      let updatedSelf = {...self, buffs: [...self.buffs]};

      if (isChargingBuff) {
        updatedSelf.buffs = updatedSelf.buffs.filter(b => b.id !== 'golem_charging_indicator');
        return { type: 'ATTACK', value: 25, description: '강력한 내려치기', updatedSelfState: updatedSelf }; 
      } else {
        updatedSelf.buffs.push({id: 'golem_charging_indicator', name: '충전 중', duration: 2, value: 1, description:'다음 턴 강력한 공격', icon: '⏳'}); 
        return { type: 'DEFEND', value: 20, description: '단단해지며 방어도 획득, 힘을 모읍니다.', updatedSelfState: updatedSelf }; 
      }
    },
    performAction: (self, player, intent) => {
      if (intent.type === 'ATTACK') return genericAttackBehavior(self, player, intent);
      if (intent.type === 'DEFEND') return genericDefendBehavior(self, player, intent);
      return { updatedPlayer: player, updatedSelf: self, log: `${self.name}이(가) 미동도 하지 않습니다.` };
    },
  }
};


export const ALL_ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  [GOBLIN_GRUNT_DEF.key]: GOBLIN_GRUNT_DEF,
  [SLIME_DEF.key]: SLIME_DEF,
  [BRUTE_DEF.key]: BRUTE_DEF,
  [CULTIST_ACOLYTE_DEF.key]: CULTIST_ACOLYTE_DEF,
  [SPIKED_SLIME_DEF.key]: SPIKED_SLIME_DEF,
  [SENTRY_BOT_DEF.key]: SENTRY_BOT_DEF,
  [GREMLIN_SCOUT_DEF.key]: GREMLIN_SCOUT_DEF,
  [STONE_GOLEM_DEF.key]: STONE_GOLEM_DEF,
};

export const GAME_MAP_STRUCTURE: MapNodeData[] = [
  { type: 'ENEMY', enemyKeys: [GREMLIN_SCOUT_DEF.key, GREMLIN_SCOUT_DEF.key] },    
  { type: 'ENEMY', enemyKeys: [CULTIST_ACOLYTE_DEF.key] },                       
  { type: 'REST' },                                                              
  { type: 'ENEMY', enemyKeys: [SPIKED_SLIME_DEF.key, GOBLIN_GRUNT_DEF.key] },     
  { type: 'ELITE', enemyKeys: [SENTRY_BOT_DEF.key] },                            
  { type: 'ENEMY', enemyKeys: [GOBLIN_GRUNT_DEF.key, GOBLIN_GRUNT_DEF.key, GOBLIN_GRUNT_DEF.key] }, 
  { type: 'REST' },                                                              
  { type: 'ELITE', enemyKeys: [STONE_GOLEM_DEF.key] },                           
  { type: 'ENEMY', enemyKeys: [CULTIST_ACOLYTE_DEF.key, CULTIST_ACOLYTE_DEF.key] },
  { type: 'BOSS', enemyKeys: [BRUTE_DEF.key], isBoss: true },                    
];