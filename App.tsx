
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, PlayerState, EnemyState, Card, GameScreen, MapNodeData, GameMapNode, TargetType, CardEffect, EnemyDefinition, Buff, CharacterState, EnemyBehavior, CardType, EnemyIntent, GameConclusion } from './types';
import { ALL_ENEMY_DEFINITIONS, INITIAL_PLAYER_DECK_DEFINITIONS, PLAYER_MAX_HP, PLAYER_INITIAL_ENERGY, PLAYER_INITIAL_DRAW_COUNT, INITIAL_GOLD, GAME_MAP_STRUCTURE, ALL_GAME_CARDS, CARD_REWARD_COUNT, BUFF_DEFINITIONS, SHIELD_BASH_DEF, BODY_SLAM_DEF, MAX_ASCENSION_LEVEL, ASCENSION_SETTINGS, CURSE_REGRET_DEF, MASTERY_BONUS_DAMAGE_PER_LEVEL, MASTERY_BONUS_BLOCK_PER_LEVEL, MAX_MASTERED_CARDS, HEADBUTT_DEF, FORTIFY_DEF, PERFECTED_STRIKE_DEF, STRIKE_CARD_DEF, REAPER_DEF, GLASS_KNIFE_DEF, SWORD_BOOMERANG_DEF, RAMPAGE_DEF, GHOSTLY_ARMOR_DEF, TRUE_GRIT_DEF, PANIC_BUTTON_DEF } from './constants';
import { shuffleArray, drawCards, createCardInstance } from './gameLogic/deckUtils';
import CardComponent from './components/CardComponent';
import MinimapComponent from './components/MinimapComponent';
import ModalComponent from './components/ModalComponent'; // Import the new ModalComponent

const SAVE_GAME_KEY = 'deckbuilderAdventureSave';
const MASTERED_CARDS_KEY = 'masteredCardLevels';
const DELEGATED_MODE_KEY = 'delegatedModeActive';
const MAX_UNLOCKED_ASCENSION_KEY = 'maxUnlockedAscensionLevel';

// --- Helper: Initialize Player State ---
const initializePlayer = (ascensionLevel: number): PlayerState => {
  const initialDeckDefs = [...INITIAL_PLAYER_DECK_DEFINITIONS];

  if (ascensionLevel >= 3) {
    initialDeckDefs.push(CURSE_REGRET_DEF);
  }

  const initialDeck = initialDeckDefs.map((def, index) => createCardInstance(def, `initial_${index}`));

  return {
    id: 'player',
    name: '영웅',
    maxHp: PLAYER_MAX_HP,
    hp: PLAYER_MAX_HP,
    block: 0,
    buffs: [],
    energy: PLAYER_INITIAL_ENERGY,
    maxEnergy: PLAYER_INITIAL_ENERGY,
    deck: initialDeck,
    hand: [],
    drawPile: shuffleArray([...initialDeck]),
    discardPile: [],
    exhaustPile: [],
    gold: INITIAL_GOLD,
    cardCombatStats: {},
  };
};

// --- Helper: Initialize Game Map ---
const initializeGameMap = (): GameState['currentMap'] => {
  const floors: GameMapNode[][] = GAME_MAP_STRUCTURE.map((nodeData, floorIndex) => {
    const gameNode: GameMapNode = {
      ...nodeData,
      id: `floor-${floorIndex}-node-0`,
      floor: floorIndex,
      cleared: false,
    };
    return [gameNode];
  });
  return {
    floors,
    currentFloor: 0,
  };
};

interface AnimationTrigger {
  targetId: string;
  effectType: 'enemyHit' | 'playerHit';
}

const getAscensionDescription = (level: number): string => {
    if (level === 0) return "기본 난이도";
    let desc = `승천 ${level} 단계:`;
    if (level >= 1) desc += " 모든 적 체력 +20%";
    if (level >= 2) desc += ", 정예/보스 체력 추가 +25%";
    if (level >= 3) desc += ", 시작 덱에 '후회' 저주 추가";
    return desc;
};

interface ApplyEffectResult {
  updatedPlayer: PlayerState;
  updatedEnemies: EnemyState[];
  log: string;
  damageDealtThisEffect?: number;
  shouldExhaustSelf?: boolean;
}

