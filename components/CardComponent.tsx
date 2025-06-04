

import React from 'react';
import { Card, CardType, PlayerState } from '../types';
import { 
  GLASS_KNIFE_DEF, RAMPAGE_DEF, MASTERY_BONUS_DAMAGE_PER_LEVEL, MASTERY_BONUS_BLOCK_PER_LEVEL,
  SHIELD_BASH_DEF, BODY_SLAM_DEF, PERFECTED_STRIKE_DEF, FORTIFY_DEF, REAPER_DEF
} from '../constants';


interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  inHand?: boolean;
  showDescriptionSuffix?: boolean; 
  playerCardCombatStats?: PlayerState['cardCombatStats'];
}

const CardComponent: React.FC<CardComponentProps> = ({ 
  card, 
  onClick, 
  isPlayable = false, 
  isSelected = false, 
  inHand = false, 
  showDescriptionSuffix = true,
  playerCardCombatStats 
}) => {
  const cardTypeColor = () => {
    switch (card.type) {
      case CardType.ATTACK: return 'bg-red-700 hover:bg-red-600';
      case CardType.SKILL: return 'bg-sky-700 hover:bg-sky-600';
      case CardType.CURSE: return 'bg-purple-800 hover:bg-purple-700';
      default: return 'bg-slate-700 hover:bg-slate-600';
    }
  };

  const displayCardType = () => {
    switch (card.type) {
      case CardType.ATTACK: return '공격';
      case CardType.SKILL: return '스킬';
      case CardType.CURSE: return '저주';
      default: return card.type;
    }
  };

  const borderColor = isSelected ? 'border-yellow-400' : (isPlayable && card.type !== CardType.CURSE ? 'border-green-500' : 'border-slate-600');
  const cursorStyle = card.type === CardType.CURSE ? 'cursor-not-allowed' : (onClick ? 'cursor-pointer card-hover-effect' : 'cursor-default');

  const displayName = (card.masteryLevel && card.masteryLevel > 0) ? `${card.name} ✨Lvl ${card.masteryLevel}` : card.name;
  let displayDescription = card.description;
  const currentMasteryLevel = card.masteryLevel || 0;

  if (card.definitionId === GLASS_KNIFE_DEF.definitionId && playerCardCombatStats && playerCardCombatStats[GLASS_KNIFE_DEF.definitionId]?.glassKnifeDamage !== undefined) {
    const currentDamage = playerCardCombatStats[GLASS_KNIFE_DEF.definitionId]!.glassKnifeDamage;
    if (currentMasteryLevel > 0 && showDescriptionSuffix) {
      const masteryBonus = currentMasteryLevel * MASTERY_BONUS_DAMAGE_PER_LEVEL;
      displayDescription = `현재 피해량 ${currentDamage}. 마스터 효과로 이 공격에 +${masteryBonus} 피해. 사용하면 다음 피해량 4 감소.`;
    } else {
      displayDescription = `현재 피해량 ${currentDamage}. 전투 중 이 카드를 사용하면 다음부터 피해량이 4 감소합니다.`;
    }
  } else if (card.definitionId === RAMPAGE_DEF.definitionId && playerCardCombatStats) {
    const baseEffectDamage = RAMPAGE_DEF.effects.find(e => e.type === 'DAMAGE')?.value || 0;
    const bonusDamage = playerCardCombatStats[RAMPAGE_DEF.definitionId]?.rampageDamageBonus || 0;
    const currentTurnBaseDamage = baseEffectDamage + bonusDamage;
    if (currentMasteryLevel > 0 && showDescriptionSuffix) {
      const masteryBonus = currentMasteryLevel * MASTERY_BONUS_DAMAGE_PER_LEVEL;
      displayDescription = `현재 ${currentTurnBaseDamage}의 피해를 줍니다. 마스터 효과로 이 공격에 +${masteryBonus} 피해. 다음 사용 시 누적 기본 피해 +5.`;
    } else {
      displayDescription = `${currentTurnBaseDamage}의 피해를 줍니다. 이번 전투에서 이 카드를 사용할 때마다 피해량이 +5 증가합니다.`;
    }
  } else if (currentMasteryLevel > 0 && showDescriptionSuffix) {
    let tempDesc = card.description;
    let modifiedBySpecificLogic = false;
    const totalDamageBonus = currentMasteryLevel * MASTERY_BONUS_DAMAGE_PER_LEVEL;
    const totalBlockBonus = currentMasteryLevel * MASTERY_BONUS_BLOCK_PER_LEVEL;

    // Specific handlers for cards with unique structures or mastery effects
    if (card.definitionId === SHIELD_BASH_DEF.definitionId) {
        tempDesc = `자신의 현재 방어도에 +${totalDamageBonus}을(를) 더한 피해를 줍니다.`;
        modifiedBySpecificLogic = true;
    } else if (card.definitionId === BODY_SLAM_DEF.definitionId) {
        const baseDmg = card.effects.find(e => e.type === 'DAMAGE')?.value || 0;
        tempDesc = `자신의 현재 방어도만큼 추가 피해를 주고, 기본 피해 ${baseDmg + totalDamageBonus}(${baseDmg}+${totalDamageBonus})을(를) 줍니다.`;
        modifiedBySpecificLogic = true;
    } else if (card.definitionId === PERFECTED_STRIKE_DEF.definitionId) {
        const baseDmg = card.effects.find(e => e.type === 'DAMAGE')?.value || 0;
        tempDesc = `기본 피해 ${baseDmg + totalDamageBonus}(${baseDmg}+${totalDamageBonus}). 덱의 "강타" 카드마다 피해 +2.`;
        modifiedBySpecificLogic = true;
    } else if (card.definitionId === FORTIFY_DEF.definitionId) {
        const blockEffectVal = card.effects.find(e => e.type === 'BLOCK')?.value || 0;
        const buffEffect = card.effects.find(e => e.type === 'APPLY_BUFF' && e.buffName === '요새화 (지속)');
        const buffEffectVal = buffEffect?.buffValue || 0;
        tempDesc = `${blockEffectVal + totalBlockBonus}(${blockEffectVal}+${totalBlockBonus})의 방어도를 얻습니다. 다음 턴 시작 시 ${buffEffectVal + totalBlockBonus}(${buffEffectVal}+${totalBlockBonus})의 방어도를 추가로 얻습니다.`;
        modifiedBySpecificLogic = true;
    } else if (card.definitionId === REAPER_DEF.definitionId) {
        const damageEffectVal = card.effects.find(e => e.type === 'DAMAGE')?.value || 0;
        tempDesc = `모든 적에게 ${damageEffectVal + totalDamageBonus}(${damageEffectVal}+${totalDamageBonus})의 피해를 줍니다. 입힌 피해만큼 체력을 회복합니다.`;
        modifiedBySpecificLogic = true;
    } else {
        // General handler using regex for simple "N의 피해/방어도" patterns
        let descBeingModified = tempDesc;
        let regexMadeChanges = false;
        
        card.effects.forEach(effect => {
            if (effect.value === undefined) return;
            
            const originalValue = effect.value;
            let scaledBonus = 0;
            let targetMetric = "";

            if (effect.type === 'DAMAGE') {
                scaledBonus = totalDamageBonus;
                targetMetric = "피해";
            } else if (effect.type === 'BLOCK') {
                scaledBonus = totalBlockBonus;
                targetMetric = "방어도";
            }

            if (scaledBonus > 0 && targetMetric) {
                const masteredValue = originalValue + scaledBonus;
                const pattern = new RegExp(`(\\b)${originalValue}(\\b\\s*의\\s*${targetMetric})`, 'g');
                if (pattern.test(descBeingModified)) {
                    descBeingModified = descBeingModified.replace(pattern, `$1${masteredValue}(${originalValue}+${scaledBonus})$2`);
                    regexMadeChanges = true;
                }
            }
        });

        if (regexMadeChanges) {
            tempDesc = descBeingModified;
            modifiedBySpecificLogic = true; 
        }
    }

    if (!modifiedBySpecificLogic && currentMasteryLevel > 0) { // Ensure mastery level is positive
        tempDesc = card.description + ` (마스터 레벨 ${currentMasteryLevel}: 효과 강화!)`;
    }
    displayDescription = tempDesc;
  }

  return (
    <div
      className={`w-40 h-60 md:w-48 md:h-72 p-3 flex flex-col justify-between rounded-lg shadow-xl text-white transition-all duration-200 ease-in-out ${cardTypeColor()} border-2 ${borderColor} ${cursorStyle} ${inHand ? 'hover:z-10' : ''}`}
      onClick={card.type !== CardType.CURSE ? onClick : undefined}
      title={displayDescription} 
    >
      <div className="flex justify-between items-start">
        <h3 className="text-base md:text-lg font-bold truncate w-5/6" title={displayName}>{displayName}</h3>
        {card.type !== CardType.CURSE && (
            <div className="w-8 h-8 bg-yellow-500 text-slate-900 rounded-full flex items-center justify-center text-lg font-bold border-2 border-yellow-300">
            {card.cost}
            </div>
        )}
      </div>
      
      {card.artUrl && (
        <div className="my-2 h-24 md:h-32 bg-cover bg-center rounded" style={{ backgroundImage: `url(${card.artUrl})` }}>
          {/* Image displayed via background */}
        </div>
      )}
      
      <p className="text-xs md:text-sm leading-tight flex-grow overflow-hidden text-ellipsis" style={{ maxHeight: '5rem' }}>
        {displayDescription}
      </p>
      
      <div className="text-center text-xs font-semibold uppercase mt-1 opacity-80">
        {displayCardType()}
      </div>
    </div>
  );
};

export default CardComponent;