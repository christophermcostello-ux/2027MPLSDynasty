import React, { useState, useMemo } from 'react';
import { Player, HITTER_SLOTS, PITCHER_SLOTS } from '@/lib/liveDraftStore';
import { useDraftData, UnifiedTeam } from '@/lib/useDraftData';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function TeamsPage() {
  const { teams, players, picks } = useDraftData();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id.toString() || "1");
  
  const selectedTeam = teams.find(t => t.id === parseInt(selectedTeamId));
  
  const teamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    
    const draftedPicks = picks.filter(p => p.ownerTeamId === selectedTeam.id && p.playerId);
    const draftedPlayers = draftedPicks.map(p => players.find(pl => pl.id === p.playerId)).filter(Boolean) as Player[];
    
    const keeperIds = selectedTeam.keepers || [];
    const keeperPlayers = keeperIds.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];

    return [...draftedPlayers, ...keeperPlayers]; 
  }, [selectedTeam, picks, players]);

  const batters = teamPlayers.filter(p => p.type === 'Batter');
  const pitchers = teamPlayers.filter(p => p.type === 'Pitcher');

  if (!selectedTeam) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-full p-4 space-y-4 max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-3 bg-card p-4 rounded-lg border">
         <h1 className="text-2xl font-display font-bold">Team Rosters</h1>
         <div className="flex flex-wrap gap-2">
           {teams.map(t => (
             <Button
               key={t.id}
               variant={selectedTeamId === t.id.toString() ? "default" : "outline"}
               size="sm"
               className={cn(
                 "h-8 px-3 text-xs font-medium",
                 selectedTeamId === t.id.toString() && "bg-primary text-primary-foreground"
               )}
               onClick={() => setSelectedTeamId(t.id.toString())}
               data-testid={`team-btn-${t.id}`}
             >
               {t.name}
             </Button>
           ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
        
        <Card className="flex flex-col overflow-hidden h-full">
          <CardHeader className="py-3 bg-muted/30">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Batters ({batters.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-2 space-y-2">
            {batters.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">No batters</p>
            ) : (
              batters.map(player => (
                <div key={player.id} className="flex items-center justify-between p-2 rounded bg-background border border-border/60">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{player.name}</span>
                    <span className="text-[10px] text-muted-foreground">{player.positions.join('/')} • {player.team}</span>
                  </div>
                  <Badge variant="outline">{player.positions[0]}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden h-full">
          <CardHeader className="py-3 bg-muted/30">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Pitchers ({pitchers.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-2 space-y-2">
            {pitchers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">No pitchers</p>
            ) : (
              pitchers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-2 rounded bg-background border border-border/60">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{player.name}</span>
                    <span className="text-[10px] text-muted-foreground">{player.role || 'P'} • {player.team}</span>
                  </div>
                  <Badge variant="outline">{player.role || 'P'}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
