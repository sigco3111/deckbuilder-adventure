

export enum CardType {
  ATTACK = 'ATTACK', // 공격
  SKILL = 'SKILL',   // 스킬
  CURSE = 'CURSE',   // 저주
  // POWER = 'POWER', // Future
}

export enum TargetType {
  SELF = 'SELF',
  SINGLE_ENEMY = 'SINGLE_ENEMY',
  ALL_ENEMIES = 'ALL_ENEMIES', 
  NONE = 'NONE',
}

export type EffectType = 'DAMAGE' | 'BLOCK' | 'DRAW' | 'GAIN_ENERGY' | 'HEAL' | 'APPLY_BUFF' | 'RETRIEVE_FROM_DISCARD_TO_DRAW_TOP' | 'DISCARD_HAND_RANDOM' | 'REMOVE_ALL_BLOCK' | 'EXHAUST_SELF' | 'EXHAUST_FROM_HAND_RANDOM';

export interface CardEffect {
  type: EffectType;
  value?: number; // For DAMAGE, BLOCK, DRAW, GAIN_ENERGY, HEAL, RETRIEVE_FROM_DISCARD_TO_DRAW_TOP (specifies how many cards), DISCARD_HAND_RANDOM (how many cards), EXHAUST_FROM_HAND_RANDOM (how many cards)
  target?: TargetType; // Optional: overrides card targetType if needed for specific effects
  ignoresBlock?: boolean; // For DAMAGE effect to ignore block

  // For APPLY_BUFF effect type
  buffName?: string; // e.g., '힘', '취약'
  buffValue?: number; // Potency of the buff (e.g., 2 strength)
  buffDuration?: number; // Duration in turns (-1 for permanent in combat)
}

export interface Card {
  id: string; // Unique instance ID
  definitionId: string; // ID of the card definition (e.g. "STRIKE_CARD")
  name: string;
  cost: number;
  type: CardType;
  description: string;
  effects: CardEffect[];
  targetType: TargetType;
  rarity?: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SPECIAL'; // Special for curses, etc.
  artUrl?: string;
  upgraded?: boolean; // For card upgrades
  masteryLevel?: number; // For permanent player-driven upgrades, cumulative. Level 0 or undefined means not mastered.
}

export interface Buff {
  id: string; // Unique instance ID of this buff application
  name: string; // 예: '힘', '취약'
  value: number; // Potency of the buff (e.g. amount of Strength, stacks/intensity of Vulnerable)
  duration: number; // Turns, or -1 for permanent until end of combat
  description: string; // 예: '힘 +2', '취약 (2턴)' - Can be dynamically generated
  icon: string; // Emoji or SVG path
  sourceCardId?: string; // Optional: ID of the card that applied this buff
  sourceCharacterId?: string; // Optional: ID of the character that applied this buff
}

export interface CharacterState {
  id:string; // For player, it's 'player'. For enemies, it's their definition key (e.g. 'GOBLIN_GRUNT')
  name: string;
  maxHp: number;
  hp: number;
  block: number;
  buffs: Buff[];
}

export interface PlayerState extends CharacterState {
  energy: number;
  maxEnergy: number;
  deck: Card[];
  hand: Card[];
  drawPile: Card[];
  discardPile: Card[];
  exhaustPile: Card[]; // Added for Exhaust mechanic
  gold: number;
  cardCombatStats: Record<string, { // Tracks temporary, combat-specific card data
    glassKnifeDamage?: number;      // Current damage for Glass Knife
    rampageDamageBonus?: number; // For Rampage card
    // Add other card-specific combat stats here
  }>;
}

export interface EnemyIntent {
  type: 'ATTACK' | 'DEFEND' | 'BUFF' | 'DEBUFF' | 'SPECIAL' | 'UNKNOWN';
  value?: number; // e.g., base damage amount for attack, block amount for defend
  description: string;
  target?: TargetType; // For display purposes, usually SINGLE_ENEMY (player) or SELF
  updatedSelfState?: EnemyState; // Holds enemy state if modified during intent generation (e.g. after applying self-buff as part of intent)
}

export type EnemyBehavior = {
  getNextIntent: (self: EnemyState, player: PlayerState) => EnemyIntent;
  performAction: (self: EnemyState, player: PlayerState, intent: EnemyIntent) => {
    updatedPlayer: PlayerState;
    updatedSelf: EnemyState;
    log: string;
  };
};

export interface EnemyState extends CharacterState {
  intent: EnemyIntent | null;
  uiId: string; // Unique ID for React keys and targeting, separate from potential multiple enemies of same type
  behavior: EnemyBehavior;
}

export enum GameScreen {
  MAP = 'MAP',
  BATTLE = 'BATTLE',
  REWARD = 'REWARD',
  DECK_VIEW = 'DECK_VIEW', 
  GAME_OVER = 'GAME_OVER',
  GAME_WON = 'GAME_WON',
  POST_RUN_MASTERY = 'POST_RUN_MASTERY', // Screen for choosing a card to master
}

export interface MapNodeData {
  type: 'ENEMY' | 'ELITE' | 'BOSS' | 'REST' | 'SHOP' | 'EVENT' | 'START';
  enemyKeys?: string[]; // Key to an EnemyDefinition, now an array for multiple enemies
  isBoss?: boolean;
}

export interface GameMapNode extends MapNodeData {
  id: string; // e.g. "floor-1-node-0"
  floor: number;
  cleared: boolean;
}

export interface GameMap {
  floors: GameMapNode[][]; // Array of floors, each floor is an array of nodes
  currentFloor: number;
  // Add path information if implementing branching paths
}

export type GameConclusion = 'WIN_BOSS_CLEAR' | 'LOSS' | null;

export interface GameState {
  player: PlayerState;
  currentEnemies: EnemyState[];
  currentScreen: GameScreen;
  currentMap: GameMap;
  currentEncounterNodeId: string | null; // ID of the map node for current battle
  battleLog: string[];
  turn: number; // Current turn number in battle
  availableRewards: Card[]; // Cards offered after winning a battle
  ascensionLevel: number; // Current ascension level for the run
  gameConclusion: GameConclusion;
  gameAttemptNumber: number; // Tracks how many games have been started
}

export interface EnemyDefinition {
  key: string;
  name: string;
  maxHp: number;
  artUrl: string;
  behavior: EnemyBehavior;
  isElite?: boolean; // To easily identify elites for ascension modifiers
}