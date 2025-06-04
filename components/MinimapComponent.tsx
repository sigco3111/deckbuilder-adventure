
import React from 'react';
import { GameState, MapNodeData } from '../types'; 
import { ALL_ENEMY_DEFINITIONS } from '../constants'; 

interface MinimapProps {
  gameMap: GameState['currentMap'];
  currentPlayerMapFloor: number; 
}

const MinimapComponent: React.FC<MinimapProps> = ({ gameMap, currentPlayerMapFloor }) => {
  const getNodeIcon = (type: MapNodeData['type']) => {
    switch (type) {
      case 'ENEMY': return '⚔️'; 
      case 'ELITE': return '💀'; 
      case 'BOSS': return '👑'; 
      case 'REST': return '♨️';
      default: return '❓';
    }
  };

  return (
    <div className="p-3 bg-slate-700 rounded-lg shadow-lg my-4 w-full max-w-md mx-auto">
      <h3 className="text-md font-semibold text-amber-300 mb-3 text-center">미니맵</h3>
      <div className="space-y-1.5">
        {gameMap.floors.map((floorNodes, floorIndex) => (
          <div
            key={`map-floor-${floorIndex}`}
            className={`flex items-center justify-start space-x-2 p-1.5 rounded
                        ${floorIndex === currentPlayerMapFloor ? 'bg-sky-600 ring-2 ring-sky-400' : 'bg-slate-600'}`}
          >
            <span className="text-xs font-bold w-8 text-center text-slate-200">{floorIndex + 1}F:</span>
            <div className="flex flex-wrap gap-1">
              {floorNodes.map(node => {
                const isCurrentActiveNode = floorIndex === currentPlayerMapFloor &&
                                            floorNodes.length === 1 && 
                                            !node.cleared;

                let icon = getNodeIcon(node.type);
                if (node.type === 'ELITE') icon = '💀'; 
                
                let displayTitle: string;
                const nodeTypeForDisplay = node.type; 

                if (node.enemyKeys && node.enemyKeys.length > 0) {
                  const enemyNames = node.enemyKeys.map(key => ALL_ENEMY_DEFINITIONS[key]?.name || '알 수 없는 적').join(', ');
                  displayTitle = `${nodeTypeForDisplay}: ${enemyNames}`;
                } else if (node.type === 'REST') {
                  displayTitle = '휴식처';
                } else {
                  displayTitle = nodeTypeForDisplay;
                }
                displayTitle += ` - ${node.cleared ? '완료' : '미완료'}`;
                                
                return (
                  <span
                    key={node.id}
                    title={displayTitle}
                    className={`w-6 h-6 flex items-center justify-center rounded text-sm
                                ${node.cleared ? 'opacity-50 bg-slate-500' : (node.type === 'ELITE' ? 'bg-yellow-500 text-slate-900' : (node.type === 'BOSS' ? 'bg-red-500 text-white' :'bg-slate-400 text-slate-800'))}
                                ${isCurrentActiveNode ? 'animate-pulse ring-2 ring-yellow-300' : ''}
                              `}
                  >
                    {icon}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MinimapComponent;
