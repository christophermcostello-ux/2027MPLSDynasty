import React from 'react';
import { useLiveDraftStore } from '@/lib/liveDraftStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coins, Users } from 'lucide-react';

export function PickHistory() {
  const { picks, players, teams, draftState } = useLiveDraftStore();
  
  const currentPickIndex = draftState ? (draftState.currentPick || 1) - 1 : 0;
  
  // Get executed picks in reverse order
  const executedPicks = picks
    .filter(p => p.playerId)
    .reverse();

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/20">
        <h3 className="font-display text-lg font-bold tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" /> 
          Recent Picks
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {executedPicks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Draft hasn't started yet.
            </div>
          ) : (
            executedPicks.map((pick) => {
              const player = players.find(p => p.id === pick.playerId);
              const team = teams.find(t => t.id === pick.teamId);
              
              if (!player || !team) return null;

              return (
                <div key={pick.pickNumber} className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center h-8 w-8 bg-background rounded border border-border/50 text-[10px] font-mono text-muted-foreground">
                      <span>{pick.pickNumber}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground flex items-center gap-1">
                        {player.name}
                        {pick.isOTL && <Coins className="h-3 w-3 text-amber-500" />}
                      </span>
                      <span className="text-xs text-muted-foreground">{player.positions.join('/')} • {player.team}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-semibold text-primary/90">{team.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      {pick.phase} {pick.round}.{pick.pickInRound}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