// --- Main App Component ---
const App: React.FC = () => {
  const addBattleLog = useCallback((message: string) => {
    setGameState(prev => ({ ...prev, battleLog: [message, ...prev.battleLog.slice(0, 19)] }));
  }, []);

  const saveGameState = useCallback((stateToSave: GameState) => {
    try {
      const stateClone = JSON.parse(JSON.stringify(stateToSave));

      stateClone.currentEnemies = stateToSave.currentEnemies.map(liveEnemy => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { behavior, ...serializableEnemyData } = liveEnemy;

        let finalIntent = serializableEnemyData.intent;
        if (finalIntent && finalIntent.updatedSelfState) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { behavior: _ussBehavior, ...ussData } = finalIntent.updatedSelfState;

          let validIntentInUSS: EnemyIntent | null = null;
          if (ussData.intent && typeof ussData.intent.type === 'string' && typeof ussData.intent.description === 'string') {
             validIntentInUSS = {
                ...ussData.intent,
                type: ussData.intent.type as EnemyIntent['type']
             };
          } else if (ussData.intent) {
            // Malformed intent in ussData
          }

          finalIntent.updatedSelfState = {
            ...ussData,
            intent: validIntentInUSS,
            behavior: undefined
          } as EnemyState;
        }
        return { ...serializableEnemyData, id: liveEnemy.id, intent: finalIntent };
      });

      stateClone.player.deck = stateToSave.player.deck.map(card => ({...card}));
      stateClone.player.hand = stateToSave.player.hand.map(card => ({...card}));
      stateClone.player.drawPile = stateToSave.player.drawPile.map(card => ({...card}));
      stateClone.player.discardPile = stateToSave.player.discardPile.map(card => ({...card}));
      stateClone.player.exhaustPile = stateToSave.player.exhaustPile.map(card => ({...card}));
      stateClone.gameConclusion = stateToSave.gameConclusion;

      localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(stateClone));
    } catch (error) {
      console.error("Failed to save game state:", error);
      addBattleLog("게임 저장에 실패했습니다!");
    }
  }, [addBattleLog]);


  const [gameState, setGameState] = useState<GameState>(() => {
    const loadGameStateFromStorage = (): GameState | null => {
      try {
        const savedGameJson = localStorage.getItem(SAVE_GAME_KEY);
        if (!savedGameJson) return null;

        let loadedState = JSON.parse(savedGameJson) as GameState;

        if (!loadedState.player || !loadedState.currentMap || !loadedState.currentScreen) {
          console.warn("저장된 게임 데이터가 유효하지 않습니다. 새 게임을 시작합니다.");
          localStorage.removeItem(SAVE_GAME_KEY);
          return null;
        }

        const masteredCardLevels: Record<string, number> = JSON.parse(localStorage.getItem(MASTERED_CARDS_KEY) || '{}');
        const refreshMastery = (card: Card) => ({
            ...card,
            masteryLevel: masteredCardLevels[card.definitionId] || 0
        });

        loadedState.player.deck = loadedState.player.deck.map(refreshMastery);
        loadedState.player.hand = loadedState.player.hand.map(refreshMastery);
        loadedState.player.drawPile = loadedState.player.drawPile.map(refreshMastery);
        loadedState.player.discardPile = loadedState.player.discardPile.map(refreshMastery);
        loadedState.player.exhaustPile = (loadedState.player.exhaustPile || []).map(refreshMastery);
        loadedState.availableRewards = (loadedState.availableRewards || []).map(refreshMastery);

        if (!loadedState.player.cardCombatStats) {
          loadedState.player.cardCombatStats = {};
        }
         if (!loadedState.player.exhaustPile) {
          loadedState.player.exhaustPile = [];
        }
        loadedState.gameAttemptNumber = loadedState.gameAttemptNumber || 1;


        loadedState.currentEnemies = (loadedState.currentEnemies || []).map((savedEnemyData: any) => {
          const definition = ALL_ENEMY_DEFINITIONS[savedEnemyData.id];
          if (!definition) {
            console.error(`적을 재구성할 수 없습니다. ID에 대한 정의를 찾을 수 없음: ${savedEnemyData.id}`);
            return {
                id: savedEnemyData.id || 'UNKNOWN_ENEMY_ID',
                uiId: savedEnemyData.uiId || `unknown_${Date.now()}`,
                name: "오류 - 알 수 없는 적",
                maxHp: savedEnemyData.maxHp || 1,
                hp: savedEnemyData.hp || 0,
                block: savedEnemyData.block || 0,
                buffs: savedEnemyData.buffs || [],
                behavior: { getNextIntent: () => ({ type: 'UNKNOWN', description: '적 로드 오류' }), performAction: (s,p) => ({updatedPlayer: p, updatedSelf: s, log: '오류'}) },
                intent: { type: 'UNKNOWN', description: '적 로드 오류' },
            } as EnemyState;
          }

          let rehydratedEnemy: EnemyState = {
            id: savedEnemyData.id,
            name: savedEnemyData.name || definition.name,
            maxHp: savedEnemyData.maxHp || definition.maxHp,
            hp: typeof savedEnemyData.hp === 'number' ? savedEnemyData.hp : (definition.maxHp),
            block: typeof savedEnemyData.block === 'number' ? savedEnemyData.block : 0,
            buffs: Array.isArray(savedEnemyData.buffs) ? savedEnemyData.buffs : [],
            uiId: savedEnemyData.uiId,
            behavior: definition.behavior,
            intent: null,
          };

          if (savedEnemyData.intent) {
            let ussForIntent: EnemyState | undefined = undefined;
            if (savedEnemyData.intent.updatedSelfState) {
                const ussDataFromSave = savedEnemyData.intent.updatedSelfState as Omit<EnemyState, 'behavior'>;
                let validIntentInUSS: EnemyIntent | null = null;
                if (ussDataFromSave.intent && typeof ussDataFromSave.intent.type === 'string' && typeof ussDataFromSave.intent.description === 'string') {
                    validIntentInUSS = {
                        ...ussDataFromSave.intent,
                        type: ussDataFromSave.intent.type as EnemyIntent['type']
                    };
                } else if (ussDataFromSave.intent) {
                    // 저장된 ussData의 의도가 잘못됨.
                }
                ussForIntent = {
                    ...ussDataFromSave,
                    intent: validIntentInUSS,
                    behavior: undefined,
                } as EnemyState;
            }

            rehydratedEnemy.intent = {
              type: savedEnemyData.intent.type as EnemyIntent['type'],
              description: savedEnemyData.intent.description,
              value: savedEnemyData.intent.value,
              target: savedEnemyData.intent.target,
              updatedSelfState: ussForIntent,
            };
          }


          if (loadedState.currentScreen === GameScreen.BATTLE && rehydratedEnemy.hp > 0 && loadedState.player.hp > 0 && !rehydratedEnemy.intent) {
            const freshIntent = definition.behavior.getNextIntent(rehydratedEnemy, loadedState.player);
            const baseForUpdate: EnemyState = { ...rehydratedEnemy, intent: freshIntent };

            if (freshIntent.updatedSelfState) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { behavior: _b, ...dataFromIntentSelf } = freshIntent.updatedSelfState;
              rehydratedEnemy = {
                ...baseForUpdate,
                ...dataFromIntentSelf,
                behavior: definition.behavior,
              };
            } else {
              rehydratedEnemy = baseForUpdate;
            }
          }
          return rehydratedEnemy;
        });

        const maxUnlockedAscLvl = parseInt(localStorage.getItem(MAX_UNLOCKED_ASCENSION_KEY) || '0', 10);
        loadedState.gameConclusion = loadedState.gameConclusion || null;

        // --- Ascension and Game State Finalization Logic ---
        const originalLoadedAscension = (typeof loadedState.ascensionLevel === 'number' && !isNaN(loadedState.ascensionLevel))
                                      ? loadedState.ascensionLevel
                                      : maxUnlockedAscLvl; // Default if missing/invalid

        if (loadedState.gameConclusion === 'WIN_BOSS_CLEAR' || loadedState.gameConclusion === 'LOSS' ||
            loadedState.currentScreen === GameScreen.GAME_WON ||
            loadedState.currentScreen === GameScreen.GAME_OVER) {

            loadedState.currentScreen = GameScreen.POST_RUN_MASTERY;
            loadedState.ascensionLevel = originalLoadedAscension; // For display on POST_RUN_MASTERY

            if (!loadedState.player.deck || loadedState.player.deck.length === 0) {
                loadedState.currentScreen = GameScreen.MAP;
                loadedState.ascensionLevel = maxUnlockedAscLvl;
                loadedState.currentMap = initializeGameMap();
                loadedState.currentEncounterNodeId = null;
                loadedState.turn = 0;
                loadedState.currentEnemies = [];
                loadedState.gameConclusion = null;
            }
        } else if (loadedState.currentScreen === GameScreen.POST_RUN_MASTERY) {
            loadedState.ascensionLevel = originalLoadedAscension; // Ensure it shows completed run's ascension
            if (!loadedState.player.deck || loadedState.player.deck.length === 0){
                loadedState.currentScreen = GameScreen.MAP;
                loadedState.ascensionLevel = maxUnlockedAscLvl;
                loadedState.currentMap = initializeGameMap();
                loadedState.currentEncounterNodeId = null;
                loadedState.turn = 0;
                loadedState.currentEnemies = [];
                loadedState.gameConclusion = null;
            }
        } else {
            // Active game state (MAP, BATTLE, REWARD, DECK_VIEW)
            // Use the ascension level as saved in the active game.
            loadedState.ascensionLevel = originalLoadedAscension;
        }
        // --- End of Ascension and Game State Finalization ---


        if (loadedState.currentScreen !== GameScreen.BATTLE &&
            loadedState.currentScreen !== GameScreen.POST_RUN_MASTERY // Keep enemies/turn if loading into post-run with battle data
        ) {
            loadedState.currentEnemies = [];
            loadedState.turn = 0;
        }

        console.log("게임이 성공적으로 로드되었습니다!");
        return loadedState;
      } catch (error) {
        console.error("게임 상태 로드 실패:", error);
        localStorage.removeItem(SAVE_GAME_KEY);
        localStorage.removeItem(MASTERED_CARDS_KEY);
        return null;
      }
    };

    const loadedState = loadGameStateFromStorage();
    if (loadedState) {
      console.log("Loaded game state for useState:", JSON.parse(JSON.stringify(loadedState)));
      return loadedState;
    }

    const currentAscension = parseInt(localStorage.getItem(MAX_UNLOCKED_ASCENSION_KEY) || '0', 10);
    console.log("No saved game or invalid, starting new. Max unlocked ascension for new game:", currentAscension);
    return {
      player: initializePlayer(currentAscension),
      currentEnemies: [],
      currentScreen: GameScreen.MAP,
      currentMap: initializeGameMap(),
      currentEncounterNodeId: null,
      battleLog: [`새로운 게임을 시작합니다. (도전 #1, 승천 ${currentAscension})`],
      turn: 0,
      availableRewards: [],
      ascensionLevel: currentAscension,
      gameConclusion: null,
      gameAttemptNumber: 1,
    };
  });

  const [selectedCardInHand, setSelectedCardInHand] = useState<Card | null>(null);
  const [selectedTargetEnemyId, setSelectedTargetEnemyId] = useState<string | null>(null);
  const [animationTrigger, setAnimationTrigger] = useState<AnimationTrigger | null>(null);
  const [isDelegatedMode, setIsDelegatedMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem(DELEGATED_MODE_KEY);
    return savedMode === 'true';
  });
  const [selectedCardForMastery, setSelectedCardForMastery] = useState<Card | null>(null);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState<boolean>(false);
  const [needsRestart, setNeedsRestart] = useState<boolean>(false);


  useEffect(() => {
    if (gameState.currentScreen !== GameScreen.BATTLE ||
        (gameState.currentScreen === GameScreen.BATTLE && gameState.player.hp > 0 && gameState.currentEnemies.every(e => e.hp <=0)) ||
        (gameState.currentScreen === GameScreen.BATTLE && gameState.player.hp <= 0)
       ) {
      // Auto-saving is handled within setGameState or specific handlers
    }
  }, [gameState, saveGameState]);


  const triggerAnimation = useCallback((targetId: string, effectType: 'enemyHit' | 'playerHit') => {
    setAnimationTrigger({ targetId, effectType });
    setTimeout(() => {
      setAnimationTrigger(null);
    }, 400);
  }, []);

  const calculateDamage = useCallback((baseDamage: number, attacker: CharacterState, defender: CharacterState): number => {
    let finalDamage = baseDamage;
    const strength = attacker.buffs.find(b => b.name === '힘')?.value || 0;
    finalDamage += strength;

    const vulnerableStacks = defender.buffs.find(b => b.name === '취약')?.value || 0;
    if (vulnerableStacks > 0) {
      finalDamage = Math.floor(finalDamage * 1.5);
    }
    return Math.max(0, finalDamage);
  }, []);

  const applyBuff = (target: CharacterState, buffEffect: CardEffect, sourceCharId?: string, sourceCardId?: string, sourceCardMasteryLevel?: number): CharacterState => {
    const newTarget = JSON.parse(JSON.stringify(target)) as CharacterState;
    const { buffName, buffDuration = 0 } = buffEffect;
    let buffValue = buffEffect.buffValue || 0;

    if (!buffName) return newTarget;

    if ((sourceCardMasteryLevel || 0) > 0 && sourceCardId === FORTIFY_DEF.definitionId && buffName === '요새화 (지속)') {
        buffValue += (sourceCardMasteryLevel || 0) * MASTERY_BONUS_BLOCK_PER_LEVEL;
    }

    const existingBuffIndex = newTarget.buffs.findIndex(b => b.name === buffName);
    const buffDef = BUFF_DEFINITIONS[buffName] || { icon: '?', defaultDescription: (v:number,d:number) => `${buffName} ${v} (${d}턴)`};

    if (existingBuffIndex !== -1) {
        const existingBuff = newTarget.buffs[existingBuffIndex];
        if (buffName === '힘') {
            existingBuff.value += buffValue;
        } else {
            existingBuff.value = Math.max(existingBuff.value, buffValue);
        }
        existingBuff.duration = Math.max(existingBuff.duration, buffDuration);
        existingBuff.description = buffDef.defaultDescription(existingBuff.value, existingBuff.duration);

    } else {
        newTarget.buffs.push({
            id: `${buffName}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            name: buffName,
            value: buffValue,
            duration: buffDuration,
            icon: buffDef.icon,
            description: buffDef.defaultDescription(buffValue, buffDuration),
            sourceCharacterId: sourceCharId,
            sourceCardId: sourceCardId,
        });
    }
    return newTarget;
  };

  const applyCardEffect = useCallback((
    card: Card,
    effect: CardEffect,
    cardTargetType: TargetType,
    targetEnemyUiId: string | null,
    actingPlayer: PlayerState,
    currentEnemies: EnemyState[],
    cumulativeCardExecutionValue?: number
  ): ApplyEffectResult => {
    let newPlayerState = JSON.parse(JSON.stringify(actingPlayer)) as PlayerState;
    let newEnemiesList = currentEnemies.map(enemy => {
        const enemyDef = ALL_ENEMY_DEFINITIONS[enemy.id];
        const behavior = enemyDef ? enemyDef.behavior : enemy.behavior;
        return {
            ...JSON.parse(JSON.stringify(enemy)),
            behavior: behavior,
        } as EnemyState;
    });

    let log = "";
    let damageDealtThisEffect = 0;
    let shouldExhaustSelfThisEffect = false;
    const effectActualTarget = effect.target || cardTargetType;
    const cardMasteryLevel = card.masteryLevel || 0;

    switch (effect.type) {
      case 'DAMAGE': {
        let cardDefinedBaseDamage = effect.value || 0;
        let dynamicBonusDamage = 0;
        let logSpecificMechanics = "";

        if (card.definitionId === SHIELD_BASH_DEF.definitionId) {
            dynamicBonusDamage = newPlayerState.block;
            logSpecificMechanics = `방패 가격이 방어도(${newPlayerState.block})만큼 피해를 준비합니다. `;
            cardDefinedBaseDamage = 0;
        } else if (card.definitionId === BODY_SLAM_DEF.definitionId) {
            dynamicBonusDamage = newPlayerState.block;
            logSpecificMechanics = `몸통 박치기가 기본 피해(${cardDefinedBaseDamage})에 방어도(${newPlayerState.block})를 더해 피해를 준비합니다. `;
        } else if (card.definitionId === PERFECTED_STRIKE_DEF.definitionId) {
            cardDefinedBaseDamage = 6;
            const allPlayerCards = [
                ...newPlayerState.deck, ...newPlayerState.hand,
                ...newPlayerState.drawPile, ...newPlayerState.discardPile, ...newPlayerState.exhaustPile
            ];
            const strikeCount = allPlayerCards.filter(c => c.definitionId === STRIKE_CARD_DEF.definitionId).length;
            const strikeBonus = strikeCount * 2;
            dynamicBonusDamage = strikeBonus;
            logSpecificMechanics = `완벽한 일격이 기본 피해(${cardDefinedBaseDamage})에 강타 카드 ${strikeCount}장으로 +${strikeBonus}의 추가 피해를 얻습니다. `;
        } else if (card.definitionId === GLASS_KNIFE_DEF.definitionId) {
            const currentGlassKnifeDmg = newPlayerState.cardCombatStats[GLASS_KNIFE_DEF.definitionId]?.glassKnifeDamage;
            if (currentGlassKnifeDmg !== undefined) {
                cardDefinedBaseDamage = currentGlassKnifeDmg;
            } else {
                newPlayerState.cardCombatStats[GLASS_KNIFE_DEF.definitionId] = {
                    ...(newPlayerState.cardCombatStats[GLASS_KNIFE_DEF.definitionId] || {}),
                    glassKnifeDamage: cardDefinedBaseDamage
                };
            }
            logSpecificMechanics = `유리 칼이 현재 피해량(${cardDefinedBaseDamage})으로 공격합니다. `;
        } else if (card.definitionId === RAMPAGE_DEF.definitionId) {
            const currentRampageBonus = newPlayerState.cardCombatStats[RAMPAGE_DEF.definitionId]?.rampageDamageBonus || 0;
            dynamicBonusDamage = currentRampageBonus;
            logSpecificMechanics = `광란이 기본 피해(${cardDefinedBaseDamage})에 현재 누적된 추가 피해(${currentRampageBonus})를 더해 공격합니다. `;
        }


        let damagePreMastery = cardDefinedBaseDamage + dynamicBonusDamage;
        let logMastery = "";
        if (cardMasteryLevel > 0) {
            const masteryDamageBonus = cardMasteryLevel * MASTERY_BONUS_DAMAGE_PER_LEVEL;
            damagePreMastery += masteryDamageBonus;
            logMastery = `마스터리(LvL ${cardMasteryLevel}) 효과로 추가 피해 +${masteryDamageBonus}! `;
        }
        const finalOffensiveBaseDamage = damagePreMastery;
        log = `${logSpecificMechanics}${logMastery}`;

        let actualTargetsForThisDamageEffect: EnemyState[] = [];
        const livingEnemies = newEnemiesList.filter(e => e.hp > 0);

        if (card.definitionId === SWORD_BOOMERANG_DEF.definitionId) {
            if (livingEnemies.length > 0) {
                const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                actualTargetsForThisDamageEffect.push(randomEnemy);
                log += `${card.name}(이)가 무작위 대상 ${randomEnemy.name}을(를) 공격 준비 (기본 공격력: ${finalOffensiveBaseDamage}). `;
            } else {
                log += `${card.name}: 공격할 살아있는 적이 없습니다. `;
            }
        } else if (effectActualTarget === TargetType.ALL_ENEMIES) {
            actualTargetsForThisDamageEffect = livingEnemies;
            if (livingEnemies.length > 0) {
                 log += `플레이어가 ${card.name}(으)로 모든 적을 공격합니다 (기본 공격력: ${finalOffensiveBaseDamage}): `;
            } else {
                 log += `${card.name}: 공격할 살아있는 적이 없습니다. `;
            }
        } else if (effectActualTarget === TargetType.SINGLE_ENEMY && targetEnemyUiId) {
            const singleTarget = newEnemiesList.find(e => e.uiId === targetEnemyUiId && e.hp > 0);
            if (singleTarget) {
                actualTargetsForThisDamageEffect.push(singleTarget);
            } else {
                log += `${card.name}: 유효한 단일 대상(${targetEnemyUiId})을 찾을 수 없거나 이미 처치되었습니다. `;
            }
        } else {
             log += `${card.name}: 데미지 효과에 대한 대상 지정 방식(${effectActualTarget})이 처리되지 않았거나 대상 정보가 없습니다.`;
        }

        actualTargetsForThisDamageEffect.forEach(targetEnemyInstance => {
            const enemyIdx = newEnemiesList.findIndex(e => e.uiId === targetEnemyInstance.uiId);
            if (enemyIdx === -1) return;

            let enemyToDamage = newEnemiesList[enemyIdx];
            const enemyHpBeforeDamage = enemyToDamage.hp;
            const actualDamageToDeal = calculateDamage(finalOffensiveBaseDamage, newPlayerState, enemyToDamage);
            let damageDealtAfterBlockConsideration;
            let hitSpecificLog = "";

            if (card.definitionId !== SWORD_BOOMERANG_DEF.definitionId &&
                (effectActualTarget === TargetType.SINGLE_ENEMY || actualTargetsForThisDamageEffect.length === 1)) {
                hitSpecificLog = `플레이어가 ${enemyToDamage.name}에게 `;
            } else if (card.definitionId === SWORD_BOOMERANG_DEF.definitionId) {
                // Already logged
            } else {
                hitSpecificLog = `${enemyToDamage.name}에게 `;
            }

            if (effect.ignoresBlock) {
                damageDealtAfterBlockConsideration = actualDamageToDeal;
                enemyToDamage.hp = Math.max(0, enemyToDamage.hp - damageDealtAfterBlockConsideration);
                hitSpecificLog += `방어도를 무시하고 ${damageDealtAfterBlockConsideration}의 피해를 입혔습니다 (계산된 공격력: ${finalOffensiveBaseDamage}). `;
            } else {
                damageDealtAfterBlockConsideration = Math.max(0, actualDamageToDeal - enemyToDamage.block);
                enemyToDamage.hp = Math.max(0, enemyToDamage.hp - damageDealtAfterBlockConsideration);
                enemyToDamage.block = Math.max(0, enemyToDamage.block - actualDamageToDeal);
                hitSpecificLog += `${damageDealtAfterBlockConsideration}의 피해를 입혔습니다 (총 ${actualDamageToDeal} 피해 계산 후 적용, 기본 공격력 ${finalOffensiveBaseDamage}에서 시작). `;
            }
            log += hitSpecificLog;

            const actualHpLoss = enemyHpBeforeDamage - enemyToDamage.hp;
            if (actualHpLoss > 0) damageDealtThisEffect += actualHpLoss;

            if (enemyToDamage.hp === 0) {
                log += `${enemyToDamage.name}을(를) 처치했습니다! `;
            }
            if (damageDealtAfterBlockConsideration > 0 && enemyHpBeforeDamage > enemyToDamage.hp) {
                triggerAnimation(enemyToDamage.uiId, 'enemyHit');
            }
            newEnemiesList[enemyIdx] = enemyToDamage;
        });
        break;
      }
      case 'BLOCK':
        let blockValue = effect.value || 0;
        if (cardMasteryLevel > 0) {
            const masteryBlockBonus = cardMasteryLevel * MASTERY_BONUS_BLOCK_PER_LEVEL;
            if (card.definitionId === TRUE_GRIT_DEF.definitionId ||
                card.definitionId === GHOSTLY_ARMOR_DEF.definitionId ||
                card.definitionId === PANIC_BUTTON_DEF.definitionId ||
                card.definitionId === FORTIFY_DEF.definitionId
               ) {
                blockValue += masteryBlockBonus;
                log += `마스터리(LvL ${cardMasteryLevel}) 효과로 ${card.name} 방어도 +${masteryBlockBonus}! `;
            } else {
                 blockValue += masteryBlockBonus;
                 log += `마스터리(LvL ${cardMasteryLevel}) 효과로 방어도 +${masteryBlockBonus}! `;
            }
        }
        newPlayerState.block += blockValue;
        log += `플레이어가 ${blockValue}의 방어도를 얻었습니다.`;
        break;
      case 'DRAW':
        const { updatedPlayer: playerAfterDraw } = drawCards(newPlayerState, effect.value || 0);
        newPlayerState = playerAfterDraw;
        log = `플레이어가 카드 ${effect.value}장을 뽑았습니다.`;
        break;
      case 'GAIN_ENERGY':
        newPlayerState.energy += effect.value || 0;
        log = `플레이어가 에너지 ${effect.value}를 얻었습니다.`;
        break;
      case 'HEAL':
         let actualHealVal = effect.value || 0;
         if (card.definitionId === REAPER_DEF.definitionId && cumulativeCardExecutionValue !== undefined) {
            actualHealVal = cumulativeCardExecutionValue;
         }

         if (effectActualTarget === TargetType.SELF || targetEnemyUiId === null) {
            const hpBeforeHeal = newPlayerState.hp;
            newPlayerState.hp = Math.min(newPlayerState.maxHp, newPlayerState.hp + actualHealVal);
            const healedAmount = newPlayerState.hp - hpBeforeHeal;

            if (card.definitionId === REAPER_DEF.definitionId) {
                log = `플레이어가 사신 효과로 총 입힌 피해(${cumulativeCardExecutionValue})만큼 체력 ${healedAmount}을(를) 회복했습니다.`;
            } else {
                log = actualHealVal > 0 ? `플레이어가 체력 ${healedAmount}를 회복했습니다.` : `플레이어가 체력 ${Math.abs(actualHealVal)}를 잃었습니다.`;
            }
         }
        break;
      case 'APPLY_BUFF':
        let specificBuffLog = "";
        if (cardMasteryLevel > 0 && card.definitionId === FORTIFY_DEF.definitionId && effect.buffName === '요새화 (지속)') {
             const masteryBuffBonus = cardMasteryLevel * MASTERY_BONUS_BLOCK_PER_LEVEL;
             specificBuffLog += `마스터리(LvL ${cardMasteryLevel}) 효과로 지속 방어도 +${masteryBuffBonus}! `;
        }
        log += specificBuffLog;

        if (effectActualTarget === TargetType.ALL_ENEMIES) {
            log += `플레이어가 ${card.name}(으)로 모든 적에게 '${effect.buffName}' 효과를 적용합니다: `;
            let anyEnemyAffected = false;
            newEnemiesList.forEach((enemyToBuff, index) => {
                if (enemyToBuff.hp > 0) {
                    anyEnemyAffected = true;
                    const originalEnemy = newEnemiesList[index];
                    const enemyDataAfterBuff = applyBuff(originalEnemy, effect, newPlayerState.id, card.id, cardMasteryLevel);
                    newEnemiesList[index] = {
                        ...originalEnemy,
                        ...enemyDataAfterBuff,
                    };
                    log += `${newEnemiesList[index].name}에게 적용. `;
                }
            });
            if (!anyEnemyAffected) {
                log += "효과를 적용할 살아있는 적이 없습니다.";
            }
        } else if (effectActualTarget === TargetType.SELF) {
            newPlayerState = applyBuff(newPlayerState, effect, newPlayerState.id, card.id, cardMasteryLevel) as PlayerState;
            log += `플레이어가 스스로에게 '${effect.buffName}' 효과를 적용했습니다.`;
        } else if (effectActualTarget === TargetType.SINGLE_ENEMY && targetEnemyUiId) {
            const enemyIdx = newEnemiesList.findIndex(e => e.uiId === targetEnemyUiId);
            if (enemyIdx !== -1 && newEnemiesList[enemyIdx].hp > 0) {
                const originalEnemy = newEnemiesList[enemyIdx];
                const enemyDataAfterBuff = applyBuff(originalEnemy, effect, newPlayerState.id, card.id, cardMasteryLevel);
                newEnemiesList[enemyIdx] = {
                    ...originalEnemy,
                    ...enemyDataAfterBuff,
                };
                log += `${newEnemiesList[enemyIdx].name}에게 '${effect.buffName}' 효과를 적용했습니다.`;
            } else {
                log += `버프를 적용할 유효한 적 대상이 없습니다.`;
            }
        } else {
             log += `버프 효과 '${effect.buffName}'에 적절한 대상이 지정되지 않았습니다.`;
        }
        break;
      case 'RETRIEVE_FROM_DISCARD_TO_DRAW_TOP':
        if (newPlayerState.discardPile.length > 0) {
            const cardToRetrieve = newPlayerState.discardPile.shift();
            if (cardToRetrieve) {
                newPlayerState.drawPile.unshift(cardToRetrieve);
                log = `플레이어가 버린 카드 더미에서 '${cardToRetrieve.name}'을(를) 가져와 뽑을 카드 더미 맨 위에 놓았습니다.`;
            } else {
                 log = `버린 카드 더미에서 카드를 가져오는데 실패했습니다.`;
            }
        } else {
            log = "버린 카드 더미가 비어 있어 카드를 가져올 수 없습니다.";
        }
        break;
      case 'DISCARD_HAND_RANDOM':
        const numToDiscard = effect.value || 0;
        let discardedCount = 0;
        let discardedCardNames: string[] = [];
        if (newPlayerState.hand.length > 0 && numToDiscard > 0) {
            for (let i = 0; i < numToDiscard; i++) {
                if (newPlayerState.hand.length === 0) break;
                const randomIndex = Math.floor(Math.random() * newPlayerState.hand.length);
                const cardToDiscard = newPlayerState.hand.splice(randomIndex, 1)[0];
                if (cardToDiscard) {
                    newPlayerState.discardPile.push(cardToDiscard);
                    discardedCardNames.push(cardToDiscard.name);
                    discardedCount++;
                }
            }
            log = `플레이어가 손에서 무작위로 카드 ${discardedCount}장을 버렸습니다: ${discardedCardNames.join(', ')}.`;
        } else if (numToDiscard > 0) {
            log = "버릴 카드가 손에 없습니다.";
        } else {
            log = "무작위 카드 버리기 효과가 0으로 설정되었습니다.";
        }
        break;
      case 'REMOVE_ALL_BLOCK':
        if (effectActualTarget === TargetType.ALL_ENEMIES) {
            log += `플레이어가 ${card.name}(으)로 모든 적의 방어도를 제거합니다: `;
            let anyEnemyAffected = false;
            newEnemiesList.forEach((enemy, index) => {
                if (enemy.hp > 0 && enemy.block > 0) {
                    anyEnemyAffected = true;
                    log += `${enemy.name}의 방어도 ${enemy.block} 제거. `;
                    newEnemiesList[index].block = 0;
                } else if (enemy.hp > 0 && enemy.block === 0) {
                  anyEnemyAffected = true;
                  log += `${enemy.name}은(는) 방어도가 없습니다. `;
                }
            });
            if (!anyEnemyAffected) {
                log += "효과를 적용할 살아있는 적이 없거나, 대상 적들이 방어도를 가지고 있지 않습니다.";
            }
        } else if (effectActualTarget === TargetType.SINGLE_ENEMY && targetEnemyUiId) {
          const enemyIdx = newEnemiesList.findIndex(e => e.uiId === targetEnemyUiId);
          if (enemyIdx !== -1 && newEnemiesList[enemyIdx].hp > 0) {
            const enemyToModify = newEnemiesList[enemyIdx];
            if (enemyToModify.block > 0) {
                log += `플레이어가 ${enemyToModify.name}의 방어도 ${enemyToModify.block}을(를) 모두 제거했습니다.`;
                enemyToModify.block = 0;
            } else {
                log += `${enemyToModify.name}은(는) 방어도가 없습니다.`;
            }
          } else {
            log += `방어도를 제거할 유효한 단일 대상이 없습니다.`;
          }
        } else {
          log += `방어도 제거 효과에 적절한 대상이 지정되지 않았습니다.`;
        }
        break;
      case 'EXHAUST_SELF':
        log = `플레이어가 ${card.name} 카드를 소멸시킵니다.`;
        shouldExhaustSelfThisEffect = true;
        break;
      case 'EXHAUST_FROM_HAND_RANDOM':
        const numToExhaust = effect.value || 0;
        let exhaustedCount = 0;
        let exhaustedCardNames: string[] = [];
        if (newPlayerState.hand.length > 0 && numToExhaust > 0) {
            for (let i = 0; i < numToExhaust; i++) {
                if (newPlayerState.hand.length === 0) break;
                const randomIndex = Math.floor(Math.random() * newPlayerState.hand.length);
                const cardToExhaust = newPlayerState.hand.splice(randomIndex, 1)[0];
                if (cardToExhaust) {
                    newPlayerState.exhaustPile.push(cardToExhaust);
                    exhaustedCardNames.push(cardToExhaust.name);
                    exhaustedCount++;
                }
            }
            log = `플레이어가 손에서 무작위로 카드 ${exhaustedCount}장을 소멸시켰습니다: ${exhaustedCardNames.join(', ')}.`;
        } else if (numToExhaust > 0) {
            log = "소멸시킬 카드가 손에 없습니다.";
        } else {
            log = "무작위 카드 소멸 효과가 0으로 설정되었습니다.";
        }
        break;
    }
    return { updatedPlayer: newPlayerState, updatedEnemies: newEnemiesList, log, damageDealtThisEffect, shouldExhaustSelf: shouldExhaustSelfThisEffect };
  }, [calculateDamage, triggerAnimation, applyBuff]);

  const handleBattleWin = useCallback(() => {
    addBattleLog("승리!");

    const eligibleCardDefinitionsForReward = ALL_GAME_CARDS.filter(cDef => {
      const countInDeck = gameState.player.deck.filter(dCard => dCard.definitionId === cDef.definitionId).length;
      return countInDeck < 5 && (cDef.rarity === 'COMMON' || cDef.rarity === 'UNCOMMON' || cDef.rarity === 'RARE');
    });

    const rewards: Card[] = [];
    if (eligibleCardDefinitionsForReward.length > 0) {
      const rewardPoolCopy = [...eligibleCardDefinitionsForReward];
      for (let i = 0; i < CARD_REWARD_COUNT && rewardPoolCopy.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * rewardPoolCopy.length);
        rewards.push(createCardInstance(rewardPoolCopy[randomIndex], `reward_${i}_${Date.now()}`));
        rewardPoolCopy.splice(randomIndex, 1);
      }
    }

    const newMap = JSON.parse(JSON.stringify(gameState.currentMap)) as GameState['currentMap'];
    const nodeFloorIndex = gameState.currentMap.floors.findIndex(f => f.some(n => n.id === gameState.currentEncounterNodeId));
    if (nodeFloorIndex !== -1) {
        const nodeIndexInFloor = newMap.floors[nodeFloorIndex].findIndex(n => n.id === gameState.currentEncounterNodeId);
        if (nodeIndexInFloor !== -1) {
            newMap.floors[nodeFloorIndex][nodeIndexInFloor].cleared = true;
        }
    }
    const nextFloor = gameState.currentMap.currentFloor + 1;

    const runAscension = gameState.ascensionLevel;
    let maxUnlocked = parseInt(localStorage.getItem(MAX_UNLOCKED_ASCENSION_KEY) || '0', 10);

    const currentMapNodeDefinition = GAME_MAP_STRUCTURE.find((_, index) => index === gameState.currentMap.currentFloor);
    const nodeIsBoss = currentMapNodeDefinition?.isBoss === true;
    let gameConclusionForState: GameConclusion = null;

    if (nodeIsBoss) {
        gameConclusionForState = 'WIN_BOSS_CLEAR';
        if (runAscension === maxUnlocked && runAscension < MAX_ASCENSION_LEVEL) {
            maxUnlocked++;
            localStorage.setItem(MAX_UNLOCKED_ASCENSION_KEY, maxUnlocked.toString());
            addBattleLog(`승천 ${maxUnlocked} 단계 해금! 다음 게임부터 적용됩니다.`);
        }
    }

    const playerAfterCombat: PlayerState = {
        ...gameState.player,
        buffs:[],
        block: 0,
        cardCombatStats: {},
        exhaustPile: []
    };

    if (nodeIsBoss || nextFloor >= newMap.floors.length) {
        let battleLogMessages = ["승리!", ...gameState.battleLog.slice(0,19)];
        if (rewards.length === 0 && gameConclusionForState === 'WIN_BOSS_CLEAR') { // Only add if it's a boss win and no rewards
             battleLogMessages = ["승리!", "획득할 수 있는 카드 보상이 없습니다.", ...gameState.battleLog.slice(0,18)];
        }
        const gameWonState: GameState = {
            ...gameState,
            player: playerAfterCombat,
            currentScreen: GameScreen.GAME_WON,
            currentMap: {...newMap, currentFloor: nextFloor},
            currentEnemies: [],
            battleLog: battleLogMessages.slice(0,20),
            gameConclusion: gameConclusionForState, // This carries the original ascension level of the completed run
        };
        setGameState(gameWonState);
        saveGameState(gameWonState);
        return;
    }

    if (rewards.length > 0) {
        const rewardState: GameState = {
          ...gameState,
          player: playerAfterCombat,
          currentScreen: GameScreen.REWARD,
          availableRewards: rewards,
          currentMap: {...newMap, currentFloor: nextFloor},
          currentEnemies: [],
          battleLog: ["승리! 보상을 선택하세요.", ...gameState.battleLog.slice(0,18)],
          gameConclusion: null, // Not a full game conclusion yet if not boss
        };
        setGameState(rewardState);
        saveGameState(rewardState);
    } else {
        addBattleLog("획득할 수 있는 카드 보상이 없습니다.");
        const mapState: GameState = {
          ...gameState,
          player: playerAfterCombat,
          currentScreen: GameScreen.MAP,
          currentMap: {...newMap, currentFloor: nextFloor},
          currentEnemies: [],
          battleLog: ["획득할 수 있는 카드 보상이 없습니다. 맵으로 이동합니다.", ...gameState.battleLog.slice(0,18)],
          gameConclusion: null,
        };
        setGameState(mapState);
        saveGameState(mapState);
    }
  }, [gameState, addBattleLog, saveGameState]);

  const handlePlayCard = useCallback((card: Card, targetEnemyUiIdParam?: string) => {
    if (card.type === CardType.CURSE) {
        addBattleLog(`${card.name} 카드는 사용할 수 없습니다.`);
        return;
    }
    if (gameState.player.energy < card.cost) {
      addBattleLog("에너지가 부족합니다!");
      return;
    }

    let newPlayerState = {
        ...gameState.player,
        energy: gameState.player.energy - card.cost,
        buffs: gameState.player.buffs.map(b => ({...b})),
        hand: gameState.player.hand.filter(c => c.id !== card.id),
        discardPile: [...gameState.player.discardPile, card],
        exhaustPile: [...gameState.player.exhaustPile],
        cardCombatStats: { ...gameState.player.cardCombatStats },
    };

    addBattleLog(`플레이어가 ${card.name} 카드를 사용합니다.`);

    let currentEnemiesState = gameState.currentEnemies.map(e => ({...e, buffs: e.buffs.map(b => ({...b}))}));
    let totalDamageAccumulatedForCard = 0;
    let cardShouldBeExhausted = false;

    for (const effect of card.effects) {
        const effectResult = applyCardEffect(
          card,
          effect,
          effect.target || card.targetType,
          targetEnemyUiIdParam,
          newPlayerState,
          currentEnemiesState,
          totalDamageAccumulatedForCard
        );

        newPlayerState = effectResult.updatedPlayer;
        currentEnemiesState = effectResult.updatedEnemies;
        addBattleLog(effectResult.log);

        if (effectResult.damageDealtThisEffect && effectResult.damageDealtThisEffect > 0) {
            totalDamageAccumulatedForCard += effectResult.damageDealtThisEffect;
        }
        if (effectResult.shouldExhaustSelf) {
            cardShouldBeExhausted = true;
        }
    }

    if (cardShouldBeExhausted) {
        newPlayerState.discardPile = newPlayerState.discardPile.filter(c => c.id !== card.id);
        newPlayerState.exhaustPile = [...newPlayerState.exhaustPile, card];
    }

    if (card.definitionId === GLASS_KNIFE_DEF.definitionId) {
        const glassKnifeStats = newPlayerState.cardCombatStats[GLASS_KNIFE_DEF.definitionId];
        let currentDamage = glassKnifeStats?.glassKnifeDamage ?? GLASS_KNIFE_DEF.effects.find(e => e.type === 'DAMAGE')?.value ?? 12;
        const reducedDamage = Math.max(0, currentDamage - 4);
        newPlayerState.cardCombatStats[GLASS_KNIFE_DEF.definitionId] = {
            ...(newPlayerState.cardCombatStats[GLASS_KNIFE_DEF.definitionId] || {}),
            glassKnifeDamage: reducedDamage
        };
        if (currentDamage > 0) {
             addBattleLog(`유리 칼의 다음 피해량이 ${reducedDamage}(으)로 감소합니다.`);
        }
    } else if (card.definitionId === RAMPAGE_DEF.definitionId) {
        const currentBonus = newPlayerState.cardCombatStats[RAMPAGE_DEF.definitionId]?.rampageDamageBonus || 0;
        const newBonus = currentBonus + 5;
        newPlayerState.cardCombatStats[RAMPAGE_DEF.definitionId] = {
             ...(newPlayerState.cardCombatStats[RAMPAGE_DEF.definitionId] || {}),
            rampageDamageBonus: newBonus
        };
        addBattleLog(`광란 카드의 다음 사용 시 추가 피해가 +${newBonus - currentBonus} 증가하여 총 +${newBonus}가 됩니다.`);
    }

    const remainingEnemies = currentEnemiesState.filter(e => e.hp > 0);
    setGameState(prev => ({
        ...prev,
        player: newPlayerState,
        currentEnemies: remainingEnemies,
    }));

    if (remainingEnemies.length === 0 && gameState.currentScreen === GameScreen.BATTLE) {
        handleBattleWin();
    }

    setSelectedCardInHand(null);
    setSelectedTargetEnemyId(null);

  }, [gameState.player, gameState.currentEnemies, gameState.currentScreen, addBattleLog, applyCardEffect, handleBattleWin]);

  const processEndOfTurnBuffs = (character: CharacterState): CharacterState => {
    const newCharacter = JSON.parse(JSON.stringify(character)) as CharacterState;
    newCharacter.buffs = newCharacter.buffs.map(buff => {
        if (buff.duration > 0) {
            buff.duration -= 1;
        }
        const buffDef = BUFF_DEFINITIONS[buff.name];
        if(buffDef) buff.description = buffDef.defaultDescription(buff.value, buff.duration);
        return buff;
    }).filter(buff => buff.duration !== 0);
    return newCharacter;
  };

  const handleEndTurn = useCallback(() => {
    const currentBattleLog = [...gameState.battleLog]; // Capture current battle log
    const endTurnLog = "플레이어가 턴을 종료합니다.";
    const enemyTurnStartLog = "적의 턴 시작...";

    let playerStateAfterPlayerTurnEnd = { ...gameState.player };
    playerStateAfterPlayerTurnEnd.discardPile = [...playerStateAfterPlayerTurnEnd.discardPile, ...playerStateAfterPlayerTurnEnd.hand];
    playerStateAfterPlayerTurnEnd.hand = [];

    const ghostlyArmorBuffActive = playerStateAfterPlayerTurnEnd.buffs.find(b => b.name === '유령 갑옷 지속' && b.duration > 0);
    if (!ghostlyArmorBuffActive) {
        playerStateAfterPlayerTurnEnd.block = 0;
    }
    playerStateAfterPlayerTurnEnd = processEndOfTurnBuffs(playerStateAfterPlayerTurnEnd) as PlayerState;

    setGameState(prev => ({
        ...prev,
        player: playerStateAfterPlayerTurnEnd,
        battleLog: [enemyTurnStartLog, endTurnLog, ...currentBattleLog.slice(0,18)]
    }));

    let enemyActionPromise = Promise.resolve();
    const enemyActionLogs: string[] = [];

    let currentEnemiesForActions = gameState.currentEnemies.map(originalEnemy => {
      const enemyDef = ALL_ENEMY_DEFINITIONS[originalEnemy.id];
      const behavior = enemyDef ? enemyDef.behavior : originalEnemy.behavior;
      const enemyDataCopy = JSON.parse(JSON.stringify(originalEnemy));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { behavior: _b, ...restOfData } = enemyDataCopy;
      return { ...restOfData, id: originalEnemy.id, behavior } as EnemyState;
    });

    let playerStateForEnemyActions = JSON.parse(JSON.stringify(playerStateAfterPlayerTurnEnd)) as PlayerState;

    currentEnemiesForActions.forEach((enemy, index) => {
      enemyActionPromise = enemyActionPromise.then(() => new Promise(resolve => {
        setTimeout(() => {
          const currentActingEnemyState = currentEnemiesForActions[index];
          if (currentActingEnemyState.hp > 0 && playerStateForEnemyActions.hp > 0) {
            const intent = currentActingEnemyState.intent;
            if (intent && currentActingEnemyState.behavior && typeof currentActingEnemyState.behavior.performAction === 'function') {
               const playerHpBeforeEnemyAction = playerStateForEnemyActions.hp;
               const {
                 updatedPlayer: playerAfterThisEnemyAction,
                 updatedSelf: enemyAfterThisAction,
                 log: actionResultLog
               } = currentActingEnemyState.behavior.performAction(currentActingEnemyState, playerStateForEnemyActions, intent);

               playerStateForEnemyActions = playerAfterThisEnemyAction;
               currentEnemiesForActions[index] = { ...enemyAfterThisAction, id: currentActingEnemyState.id, behavior: currentActingEnemyState.behavior };
               enemyActionLogs.push(actionResultLog);

               if (playerHpBeforeEnemyAction > playerStateForEnemyActions.hp) {
                   triggerAnimation('player', 'playerHit');
               }
            } else {
               let failureLog = `${currentActingEnemyState.name}은(는) 행동할 수 없습니다.`;
               if (!intent) failureLog = `${currentActingEnemyState.name}은(는) 의도가 없습니다.`;
               else if (!currentActingEnemyState.behavior || typeof currentActingEnemyState.behavior.performAction !== 'function') {
                 failureLog = `${currentActingEnemyState.name}에게 행동 로직(performAction)이 없습니다.`;
                 console.error("Missing performAction: ", currentActingEnemyState);
               }
               enemyActionLogs.push(failureLog);
            }
          }
          resolve(undefined);
        }, 500);
      }));
    });

    enemyActionPromise.then(() => {
      let enemiesAfterActionsAndBuffs = currentEnemiesForActions.map(e => {
          if (e.hp > 0) {
            const enemyDef = ALL_ENEMY_DEFINITIONS[e.id];
            const liveBehavior = enemyDef ? enemyDef.behavior : e.behavior;
            if (!liveBehavior) {
                console.error(`CRITICAL: Behavior missing for enemy ${e.name} (${e.id}) during enemiesAfterActionsAndBuffs. e.behavior was:`, e.behavior);
            }

            const processedCharacterData = processEndOfTurnBuffs(e);
            return {
                ...(processedCharacterData as Omit<EnemyState, 'id' | 'name' | 'maxHp' | 'uiId' | 'intent' | 'behavior'>),
                id: e.id,
                name: e.name,
                maxHp: e.maxHp,
                uiId: e.uiId,
                intent: e.intent,
                behavior: liveBehavior,
            } as EnemyState;
          }
          return e;
      });
      enemiesAfterActionsAndBuffs = enemiesAfterActionsAndBuffs.map(e => ({...e, block: 0}));

      const combinedLogsAfterEnemyActions = [...enemyActionLogs.reverse(), enemyTurnStartLog, endTurnLog, ...currentBattleLog.slice(0,17)];

      if (playerStateForEnemyActions.hp <= 0) {
        const gameOverLog = "플레이어가 패배했습니다!";
        const finalLogs = [gameOverLog, ...combinedLogsAfterEnemyActions.slice(0,19)];
        const gameOverState: GameState = {
            ...gameState,
            player: playerStateForEnemyActions,
            currentEnemies: enemiesAfterActionsAndBuffs,
            currentScreen: GameScreen.GAME_OVER,
            battleLog: finalLogs,
            gameConclusion: 'LOSS',
        };
        setGameState(gameOverState);
        saveGameState(gameOverState);
        return;
      }

      let playerForNewTurn = { ...playerStateForEnemyActions };
      let playerTurnStartLogs: string[] = [];

      if (ghostlyArmorBuffActive) {
        playerTurnStartLogs.push("유령 갑옷 효과로 방어도가 유지됩니다!");
      }

      const lingeringFortifyBuff = playerForNewTurn.buffs.find(b => b.name === '요새화 (지속)' && b.duration > 0);
      if (lingeringFortifyBuff) {
          const blockFromFortify = lingeringFortifyBuff.value;
          playerForNewTurn.block += blockFromFortify;
          playerTurnStartLogs.push(`요새화 (지속) 효과로 방어도 ${blockFromFortify}을(를) 얻었습니다!`);
      }

      const panicButtonAftermathBuff = playerForNewTurn.buffs.find(b => b.name === '비상 버튼 후폭풍' && b.duration > 0);
      if (panicButtonAftermathBuff) {
          const damageToTake = panicButtonAftermathBuff.value;
          const hpBeforeDamage = playerForNewTurn.hp;
          playerForNewTurn.hp = Math.max(0, playerForNewTurn.hp - damageToTake);
          playerTurnStartLogs.push(`플레이어가 비상 버튼 후폭풍으로 체력 ${damageToTake}을(를) 잃었습니다.`);
          if (hpBeforeDamage > playerForNewTurn.hp) {
            triggerAnimation('player', 'playerHit');
          }
           if (playerForNewTurn.hp <= 0) {
                const gameOverLog = "플레이어가 패배했습니다!";
                const finalLogs = [gameOverLog, ...playerTurnStartLogs.reverse(), ...combinedLogsAfterEnemyActions.slice(0,18-playerTurnStartLogs.length)];
                const gameOverState: GameState = {
                    ...gameState,
                    player: playerForNewTurn,
                    currentEnemies: enemiesAfterActionsAndBuffs,
                    currentScreen: GameScreen.GAME_OVER,
                    battleLog: finalLogs,
                    gameConclusion: 'LOSS',
                };
                setGameState(gameOverState);
                saveGameState(gameOverState);
                return;
            }
      }

      playerForNewTurn = drawCards(playerForNewTurn, PLAYER_INITIAL_DRAW_COUNT).updatedPlayer;
      playerForNewTurn.energy = playerForNewTurn.maxEnergy;

      const enemiesForNextIntent = enemiesAfterActionsAndBuffs.filter(e => e.hp > 0);
      const enemiesWithNewIntents = enemiesForNextIntent.map(e => {
        const enemyDef = ALL_ENEMY_DEFINITIONS[e.id];
        const currentBehavior = enemyDef ? enemyDef.behavior : e.behavior;

        if (!currentBehavior) {
            console.error(`CRITICAL: Behavior missing for enemy ${e.name} (${e.id}) before getNextIntent. e.behavior was:`, e.behavior);
            return { ...e, intent: {type: 'UNKNOWN' as EnemyIntent['type'], description: '행동 불가 (오류)'} };
        }

        if (e.hp > 0 && typeof currentBehavior.getNextIntent === 'function') {
          const enemyStateForIntentGen: EnemyState = {
             ...e,
             buffs: e.buffs.map(b=>({...b})),
             behavior: currentBehavior,
             intent: null
          };
          const nextIntent = currentBehavior.getNextIntent(enemyStateForIntentGen, playerForNewTurn);

          let updatedEnemyFromIntent: EnemyState = { ...e, intent: nextIntent, behavior: currentBehavior };
          if (nextIntent.updatedSelfState) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { behavior: _bIntent, id: _idIntent, uiId: _uiIdIntent, name: _nameIntent, maxHp: _mhpIntent, intent: _ussIntent, ...propertiesFromUSS } = nextIntent.updatedSelfState;
              updatedEnemyFromIntent = {
                  ...e,
                  ...propertiesFromUSS,
                  id: e.id,
                  uiId: e.uiId,
                  name: e.name,
                  maxHp: e.maxHp,
                  intent: nextIntent,
                  behavior: currentBehavior,
              };
          }
          return updatedEnemyFromIntent;
        }
        return { ...e, behavior: currentBehavior };
      });

      const playerTurnStartOfficialLog = "플레이어의 턴 시작.";
      const finalLogsForNewPlayerTurn = [playerTurnStartOfficialLog, ...playerTurnStartLogs.reverse(), ...combinedLogsAfterEnemyActions.slice(0, 20 - 1 - playerTurnStartLogs.length)];

      setGameState(prev => {
        const newStateForNextTurn = {
          ...prev,
          player: playerForNewTurn,
          currentEnemies: enemiesWithNewIntents,
          turn: prev.turn + 1,
          battleLog: finalLogsForNewPlayerTurn,
        };
        saveGameState(newStateForNextTurn);
        return newStateForNextTurn;
      });
    });
  }, [gameState, addBattleLog, triggerAnimation, processEndOfTurnBuffs, saveGameState]);


  const handleStartEncounter = useCallback((node: GameMapNode) => {
    if (node.type === 'REST') {
        setGameState(prev => {
            const healAmount = Math.floor(prev.player.maxHp * 0.3);
            const healedPlayer = {...prev.player, hp: Math.min(prev.player.maxHp, prev.player.hp + healAmount), buffs:[], block: 0, cardCombatStats: {}, exhaustPile: []};
            const battleLogUpdate = ["상쾌함을 느낍니다.", `휴식하여 체력 ${healAmount}을(를) 회복했습니다.`, ...prev.battleLog.slice(0,18)];

            const newMap = JSON.parse(JSON.stringify(prev.currentMap)) as GameState['currentMap'];
            const floorArrIndex = newMap.floors.findIndex(f => f.some(n => n.id === node.id));
            if (floorArrIndex !== -1) {
                const nodeInFloorArrIndex = newMap.floors[floorArrIndex].findIndex(n => n.id === node.id);
                 if (nodeInFloorArrIndex !== -1) newMap.floors[floorArrIndex][nodeInFloorArrIndex].cleared = true;
            }
            if (prev.currentMap.currentFloor === node.floor) newMap.currentFloor = prev.currentMap.currentFloor + 1;

            let currentScreenUpdate = GameScreen.MAP;
            if (newMap.currentFloor >= newMap.floors.length) {
                 currentScreenUpdate = GameScreen.GAME_WON; // This could lead to POST_RUN_MASTERY on load if saved here
            }
            const updatedState = { ...prev, player: healedPlayer, currentScreen: currentScreenUpdate, currentMap: newMap, battleLog: battleLogUpdate, gameConclusion: prev.gameConclusion}; // Preserve gameConclusion if already set
            saveGameState(updatedState);
            return updatedState;
        });
        return;
    }

    if (node.type === 'ENEMY' || node.type === 'ELITE' || node.type === 'BOSS') {
        if (!node.enemyKeys || node.enemyKeys.length === 0) {
          addBattleLog(`오류: ${node.type} 노드 '${node.id}'에 enemyKeys가 정의되지 않았거나 비어 있습니다.`);
          return;
        }

        const battleReadyEnemies: EnemyState[] = [];
        const tempPlayerStateForIntentGen = JSON.parse(JSON.stringify(gameState.player)) as PlayerState;


        node.enemyKeys.forEach((enemyKey, idx) => {
            const baseEnemyDef = ALL_ENEMY_DEFINITIONS[enemyKey];
            if (!baseEnemyDef) {
                addBattleLog(`알 수 없는 적 키: ${enemyKey} (노드 '${node.id}', 인스턴스 ${idx + 1}). 스킵합니다.`);
                return;
            }

            let finalEnemyDef = JSON.parse(JSON.stringify(baseEnemyDef)) as EnemyDefinition;
            finalEnemyDef.behavior = baseEnemyDef.behavior;

            let currentMaxHp = finalEnemyDef.maxHp;
            if (gameState.ascensionLevel >= 1) {
              currentMaxHp = Math.ceil(currentMaxHp * (1 + ASCENSION_SETTINGS.ENEMY_HP_BONUS_L1));
            }
            if (gameState.ascensionLevel >= 2 && (node.type === 'ELITE' || node.type === 'BOSS' || finalEnemyDef.isElite)) {
              currentMaxHp = Math.ceil(currentMaxHp * (1 + ASCENSION_SETTINGS.ELITE_BOSS_HP_BONUS_L2));
            }
            finalEnemyDef.maxHp = currentMaxHp;
            const enemyHp = finalEnemyDef.maxHp;

            const enemyUiId = `${finalEnemyDef.key}_instance${idx}_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;

            const enemyInstanceBase: Omit<EnemyState, 'intent' | 'uiId' | 'behavior'> = {
              id: finalEnemyDef.key,
              name: finalEnemyDef.name,
              maxHp: finalEnemyDef.maxHp,
              hp: enemyHp,
              block: 0,
              buffs: [],
            };

            let tempEnemyStateForIntent: EnemyState = {
                ...enemyInstanceBase,
                uiId: enemyUiId,
                behavior: finalEnemyDef.behavior,
                intent: null,
            };

            const initialIntent = finalEnemyDef.behavior.getNextIntent(tempEnemyStateForIntent, tempPlayerStateForIntentGen);

            let individualBattleReadyEnemy: EnemyState = {
                ...enemyInstanceBase,
                uiId: enemyUiId,
                behavior: finalEnemyDef.behavior,
                intent: initialIntent,
            };

            if (initialIntent.updatedSelfState) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { behavior: _b, id: _idUSS, uiId: _uiIdUSS, name: _nameUSS, maxHp: _mhpUSS, intent: _intentFromUSS, ...propertiesFromUSS } = initialIntent.updatedSelfState;
                individualBattleReadyEnemy = {
                    ...individualBattleReadyEnemy,
                    ...propertiesFromUSS,
                    intent: initialIntent,
                    behavior: finalEnemyDef.behavior
                };
            }
            battleReadyEnemies.push(individualBattleReadyEnemy);
        });

        if (battleReadyEnemies.length === 0) {
            addBattleLog("전투를 위한 적을 생성할 수 없습니다 (모든 정의를 찾을 수 없거나 비어 있음).");
            return;
        }

        let playerForBattle: PlayerState = {
            ...gameState.player,
            hand: [],
            discardPile: [],
            drawPile: shuffleArray([...gameState.player.deck]),
            exhaustPile: [],
            buffs: [],
            block: 0,
            cardCombatStats: {}
        };
        playerForBattle.energy = playerForBattle.maxEnergy;
        playerForBattle = drawCards(playerForBattle, PLAYER_INITIAL_DRAW_COUNT).updatedPlayer;

        setGameState(prev => {
          const enemyNames = battleReadyEnemies.map(e => e.name).join(', ');
          const newState = {
            ...prev,
            player: playerForBattle,
            currentEnemies: battleReadyEnemies,
            currentScreen: GameScreen.BATTLE,
            currentEncounterNodeId: node.id,
            battleLog: [`적 조우: ${enemyNames}!`, ...prev.battleLog.slice(0,19)],
            turn: 1,
            gameConclusion: null, // Battle started, so prior conclusion is void for this state.
          };
          saveGameState(newState);
          return newState;
        });
        return;
    }

    addBattleLog(`알 수 없는 또는 처리되지 않은 노드 유형입니다: ${node.type} (노드 ID: ${node.id})`);
    return;

  }, [gameState.player, gameState.ascensionLevel, gameState.currentMap, addBattleLog, saveGameState]);

  const handleSelectReward = useCallback((card: Card) => {
    addBattleLog(`${card.name} 카드를 덱에 추가했습니다.`);
    const newPlayerDeck = [...gameState.player.deck, card];

    const nextState: GameState = {
      ...gameState,
      player: { ...gameState.player, deck: newPlayerDeck },
      currentScreen: GameScreen.MAP,
      availableRewards: [],
      gameConclusion: gameState.gameConclusion, // Preserve conclusion if it was set (e.g. WIN_BOSS_CLEAR)
    };
    setGameState(nextState);
    saveGameState(nextState);
  }, [gameState, addBattleLog, saveGameState]);

  const handleSkipReward = useCallback(() => {
    addBattleLog("보상을 건너뛰었습니다.");
    const nextState: GameState = {
        ...gameState,
        currentScreen: GameScreen.MAP,
        availableRewards: [],
        gameConclusion: gameState.gameConclusion,
    };
    setGameState(nextState);
    saveGameState(nextState);
  }, [gameState, addBattleLog, saveGameState]);

  const handleActualRestartGame = useCallback(() => {
    setSelectedCardForMastery(null);
    const lastGameConclusion = gameState.gameConclusion;
    const ascensionOfCompletedRun = gameState.ascensionLevel;
    const maxUnlockedAscFromStorage = parseInt(localStorage.getItem(MAX_UNLOCKED_ASCENSION_KEY) || '0', 10);
    const previousAttemptNumber = gameState.gameAttemptNumber;

    let newAscensionLevelForRun: number;
    if (lastGameConclusion === 'WIN_BOSS_CLEAR') {
        newAscensionLevelForRun = maxUnlockedAscFromStorage;
    } else {
        newAscensionLevelForRun = ascensionOfCompletedRun; // If lost, retry same ascension.
    }
    newAscensionLevelForRun = Math.min(newAscensionLevelForRun, MAX_ASCENSION_LEVEL); // Cap at max

    const basePlayerForNewRun = initializePlayer(newAscensionLevelForRun);
    let deckForNewRun: Card[];
    const newBattleLogMessages: string[] = [];

    const masteredCardLvls: Record<string, number> = JSON.parse(localStorage.getItem(MASTERED_CARDS_KEY) || '{}');

    // Carry over deck from previous run (post-mastery effects) or start fresh if no deck
    // Uses gameState.player.deck which should have been updated by setGameState before triggering restart
    if (gameState.player.deck && gameState.player.deck.length > 0) {
        newBattleLogMessages.push("이전 덱 구성 및 마스터리 레벨을 기반으로 새 덱을 생성합니다...");
        deckForNewRun = gameState.player.deck.map((cardFromOldDeck, index) => {
            const baseDefinition = ALL_GAME_CARDS.find(cDef => cDef.definitionId === cardFromOldDeck.definitionId) || cardFromOldDeck;
            const newInstance = createCardInstance(baseDefinition, `carryover_${index}`);
            newInstance.masteryLevel = masteredCardLvls[newInstance.definitionId] || 0;
            return newInstance;
        });
    } else {
        newBattleLogMessages.push(`새로운 기본 덱 (승천 ${newAscensionLevelForRun})으로 시작합니다.`);
        deckForNewRun = basePlayerForNewRun.deck.map((cardInstance, index) => {
            const newInst = createCardInstance(cardInstance, `newdeck_initial_${index}`);
            newInst.masteryLevel = masteredCardLvls[newInst.definitionId] || 0;
            return newInst;
        });
    }

    const nextAttemptNumber = previousAttemptNumber + 1;
    newBattleLogMessages.push(`새로운 도전 #${nextAttemptNumber}을(를) 시작합니다. (승천 ${newAscensionLevelForRun})`);

    const newPlayerState: PlayerState = {
        ...basePlayerForNewRun,
        deck: deckForNewRun,
        drawPile: shuffleArray([...deckForNewRun]),
        hand: [],
        discardPile: [],
        exhaustPile: [],
        cardCombatStats: {},
    };

    const newGameStartupState: GameState = {
        player: newPlayerState,
        currentEnemies: [],
        currentScreen: GameScreen.MAP,
        currentMap: initializeGameMap(),
        currentEncounterNodeId: null,
        battleLog: newBattleLogMessages.slice().reverse(),
        turn: 0,
        availableRewards: [],
        ascensionLevel: newAscensionLevelForRun,
        gameConclusion: null, // New game starts with no conclusion
        gameAttemptNumber: nextAttemptNumber,
    };

    console.log("Restarting game with state:", JSON.parse(JSON.stringify(newGameStartupState)));
    setGameState(newGameStartupState);
    saveGameState(newGameStartupState);

    setSelectedCardInHand(null);
    setSelectedTargetEnemyId(null);
    setAnimationTrigger(null);
  }, [gameState.gameConclusion, gameState.ascensionLevel, gameState.gameAttemptNumber, gameState.player.deck, saveGameState]);

  useEffect(() => {
    if (needsRestart) {
      handleActualRestartGame();
      setNeedsRestart(false); // Reset the trigger
    }
  }, [needsRestart, handleActualRestartGame]);


  const onCardClickInHand = useCallback((card: Card, targetEnemyUiIdParam?: string) => {
    if (gameState.currentScreen !== GameScreen.BATTLE) return;
     if (card.type === CardType.CURSE) {
        addBattleLog(`${card.name} 카드는 사용할 수 없습니다.`);
        return;
    }
    if (gameState.player.energy < card.cost) {
        addBattleLog("에너지가 부족합니다!");
        return;
    }

    const livingEnemies = gameState.currentEnemies.filter(e => e.hp > 0);

    if (card.targetType === TargetType.SELF || card.targetType === TargetType.NONE || card.targetType === TargetType.ALL_ENEMIES) {
      handlePlayCard(card);
    } else if (card.targetType === TargetType.SINGLE_ENEMY) {
      if (targetEnemyUiIdParam) {
        handlePlayCard(card, targetEnemyUiIdParam);
      } else if (livingEnemies.length === 1) {
        handlePlayCard(card, livingEnemies[0]?.uiId);
      } else if (livingEnemies.length > 0) {
        if (isDelegatedMode) {
             addBattleLog(`[위임] ${card.name} 카드에 대한 대상 자동 선택 실패. 다른 카드 시도 중...`);
             return;
        }
        setSelectedCardInHand(card);
        setSelectedTargetEnemyId(null);
        addBattleLog(`${card.name} 선택됨. 대상을 클릭하세요.`);
      } else {
        addBattleLog("공격할 대상이 없습니다.");
      }
    }
  }, [gameState.currentScreen, gameState.player, gameState.currentEnemies, handlePlayCard, addBattleLog, isDelegatedMode]);

  const onEnemyClick = (enemy: EnemyState) => {
    if (gameState.currentScreen !== GameScreen.BATTLE || !selectedCardInHand || enemy.hp <= 0 || isDelegatedMode) {
      return;
    }
    if (selectedCardInHand.type === CardType.CURSE) return;

    if (selectedCardInHand.targetType === TargetType.SINGLE_ENEMY) {
      setSelectedTargetEnemyId(enemy.uiId);
      handlePlayCard(selectedCardInHand, enemy.uiId);
    }
  };

  const handleSelectCardForMastery = (card: Card) => {
    if (card.type === CardType.CURSE) {
        addBattleLog("저주 카드는 마스터할 수 없습니다.");
        return;
    }
    setSelectedCardForMastery(card);
  };

  const confirmMasterySelection = () => {
    if (selectedCardForMastery) {
        let masteredCardLevels: Record<string, number> = JSON.parse(localStorage.getItem(MASTERED_CARDS_KEY) || '{}');
        const defId = selectedCardForMastery.definitionId;
        const currentLevel = masteredCardLevels[defId] || 0;
        const newLevel = currentLevel + 1;
        masteredCardLevels[defId] = newLevel;

        localStorage.setItem(MASTERED_CARDS_KEY, JSON.stringify(masteredCardLevels));
        addBattleLog(`${selectedCardForMastery.name} 카드의 마스터리 레벨이 ${newLevel}(으)로 증가했습니다! 다음 게임부터 강화된 효과가 적용됩니다.`);

        const updatedPlayerDeck = gameState.player.deck.map(c => {
            if (c.definitionId === defId) {
                return { ...c, masteryLevel: newLevel };
            }
            return c;
        });
        setGameState(prev => ({...prev, player: {...prev.player, deck: updatedPlayerDeck}}));
        setNeedsRestart(true);
        return;
    }
    // If no card was selected for mastery, still proceed to restart.
    setNeedsRestart(true);
  };


  const renderBuffs = (character: CharacterState) => {
    if (!character.buffs || character.buffs.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {character.buffs.map(buff => (
                <span key={buff.id} title={buff.description} className="text-xs px-1.5 py-0.5 bg-slate-600 rounded-full flex items-center">
                    {buff.icon} {buff.name !== '힘' && buff.name !== '취약' && buff.name !== '요새화 (지속)' && buff.name !== '유령 갑옷 지속' && buff.name !== '비상 버튼 후폭풍' ? buff.name : ''} {buff.value > 0 && (buff.name==='힘' || buff.value > 1 || buff.name === '취약' || buff.name === '요새화 (지속)' || buff.name === '비상 버튼 후폭풍') ? buff.value : ''} {buff.duration !== -1 ? `(${buff.duration})` : ''}
                </span>
            ))}
        </div>
    );
  };

  const toggleDelegatedMode = () => {
    setIsDelegatedMode(prev => {
        const newMode = !prev;
        localStorage.setItem(DELEGATED_MODE_KEY, JSON.stringify(newMode));
        if (newMode) {
            addBattleLog("위임 모드가 활성화되었습니다. 자동 진행합니다.");
        } else {
            addBattleLog("위임 모드가 비활성화되었습니다.");
        }
        return newMode;
    });
  };

  const executeFullGameReset = useCallback(() => {
    addBattleLog("모든 게임 데이터 초기화 중...");
    localStorage.removeItem(SAVE_GAME_KEY);
    localStorage.removeItem(MASTERED_CARDS_KEY);
    localStorage.removeItem(DELEGATED_MODE_KEY);
    localStorage.removeItem(MAX_UNLOCKED_ASCENSION_KEY);

    const newInitialPlayer = initializePlayer(0);
    const freshGameState: GameState = {
      player: newInitialPlayer,
      currentEnemies: [],
      currentScreen: GameScreen.MAP,
      currentMap: initializeGameMap(),
      currentEncounterNodeId: null,
      battleLog: ["게임이 완전히 초기화되었습니다. 새로운 도전 #1 시작! (승천 0)"],
      turn: 0,
      availableRewards: [],
      ascensionLevel: 0,
      gameConclusion: null,
      gameAttemptNumber: 1,
    };
    setGameState(freshGameState);
    saveGameState(freshGameState);

    setSelectedCardInHand(null);
    setSelectedTargetEnemyId(null);
    setAnimationTrigger(null);
    if (isDelegatedMode) setIsDelegatedMode(false);
  }, [addBattleLog, saveGameState, isDelegatedMode ]);

  const handleFullGameReset = useCallback(() => {
    setIsResetConfirmModalOpen(true);
  }, []);

  useEffect(() => {
    if (!isDelegatedMode) return;

    let autoPlayTimerId: number | undefined;

    const performDelegatedAction = async () => {
      if (
          gameState.currentScreen === GameScreen.BATTLE &&
          gameState.player.hp > 0 &&
          gameState.currentEnemies.some(e => e.hp > 0)
      ) {
          let cardToPlay: Card | undefined = undefined;
          let autoTargetId: string | undefined = undefined;
          const livingEnemies = gameState.currentEnemies.filter(e => e.hp > 0);
          const playableCards = gameState.player.hand.filter(c => c.cost <= gameState.player.energy && c.type !== CardType.CURSE);

          cardToPlay = playableCards.find(c => c.type === CardType.ATTACK);
          if (cardToPlay) {
              if (cardToPlay.targetType === TargetType.SINGLE_ENEMY) {
                  if (livingEnemies.length > 0) {
                    autoTargetId = livingEnemies.sort((a,b) => a.hp - b.hp)[0].uiId;
                  } else {
                    cardToPlay = undefined;
                  }
              }
          }

          if (!cardToPlay) {
              cardToPlay = playableCards.find(c => c.type === CardType.SKILL);
              if (cardToPlay) {
                  if (cardToPlay.targetType === TargetType.SINGLE_ENEMY) {
                      if (livingEnemies.length > 0) {
                         autoTargetId = livingEnemies.sort((a,b) => a.hp - b.hp)[0].uiId;
                      } else {
                        cardToPlay = undefined;
                      }
                  }
              }
          }

          if (cardToPlay && cardToPlay.targetType === TargetType.SINGLE_ENEMY && !autoTargetId && livingEnemies.length > 0) {
             autoTargetId = livingEnemies[0].uiId;
          } else if (cardToPlay && cardToPlay.targetType === TargetType.SINGLE_ENEMY && livingEnemies.length === 0) {
            cardToPlay = undefined;
          }


          if (cardToPlay) {
              addBattleLog(`[위임] ${cardToPlay.name} 자동 사용 시도...${autoTargetId ? ` (대상: ${gameState.currentEnemies.find(e=>e.uiId === autoTargetId)?.name})` : ''}`);
              await new Promise(resolve => setTimeout(resolve, 300));
              onCardClickInHand(cardToPlay, autoTargetId);
          } else {
              addBattleLog("[위임] 사용 가능한 카드 없음 또는 에너지 부족. 턴 종료.");
              await new Promise(resolve => setTimeout(resolve, 500));
              handleEndTurn();
          }
      } else if (gameState.currentScreen === GameScreen.MAP && gameState.player.hp > 0) {
          const currentFloorForDecision = gameState.currentMap.currentFloor;
          const currentFloorNodes = gameState.currentMap.floors[currentFloorForDecision] || [];
          const nextNodeToPlay = currentFloorNodes.find(node => !node.cleared);

          if (nextNodeToPlay) {
              let nodeDescription: string = nextNodeToPlay.type;
              if (nextNodeToPlay.enemyKeys && nextNodeToPlay.enemyKeys.length > 0) {
                const enemyNames = nextNodeToPlay.enemyKeys.map(key => ALL_ENEMY_DEFINITIONS[key]?.name || '알 수 없는 적').join(', ');
                nodeDescription = `${nextNodeToPlay.type === 'ELITE' ? '정예' : (nextNodeToPlay.type === 'BOSS' ? '보스' : '적')}: ${enemyNames}`;
              } else if (nextNodeToPlay.type === 'REST') {
                nodeDescription = '휴식처';
              }
              addBattleLog(`[위임] 다음 노드(${nodeDescription})로 자동 이동... (대상 층: ${currentFloorForDecision + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              handleStartEncounter(nextNodeToPlay);
          } else {
              addBattleLog(`[위임] 현재 층(${currentFloorForDecision + 1})에 진행할 노드가 없습니다. (맵 종료 또는 오류)`);
              if (currentFloorForDecision >= gameState.currentMap.floors.length -1 && gameState.currentMap.floors[currentFloorForDecision]?.every(n => n.cleared)) {
                addBattleLog(`[위임] 모든 노드가 클리어된 것으로 보입니다. 게임이 끝났거나 다음 단계로 진행 중입니다.`);
              }
          }
      } else if (gameState.currentScreen === GameScreen.REWARD && gameState.player.hp > 0) {
          if (gameState.availableRewards.length > 0) {
              const rewardToSelect = gameState.availableRewards[0];
              addBattleLog(`[위임] '${rewardToSelect.name}' 카드 자동 선택...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              handleSelectReward(rewardToSelect);
          } else {
              addBattleLog("[위임] 받을 보상이 없습니다. 자동 건너뛰기...");
              await new Promise(resolve => setTimeout(resolve, 1000));
              handleSkipReward();
          }
      } else if (gameState.currentScreen === GameScreen.GAME_WON && gameState.player.hp > 0) {
            addBattleLog("[위임] 게임 승리! 마스터리 선택 화면으로 자동 이동합니다...");
            await new Promise(resolve => setTimeout(resolve, 1500));
            const targetState = {...gameState, currentScreen: GameScreen.POST_RUN_MASTERY };
            setGameState(targetState);
            saveGameState(targetState);
      } else if (gameState.currentScreen === GameScreen.POST_RUN_MASTERY) {
            addBattleLog("[위임] 카드 마스터리 자동 선택 중...");
            await new Promise(resolve => setTimeout(resolve, 1500));

            const nonCursedEligibleCards = gameState.player.deck.filter(c => c.type !== CardType.CURSE);
            let cardToAttemptMastery: Card | undefined = undefined;

            if (nonCursedEligibleCards.length > 0) {
                cardToAttemptMastery = nonCursedEligibleCards.sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0))[0];
            }

            if (cardToAttemptMastery) {
                addBattleLog(`[위임] ${cardToAttemptMastery.name} 카드 마스터리 레벨 증가 시도...`);
                let currentMasteredLevels: Record<string, number> = JSON.parse(localStorage.getItem(MASTERED_CARDS_KEY) || '{}');
                const currentLevel = currentMasteredLevels[cardToAttemptMastery.definitionId] || 0;
                const newLevel = currentLevel + 1;
                currentMasteredLevels[cardToAttemptMastery.definitionId] = newLevel;
                localStorage.setItem(MASTERED_CARDS_KEY, JSON.stringify(currentMasteredLevels));
                addBattleLog(`[위임] ${cardToAttemptMastery.name} 카드의 마스터리 레벨이 ${newLevel}(으)로 증가했습니다!`);

                 // Update deck in gameState before restarting
                const updatedPlayerDeck = gameState.player.deck.map(c => {
                    if (c.definitionId === cardToAttemptMastery?.definitionId) {
                        return { ...c, masteryLevel: newLevel };
                    }
                    return c;
                });
                setGameState(prev => ({...prev, player: {...prev.player, deck: updatedPlayerDeck}}));
                setNeedsRestart(true); // Signal restart
                return; // Done with this iteration of performDelegatedAction
            } else {
                 addBattleLog("[위임] 덱에 마스터할 카드가 없거나 적절한 카드를 찾지 못했습니다. 건너뛰고 재시작합니다.");
            }
            setSelectedCardForMastery(null);
            setNeedsRestart(true); // Signal restart for skip/no card case
      } else if (gameState.currentScreen === GameScreen.GAME_OVER) {
          addBattleLog("[위임] 게임 오버. 마스터리 화면으로 이동합니다.");
          await new Promise(resolve => setTimeout(resolve, 1500));
          const targetState = {...gameState, currentScreen: GameScreen.POST_RUN_MASTERY };
          setGameState(targetState);
          saveGameState(targetState);
      }
    };

    autoPlayTimerId = window.setTimeout(performDelegatedAction, 1000);

    return () => clearTimeout(autoPlayTimerId);
  }, [
    isDelegatedMode,
    gameState,
    onCardClickInHand,
    handleEndTurn,
    handleStartEncounter,
    handleSelectReward,
    handleSkipReward,
    addBattleLog,
    handleActualRestartGame, // Needs to be stable or dependencies managed
    saveGameState
  ]);


  // --- Render Logic ---
  const renderScreen = () => {
    switch (gameState.currentScreen) {
      case GameScreen.MAP:
        const currentFloorNodes = gameState.currentMap.floors[gameState.currentMap.currentFloor] || [];
        const ascensionDisplay = getAscensionDescription(gameState.ascensionLevel);
        return (
          <div className="p-4 md:p-8 flex flex-col items-center min-h-screen">
            <h1 className="text-3xl md:text-4xl font-bold mb-1 text-amber-400">첨탑 - {gameState.currentMap.currentFloor + 1}층</h1>
            <p className="text-sm text-sky-300 mb-1">{ascensionDisplay}</p>
            <p className="text-sm text-slate-300 mb-3">도전 횟수: {gameState.gameAttemptNumber}</p>

            <MinimapComponent
              gameMap={gameState.currentMap}
              currentPlayerMapFloor={gameState.currentMap.currentFloor}
            />

            <div className="my-4 text-center">
                <p>플레이어: {gameState.player.hp}/{gameState.player.maxHp} ❤️</p>
                <p>덱 크기: {gameState.player.deck.length} 장</p>
            </div>

            {currentFloorNodes.map(node => {
              let displayLabel: string;
              const nodeTypeDisplay = node.type === 'ELITE' ? '정예' : (node.type === 'BOSS' ? '보스' : '적');

              if (node.enemyKeys && node.enemyKeys.length > 0) {
                const enemyNames = node.enemyKeys.map(key => ALL_ENEMY_DEFINITIONS[key]?.name || '알 수 없는 적').join(', ');
                displayLabel = `${nodeTypeDisplay}: ${enemyNames}`;
              } else if (node.type === 'REST') {
                displayLabel = '휴식처 (체력 30% 회복)';
              } else {
                displayLabel = node.type;
              }

              return (
              <button
                key={node.id}
                onClick={() => !isDelegatedMode && handleStartEncounter(node)}
                disabled={node.cleared || isDelegatedMode}
                className={`p-3 md:p-4 my-2 w-full max-w-sm rounded shadow-lg text-md md:text-lg font-semibold transition-colors
                  ${node.cleared ? 'bg-slate-600 text-slate-400 cursor-not-allowed' :
                    (node.type === 'BOSS' ? 'bg-red-600 hover:bg-red-500' :
                    (node.type === 'ELITE' ? 'bg-yellow-600 hover:bg-yellow-500' :
                    (node.type === 'REST' ? 'bg-green-600 hover:bg-green-500' : 'bg-sky-600 hover:bg-sky-500')))}
                  ${isDelegatedMode ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {displayLabel}
              </button>
            );
          })}
            <div className="mt-4 w-full max-w-sm space-y-2">
                <button
                    onClick={toggleDelegatedMode}
                    className={`w-full p-3 rounded-lg text-lg font-semibold shadow-md transition-colors
                                ${isDelegatedMode ? 'bg-orange-600 hover:bg-orange-500' : 'bg-teal-600 hover:bg-teal-500'}`}
                >
                    {isDelegatedMode ? '위임 중지' : '위임 시작'}
                </button>
                <button
                    onClick={() => !isDelegatedMode && setGameState(prev => ({ ...prev, currentScreen: GameScreen.DECK_VIEW }))}
                    disabled={isDelegatedMode}
                    className={`w-full p-3 bg-purple-600 hover:bg-purple-500 rounded text-lg font-semibold
                                ${isDelegatedMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    덱 보기
                </button>
                <button
                    onClick={handleFullGameReset}
                    disabled={isDelegatedMode}
                    className={`w-full p-3 bg-red-700 hover:bg-red-600 rounded text-lg font-semibold text-white
                                ${isDelegatedMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    전체 게임 초기화
                </button>
            </div>
          </div>
        );

      case GameScreen.BATTLE:
        const isPlayerHit = animationTrigger?.targetId === 'player' && animationTrigger?.effectType === 'playerHit';
        return (
          <div className="min-h-screen flex flex-col p-2 md:p-4 bg-slate-900">
            <div className="text-center text-amber-400 text-xl font-semibold my-2">
                현재 층: {gameState.currentMap.currentFloor + 1}층 (턴: {gameState.turn})
            </div>
            <div className="flex justify-around items-end mb-4 h-56 md:h-72 flex-wrap">
              {gameState.currentEnemies.map(enemy => {
                const isEnemyHit = animationTrigger?.targetId === enemy.uiId && animationTrigger?.effectType === 'enemyHit';
                const enemyStrength = enemy.buffs.find(b => b.name === '힘')?.value || 0;
                const enemyDef = ALL_ENEMY_DEFINITIONS[enemy.id];
                const enemyDisplayName = enemyDef?.isElite ? `${enemy.name} ⭐` : enemy.name;

                return (
                  <div key={enemy.uiId}
                       onClick={() => onEnemyClick(enemy)}
                       className={`p-2 md:p-3 border-2 rounded-lg text-center transition-all duration-150 ease-in-out m-1 max-w-[150px] md:max-w-[180px] flex-shrink-0
                                  ${selectedCardInHand && selectedCardInHand.targetType === TargetType.SINGLE_ENEMY && selectedCardInHand.type !== CardType.CURSE && enemy.hp > 0 && !isDelegatedMode ? 'cursor-pointer hover:border-yellow-400 hover:shadow-lg' : (isDelegatedMode ? 'cursor-not-allowed' : '')}
                                  ${selectedTargetEnemyId === enemy.uiId ? 'border-yellow-600' : (enemyDef?.isElite ? 'border-yellow-700' : 'border-slate-700')}
                                  ${enemy.hp <= 0 ? 'opacity-50' : ''}
                                  ${isEnemyHit ? 'impact-hit-effect' : ''}`}
                  >
                    <img src={enemyDef?.artUrl || 'https://picsum.photos/seed/unknown/100/100'} alt={enemy.name} className="w-16 h-16 md:w-24 md:h-24 mx-auto rounded-md mb-1 object-cover" />
                    <p className={`text-xs md:text-sm font-semibold ${enemyDef?.isElite ? 'text-yellow-400' : ''}`}>{enemyDisplayName}</p>
                    <p className="text-xs text-red-400">❤️ {enemy.hp}/{enemy.maxHp}</p>
                    {enemy.block > 0 && <p className="text-xs text-sky-400">🛡️ {enemy.block}</p>}
                    {renderBuffs(enemy)}
                    {enemy.intent && enemy.hp > 0 && (
                      <div className="mt-1 p-1 bg-slate-700 rounded text-[10px] md:text-xs">
                        {enemy.intent.type === 'ATTACK' && `⚔️ ${(enemy.intent.value || 0) + enemyStrength}`}
                        {enemy.intent.type === 'DEFEND' && `🛡️ ${enemy.intent.value}`}
                        {enemy.intent.type === 'BUFF' && `✨ 버프`}
                        {enemy.intent.type === 'DEBUFF' && `👎 디버프`}
                        {enemy.intent.type === 'SPECIAL' && `🔮 특수`}
                        {enemy.intent.type === 'UNKNOWN' && `❓`}
                        <span className="block truncate" title={enemy.intent.description}>
                           {enemy.intent.description}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`flex justify-between items-start p-3 bg-slate-800 rounded-lg mb-4 ${isPlayerHit ? 'player-impact-hit-effect' : ''}`}>
              <div>
                <p className="text-xl font-bold">{gameState.player.name}</p>
                <p className="text-lg text-red-400">❤️ {gameState.player.hp}/{gameState.player.maxHp}</p>
                {gameState.player.block > 0 && <p className="text-lg text-sky-400">🛡️ {gameState.player.block}</p>}
                 {renderBuffs(gameState.player)}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">⚡️ {gameState.player.energy}/{gameState.player.maxEnergy}</p>
                <div className="text-xs mt-1">
                    <span>뽑을 카드: {gameState.player.drawPile.length}</span> | <span>버린 카드: {gameState.player.discardPile.length}</span> | <span title={`소멸된 카드 수: ${gameState.player.exhaustPile.length}`}>소멸됨: {gameState.player.exhaustPile.length}</span>
                </div>
              </div>
            </div>

            {gameState.battleLog.length > 0 && (
              <div className="h-20 overflow-y-auto bg-slate-700 p-2 rounded mb-2 text-xs">
                {gameState.battleLog.map((log, index) => <p key={index}>{log}</p>)}
              </div>
            )}

            <div className="flex-grow flex justify-center items-end space-x-1 md:space-x-2 pb-2 min-h-[200px] md:min-h-[300px] overflow-x-auto">
              {gameState.player.hand.map(card => (
                <CardComponent
                  key={card.id}
                  card={card}
                  onClick={!isDelegatedMode ? () => onCardClickInHand(card) : undefined}
                  isPlayable={gameState.player.energy >= card.cost && card.type !== CardType.CURSE}
                  isSelected={selectedCardInHand?.id === card.id && !isDelegatedMode}
                  inHand={true}
                  playerCardCombatStats={gameState.player.cardCombatStats}
                />
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-center items-center md:space-x-2 mt-2">
                <button
                    onClick={toggleDelegatedMode}
                    className={`w-full md:w-auto mb-2 md:mb-0 p-3 rounded-lg text-lg font-semibold shadow-md transition-colors
                                ${isDelegatedMode ? 'bg-orange-600 hover:bg-orange-500' : 'bg-teal-600 hover:bg-teal-500'}`}
                >
                    {isDelegatedMode ? '위임 중지' : '위임 시작'}
                </button>
                <button
                onClick={!isDelegatedMode ? handleEndTurn : undefined}
                disabled={isDelegatedMode}
                className={`w-full md:w-auto p-3 rounded-lg text-xl font-bold shadow-md transition-colors
                            ${isDelegatedMode ? 'bg-slate-500 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                턴 종료
                </button>
            </div>
          </div>
        );

      case GameScreen.REWARD:
        return (
          <div className="p-8 flex flex-col items-center min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-green-400">카드 보상 선택</h1>
            <div className="flex flex-wrap justify-center gap-4">
              {gameState.availableRewards.map(card => (
                <CardComponent
                    key={card.id}
                    card={card}
                    onClick={!isDelegatedMode ? () => handleSelectReward(card) : undefined}
                    isPlayable={!isDelegatedMode}
                    playerCardCombatStats={gameState.player.cardCombatStats}
                />
              ))}
            </div>
             <button
                onClick={!isDelegatedMode ? handleSkipReward : undefined}
                disabled={isDelegatedMode}
                className={`mt-8 p-3 bg-slate-600 hover:bg-slate-500 rounded text-lg
                           ${isDelegatedMode ? 'opacity-70 cursor-not-allowed' : ''}`}
             >
                보상 건너뛰기
            </button>
          </div>
        );

      case GameScreen.DECK_VIEW:
        const deckToList = gameState.player.deck.sort((a,b) => a.name.localeCompare(b.name));
        const discardToList = gameState.player.discardPile.sort((a,b) => a.name.localeCompare(b.name));
        const exhaustToList = gameState.player.exhaustPile.sort((a,b) => a.name.localeCompare(b.name));
        return (
          <div className="p-4 md:p-8 flex flex-col items-center min-h-screen">
            <h1 className="text-3xl font-bold mb-2 text-sky-400">현재 덱 ({deckToList.length}장)</h1>
            <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto mb-6" style={{maxHeight: '40vh'}}>
              {deckToList.map(card => (
                <CardComponent key={`deck-${card.id}`} card={card} playerCardCombatStats={gameState.player.cardCombatStats}/>
              ))}
            </div>

            {discardToList.length > 0 && (
                <>
                    <h2 className="text-2xl font-bold mb-2 text-orange-400">버린 카드 더미 ({discardToList.length}장)</h2>
                    <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto mb-6" style={{maxHeight: '20vh'}}>
                    {discardToList.map(card => (
                        <CardComponent key={`discard-${card.id}`} card={card} playerCardCombatStats={gameState.player.cardCombatStats}/>
                    ))}
                    </div>
                </>
            )}

            {exhaustToList.length > 0 && (
                <>
                    <h2 className="text-2xl font-bold mb-2 text-purple-400">소멸된 카드 더미 ({exhaustToList.length}장)</h2>
                    <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto mb-6" style={{maxHeight: '20vh'}}>
                    {exhaustToList.map(card => (
                        <CardComponent key={`exhaust-${card.id}`} card={card} playerCardCombatStats={gameState.player.cardCombatStats}/>
                    ))}
                    </div>
                </>
            )}


            <button
                onClick={() => setGameState(prev => ({ ...prev, currentScreen: GameScreen.MAP }))}
                className="mt-8 p-3 bg-sky-600 hover:bg-sky-500 rounded text-lg font-semibold"
            >
                맵으로 돌아가기
            </button>
          </div>
        );

      case GameScreen.GAME_OVER:
      case GameScreen.GAME_WON:
        const isWin = gameState.currentScreen === GameScreen.GAME_WON;
        return (
          <div className="p-8 flex flex-col items-center justify-center min-h-screen">
            <h1 className={`text-5xl font-bold mb-6 ${isWin ? 'text-yellow-400' : 'text-red-500'}`}>
              {isWin ? "승리!" : "게임 오버"}
            </h1>
            <p className="text-xl mb-4">
              {isWin ? "첨탑을 정복했습니다!" : "용감하게 싸웠지만 전투에서 패배했습니다."}
            </p>
            <p className="text-md mb-2 text-slate-300">승천 {gameState.ascensionLevel} 단계를 {isWin ? "완료했습니다" : "마쳤습니다"}.</p>
            <p className="text-md mb-8 text-slate-300">(도전 횟수: {gameState.gameAttemptNumber})</p>
            <button
              onClick={() => !isDelegatedMode && setGameState(prev => ({ ...prev, currentScreen: GameScreen.POST_RUN_MASTERY }))}
              disabled={isDelegatedMode}
              className={`p-4 rounded-lg text-2xl font-semibold
                          ${isDelegatedMode ? 'bg-slate-500 text-slate-400 cursor-not-allowed' : (isWin ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500')}`}
            >
              {isDelegatedMode ? '자동 진행 중...' : '다음 도전 준비'}
            </button>
          </div>
        );

      case GameScreen.POST_RUN_MASTERY:
        return (
          <div className="p-4 md:p-8 flex flex-col items-center min-h-screen">
            <h1 className="text-3xl font-bold mb-2 text-yellow-300">카드 마스터리</h1>
            <p className="mb-1 text-slate-300">여정을 통해 얻은 지혜로 카드 하나를 강화하여 다음 도전에 대비하세요. (승천 {gameState.ascensionLevel} 완료)</p>
            <p className="mb-4 text-xs text-slate-400">선택한 카드는 다음 게임부터 영구적으로 강화됩니다. (카드별 레벨 누적 가능)</p>

            {(!gameState.player.deck || gameState.player.deck.length === 0) && <p className="text-red-400 my-4">덱에 카드가 없어 마스터할 카드를 선택할 수 없습니다.</p>}

            <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto mb-6" style={{maxHeight: '60vh'}}>
              {gameState.player.deck
                .filter(card => card.type !== CardType.CURSE)
                .sort((a,b) => (a.masteryLevel || 0) - (b.masteryLevel || 0) || a.name.localeCompare(b.name))
                .map(card => (
                <CardComponent
                    key={card.id}
                    card={card}
                    onClick={!isDelegatedMode ? () => handleSelectCardForMastery(card) : undefined}
                    isSelected={selectedCardForMastery?.id === card.id && !isDelegatedMode}
                    isPlayable={!isDelegatedMode}
                    showDescriptionSuffix={true}
                    playerCardCombatStats={gameState.player.cardCombatStats}
                />
              ))}
            </div>
            <div className="flex space-x-4">
                <button
                    onClick={!isDelegatedMode ? confirmMasterySelection : undefined}
                    disabled={isDelegatedMode || !selectedCardForMastery }
                    className={`p-3 rounded text-lg font-semibold
                                ${isDelegatedMode || !selectedCardForMastery
                                    ? 'bg-slate-500 text-slate-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-500'}`}
                >
                    {isDelegatedMode ? '자동 진행 중...' : (selectedCardForMastery ? `${selectedCardForMastery.name} 마스터리 레벨 올리기` : "카드 선택")}
                </button>
                <button
                    onClick={!isDelegatedMode ? () => setNeedsRestart(true) : undefined}
                    disabled={isDelegatedMode}
                    className={`p-3 rounded text-lg font-semibold
                                ${isDelegatedMode ? 'bg-slate-500 text-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-500'}`}
                >
                    {isDelegatedMode ? '자동 진행 중...' : '건너뛰고 재시작'}
                </button>
            </div>
          </div>
        );

      default:
        return <div>알 수 없는 게임 상태</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 text-slate-100">
      {renderScreen()}
      <ModalComponent
        isOpen={isResetConfirmModalOpen}
        onClose={() => setIsResetConfirmModalOpen(false)}
        onConfirm={() => {
          executeFullGameReset();
          setIsResetConfirmModalOpen(false);
        }}
        title="게임 초기화 확인"
        confirmText="초기화"
        cancelText="취소"
      >
        <p>정말로 모든 진행 상황 (마스터리, 승천 포함)을 초기화하고 게임을 처음부터 다시 시작하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
      </ModalComponent>
    </div>
  );
};

export default App;
