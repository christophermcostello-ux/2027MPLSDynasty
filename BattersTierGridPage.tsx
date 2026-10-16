import React, { useMemo, useState, useEffect } from 'react';
import { useDraftData } from '@/lib/useDraftData';
import { Player } from '@/lib/liveDraftStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import batterTierData from '@/lib/batter_tier_grid.json';

interface BatterTierEntry {
  id: string;
  name: string;
  tier: number;
  positions: string[];
}

const GRID_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'CF', 'OF'] as const;
const TIERS = [1, 2, 3, 4, 5, 6, 7] as const;

const TIER_COLORS = [
  'bg-emerald-900/40 border-emerald-600/50',
  'bg-teal-900/40 border-teal-600/50',
  'bg-cyan-900/40 border-cyan-600/50',
  'bg-sky-900/40 border-sky-600/50',
  'bg-indigo-900/40 border-indigo-600/50',
  'bg-violet-900/40 border-violet-600/50',
  'bg-purple-900/40 border-purple-600/50',
];

const QUEUE_STORAGE_KEY = 'draft-queue';
const MAX_QUEUE_SIZE = 12;
const OTL_PICK_CAP = 10;

function getStoredQueue(): string[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: string[]) {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

function formatDisplayName(name: string): string {
  if (name === 'Michael Harris II') return 'Harris';
  if (name === 'Nacho Alvarez Jr') return 'Alvarez';
  return name.split(' ').pop() || name;
}

export default function BattersTierGridPage() {
  const { picks, players, makePick, phase, currentPickIndex, teams, draftedPlayerIds } = useDraftData();
  const { toast } = useToast();
  const [localQueue, setLocalQueue] = useState<string[]>(() => getStoredQueue());

  const currentPick = picks[currentPickIndex];

  useEffect(() => {
    saveQueue(localQueue);
  }, [localQueue]);

  useEffect(() => {
    setLocalQueue(prev => prev.filter(id => !draftedPlayerIds.has(id)));
  }, [draftedPlayerIds]);

  const toggleQueue = (playerId: string) => {
    setLocalQueue(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= MAX_QUEUE_SIZE) return prev;
      return [...prev, playerId];
    });
  };

  const removeFromQueue = (playerId: string) => {
    setLocalQueue(prev => prev.filter(id => id !== playerId));
  };

  const gridData = useMemo(() => {
    const data: Record<number, Record<string, BatterTierEntry[]>> = {};
    
    TIERS.forEach(tier => {
      data[tier] = {};
      GRID_POSITIONS.forEach(pos => {
        data[tier][pos] = [];
      });
    });

    (batterTierData as BatterTierEntry[]).forEach(entry => {
      if (draftedPlayerIds.has(entry.id)) return;
      
      const hasCF = entry.positions.includes('CF');
      const addedToOF = new Set<string>();
      
      entry.positions.forEach(pos => {
        if (pos === 'C') data[entry.tier]['C'].push(entry);
        else if (pos === '1B') data[entry.tier]['1B'].push(entry);
        else if (pos === '2B') data[entry.tier]['2B'].push(entry);
        else if (pos === 'SS') data[entry.tier]['SS'].push(entry);
        else if (pos === '3B') data[entry.tier]['3B'].push(entry);
        else if (pos === 'CF') data[entry.tier]['CF'].push(entry);
        else if ((pos === 'LF' || pos === 'RF') && !hasCF && !addedToOF.has(entry.id)) {
          data[entry.tier]['OF'].push(entry);
          addedToOF.add(entry.id);
        }
      });
    });

    return data;
  }, [draftedPlayerIds]);

  const handleClick = (entry: BatterTierEntry) => {
    if (draftedPlayerIds.has(entry.id)) return;
    
    if (localQueue.includes(entry.id)) {
      toggleQueue(entry.id);
      return;
    }
    
    if (localQueue.length >= MAX_QUEUE_SIZE) {
      toast({
        title: "Queue is full",
        description: `Maximum ${MAX_QUEUE_SIZE} players allowed`,
        variant: "destructive",
      });
      return;
    }
    
    toggleQueue(entry.id);
  };

  const currentTeam = currentPick ? teams.find(t => t.id === currentPick.ownerTeamId) : null;
  const isDraftComplete = !currentPick;
  const otlPicksUsed = picks.filter(p => p.isOTL).length;
  const isOtlCapReached = otlPicksUsed >= OTL_PICK_CAP;

  const canDraftOTL = () => {
    if (!currentPick || !currentTeam) return false;
    if (phase !== 'ML') return false;
    if (currentTeam.otlTokens <= 0) return false;
    if (isOtlCapReached) return false;
    return true;
  };

  const handleDraft = async (player: Player) => {
    const success = await makePick(player.id, player.isOTL);
    if (success) {
      removeFromQueue(player.id);
    }
  };

  const queuedPlayers = localQueue.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];

  return (
    <div className="flex flex-col p-4 max-w-[1600px] mx-auto w-full gap-4" style={{ height: 'calc(100vh - 96px)' }}>
      <div className="bg-card border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Queue</span>
          <Badge variant="secondary" className="h-5 px-2 text-xs">{localQueue.length}/{MAX_QUEUE_SIZE}</Badge>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1">
          {Array.from({ length: MAX_QUEUE_SIZE }).map((_, idx) => {
            const player = queuedPlayers[idx];
            const isAlreadyDrafted = player ? draftedPlayerIds.has(player.id) : false;
            const canDraftFromQueue = player && !isDraftComplete && !isAlreadyDrafted && (player.isOTL ? canDraftOTL() : true);
            return (
              <div 
                key={idx} 
                className={cn(
                  "h-10 rounded border text-xs flex items-center px-1 overflow-hidden",
                  player ? "bg-card border-primary/30" : "bg-muted/20 border-dashed border-muted-foreground/30 justify-center"
                )}
                data-testid={`tier-queue-slot-${idx}`}
              >
                {player ? (
                  <div className="flex items-center gap-1 w-full">
                    <button
                      onClick={() => removeFromQueue(player.id)}
                      className="text-amber-500 hover:text-amber-400 flex-shrink-0"
                    >
                      <Star className="h-3 w-3 fill-current" />
                    </button>
                    <span 
                      className="truncate font-medium flex-1" 
                      style={{ fontSize: 'var(--font-size-queue, 11px)' }}
                      title={`${player.name} (${player.positions.join('/')})`}
                    >
                      {player.name}
                    </span>
                    <Button
                      size="sm"
                      className={cn(
                        "h-5 px-1.5 text-[9px] font-bold flex-shrink-0",
                        canDraftFromQueue 
                          ? "bg-green-600 hover:bg-green-500 text-white" 
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                      onClick={() => canDraftFromQueue && handleDraft(player)}
                      disabled={!canDraftFromQueue}
                    >
                      +
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground/50 text-[10px]">{idx + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-card border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-lg font-bold">Batters Tier Grid</h2>
          <span className="text-xs text-muted-foreground">Click to add to queue</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left font-bold text-muted-foreground w-12 border-b-2 border-muted-foreground/30">Tier</th>
                  {GRID_POSITIONS.map(pos => (
                    <th 
                      key={pos} 
                      className={cn(
                        "px-2 py-2 text-center font-bold text-muted-foreground border-b-2 border-muted-foreground/30",
                        pos === 'OF' && "col-span-2"
                      )}
                      colSpan={pos === 'OF' ? 2 : 1}
                    >
                      {pos}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier, tierIdx) => (
                  <tr key={tier} className={cn("border-2", TIER_COLORS[tierIdx])}>
                    <td className="px-2 py-3 font-bold text-center align-top text-xl border-r border-muted-foreground/20">{tier}</td>
                    {GRID_POSITIONS.map(pos => (
                      <td 
                        key={pos} 
                        className={cn(
                          "px-1 py-2 align-top border-r border-muted-foreground/20",
                          pos === 'OF' && "min-w-[160px]"
                        )}
                        colSpan={pos === 'OF' ? 2 : 1}
                      >
                        <div className={cn(
                          "flex flex-col gap-1",
                          pos === 'OF' && "grid grid-cols-2 gap-1"
                        )}>
                          {gridData[tier][pos].map((entry, idx) => {
                            const isQueued = localQueue.includes(entry.id);
                            return (
                              <button
                                key={`${entry.id}-${pos}-${idx}`}
                                onClick={() => handleClick(entry)}
                                className={cn(
                                  "px-2 py-1 rounded text-xs truncate text-left transition-colors w-full",
                                  isQueued 
                                    ? "bg-amber-600/80 text-white" 
                                    : "bg-muted/60 hover:bg-primary/20 text-foreground"
                                )}
                                title={entry.name}
                                data-testid={`tier-grid-player-${entry.id}`}
                              >
                                {formatDisplayName(entry.name)}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
