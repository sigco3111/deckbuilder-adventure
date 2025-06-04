

import { Card, PlayerState } from '../types';
import { ALL_GAME_CARDS } from '../constants'; // For refreshing card defs if needed

// Fisher-Yates shuffle
export function shuffleArray<T,>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export const drawCards = (player: PlayerState, count: number): { updatedPlayer: PlayerState, drawnCards: Card[] } => {
  const newPlayer = JSON.parse(JSON.stringify(player)) as PlayerState; // Deep copy
  let cardsToDraw = count;
  const actualDrawnCards: Card[] = [];

  for (let i = 0; i < cardsToDraw; i++) {
    if (newPlayer.drawPile.length === 0) {
      if (newPlayer.discardPile.length === 0) {
        break; // No cards left anywhere
      }
      newPlayer.drawPile = shuffleArray(newPlayer.discardPile);
      newPlayer.discardPile = [];
    }
    if (newPlayer.drawPile.length > 0) {
      const card = newPlayer.drawPile.pop();
      if (card) {
        actualDrawnCards.push(card);
      }
    }
  }
  newPlayer.hand = [...newPlayer.hand, ...actualDrawnCards];
  return { updatedPlayer: newPlayer, drawnCards: actualDrawnCards };
};

export const createCardInstance = (cardDefinition: Card, uniqueSuffix: string | number): Card => {
  // localStorage key for mastered cards changed to 'masteredCardLevels' to reflect structure change
  const masteredCardLevels: Record<string, number> = JSON.parse(localStorage.getItem('masteredCardLevels') || '{}');
  const masteryLevel = masteredCardLevels[cardDefinition.definitionId] || 0;

  // Ensure we are using the base definition, not an already instanced card for definition.
  const baseDefinition = ALL_GAME_CARDS.find(c => c.definitionId === cardDefinition.definitionId) || cardDefinition;

  return {
    ...baseDefinition, // Spread the base definition
    id: `${baseDefinition.definitionId}_${uniqueSuffix}_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, // Ensure unique ID
    masteryLevel: masteryLevel, // Set mastery level
  };
};