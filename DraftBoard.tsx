import React from 'react';
import { useLiveDraftStore, LivePick } from '@/lib/liveDraftStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';

export function DraftBoard() {
  const { picks, teams, draftState, players } = useLiveDraftStore();
  
  const currentPickIndex = draftState ? (draftState.currentPick || 1) - 1 : 0;
  
  const mlRounds = 16;
  const milRounds = 10;
  
  const getPicksForRound = (roundNum: number, phaseType: 'ML' | 'MiL') => {
    return picks.filter(p => p.round === roundNum && p.phase === phaseType)
      .sort((a, b) => a.pickInRound - b.pickInRound);
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/20">
        <h3 className="font-display text-lg font-bold tracking-wide">Draft Board</h3>
      </div>
      
      <ScrollArea className="flex-1 w-full">
        <div className="min-w-[1200px] p-6 space-y-8">
          
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Major League Draft</Badge>
              <span className="text-xs text-muted-foreground">16 Rounds • 4-Year Contracts</span>
            </div>
            
            <div className="grid grid-cols-[auto_repeat(10,1fr)] gap-2">
              <div className="w-12 text-right pr-2 text-xs font-bold text-muted-foreground self-center">Rd</div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="font-bold text-xs truncate px-1 text-muted-foreground">Pick {i + 1}</div>
                </div>
              ))}

              {Array.from({ length: mlRounds }).map((_, i) => {
                const roundNum = i + 1;
                const roundPicks = getPicksForRound(roundNum, 'ML');
                
                return (
                  <React.Fragment key={`ml-round-${roundNum}`}>
                    <div className="flex items-center justify-center font-mono text-xs text-muted-foreground font-bold">
                      {roundNum}
                    </div>
                    {roundPicks.map(pick => (
                      <PickCell key={pick.pickNumber} pick={pick} currentPickIndex={currentPickIndex} teams={teams} players={players} />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4 pt-4 border-t border-border/50">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Minor League Draft</Badge>
              <span className="text-xs text-muted-foreground">10 Rounds • 2-Year Contracts</span>
            </div>
            
             <div className="grid grid-cols-[auto_repeat(10,1fr)] gap-2">
              {Array.from({ length: milRounds }).map((_, i) => {
                const roundNum = i + 1;
                const roundPicks = getPicksForRound(roundNum, 'MiL');
                
                return (
                  <React.Fragment key={`mil-round-${roundNum}`}>
                    <div className="flex items-center justify-center font-mono text-xs text-muted-foreground font-bold">
                      {roundNum}
                    </div>
                    {roundPicks.map(pick => (
                      <PickCell key={pick.pickNumber} pick={pick} currentPickIndex={currentPickIndex} teams={teams} players={players} />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

function PickCell({ pick, currentPickIndex, teams, players }: { 
  pick: LivePick; 
  currentPickIndex: number;
  teams: any[];
  players: any[];
}) {
  const player = pick.playerId ? players.find(p => p.id === pick.playerId) : null;
  const team = teams.find(t => t.id === pick.teamId);
  const isCurrent = pick.pickNumber === currentPickIndex + 1;
  
  return (
    <div 
      className={cn(
        "h-14 rounded border flex flex-col justify-center px-2 text-[10px] relative overflow-hidden transition-all",
        isCurrent ? "bg-primary/20 border-primary ring-1 ring-primary animate-pulse" : "bg-background/50 border-border/40",
        player?.isOTL ? "bg-amber-950/30 border-amber-900/50" : ""
      )}
    >
      {player ? (
        <>
           <div className="font-bold truncate text-foreground flex items-center gap-1">
             {player.name}
             {pick.isOTL && <Coins className="h-3 w-3 text-amber-500 inline" />}
           </div>
           <div className="flex justify-between items-center text-muted-foreground/80 mt-1">
             <span>{player.positions.join('/')}</span>
             <span className="uppercase text-[9px] font-bold text-primary/80">{team?.name}</span>
           </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full opacity-60">
          {isCurrent ? (
             <>
               <span className="text-primary font-bold text-[10px]">ON CLOCK</span>
               <span className="text-xs font-bold truncate max-w-full">{team?.name}</span>
             </>
          ) : (
             <span className="text-muted-foreground font-medium truncate max-w-full text-[10px]">{team?.name}</span>
          )}
        </div>
      )}
      
      <div className="absolute top-0.5 right-1 text-[8px] opacity-30 font-mono">
        {pick.pickNumber}
      </div>
    </div>
  );
}
