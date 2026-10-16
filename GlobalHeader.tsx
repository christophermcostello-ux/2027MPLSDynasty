import React, { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useLiveDraftStore, HITTER_SLOTS, PITCHER_SLOTS } from '@/lib/liveDraftStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Pause, Undo, Crown, Users, List, Grid3X3, Shield, Radio, Wifi, WifiOff } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { FontSizeToggle } from '@/components/font-size-toggle';

export function GlobalHeader() {
  const [location] = useLocation();
  const { roomId, isConnected, teams, picks, draftState, players } = useLiveDraftStore();
  
  const searchParams = typeof window !== 'undefined' ? window.location.search : '';

  const currentPickIndex = useMemo(() => {
    if (draftState) {
      return (draftState.currentPick || 1) - 1;
    }
    return 0;
  }, [draftState]);

  const isPaused = draftState?.isPaused ?? false;

  // Map picks to display format
  const displayPicks = useMemo(() => {
    return picks.map((p) => ({
      id: `live-${p.pickNumber}`,
      overallPickNumber: p.pickNumber,
      round: p.round,
      pickInRound: p.pickInRound,
      phase: p.phase,
      ownerTeamId: p.teamId,
      playerId: p.playerId,
      playerName: p.playerName,
      isOTL: p.isOTL,
    }));
  }, [picks]);

  const currentPick = displayPicks[currentPickIndex];
  const currentTeam = currentPick ? teams.find(t => t.id === currentPick.ownerTeamId) : null;
  const nextPick = displayPicks[currentPickIndex + 1];
  const nextTeam = nextPick ? teams.find(t => t.id === nextPick.ownerTeamId) : null;
  const thirdPick = displayPicks[currentPickIndex + 2];
  const thirdTeam = thirdPick ? teams.find(t => t.id === thirdPick.ownerTeamId) : null;

  const completedPicks = useMemo(() => displayPicks.filter(p => p.playerId), [displayPicks]);
  
  const lastCompletedPick = completedPicks.length > 0 ? completedPicks[completedPicks.length - 1] : null;
  const lastPickTeam = lastCompletedPick ? teams.find(t => t.id === lastCompletedPick.ownerTeamId) : null;
  const lastPickPlayer = useMemo(() => {
    if (!lastCompletedPick?.playerId) return null;
    return players.find(p => p.id === lastCompletedPick.playerId) || null;
  }, [lastCompletedPick, players]);

  const previousCompletedPick = completedPicks.length > 1 ? completedPicks[completedPicks.length - 2] : null;
  const previousPickTeam = previousCompletedPick ? teams.find(t => t.id === previousCompletedPick.ownerTeamId) : null;
  const previousPickPlayer = useMemo(() => {
    if (!previousCompletedPick?.playerId) return null;
    return players.find(p => p.id === previousCompletedPick.playerId) || null;
  }, [previousCompletedPick, players]);

  const NavLink = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
    const fullHref = href + searchParams;
    const isActive = location === href || location.startsWith(href + '?');
    return (
      <Link href={fullHref}>
        <Button 
          data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
          variant={isActive ? "secondary" : "ghost"} 
          size="sm" 
          className={cn("gap-2", isActive && "font-bold")}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </Link>
    );
  };

  // If no room, show join prompt
  if (!roomId) {
    return (
      <div className="sticky top-0 z-50 flex flex-col bg-background/95 backdrop-blur shadow-sm border-b">
        <div className="h-14 border-b px-4 flex items-center justify-center">
          <Link href="/live/dynasty2025">
            <Button data-testid="button-join-live-draft" variant="default" size="lg" className="gap-2 bg-red-600 hover:bg-red-700">
              <Radio className="h-5 w-5" />
              Join Live Draft
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 flex flex-col bg-background/95 backdrop-blur shadow-sm border-b">
      <div className="h-14 border-b px-4 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">On The Clock</span>
              {currentTeam ? (
                 <div className="flex items-center gap-2">
                   <span className="text-xl font-display font-bold text-primary">{currentTeam.name}</span>
                   <Badge variant="outline" className="font-mono text-[10px] h-5">
                     {currentPick.phase} {currentPick.round}.{currentPick.pickInRound}
                   </Badge>
                 </div>
              ) : (
                <span className="text-xl font-bold text-muted-foreground">Draft Complete</span>
              )}
            </div>

            {nextTeam && (
              <div className="hidden md:flex flex-col pl-4 border-l border-border/30 opacity-60">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">On Deck</span>
                <span className="text-sm font-semibold">{nextTeam.name}</span>
              </div>
            )}

            {thirdTeam && (
              <div className="hidden lg:flex flex-col pl-4 border-l border-border/30 opacity-40">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">In The Hole</span>
                <span className="text-sm font-semibold">{thirdTeam.name}</span>
              </div>
            )}
         </div>

         <div className="flex items-center gap-4">
            <div className="flex flex-col items-center px-4 py-1 bg-card border rounded min-w-[140px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Last Pick</span>
              {lastPickTeam && lastPickPlayer ? (
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">{lastPickTeam.name}</span>
                  <div className="text-sm font-bold">
                    <span>{lastPickPlayer.name} <span className="text-muted-foreground font-normal">({lastPickPlayer.positions.join('/')})</span></span>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>

            <div className="hidden sm:flex flex-col items-center px-4 py-1 bg-muted/30 border rounded min-w-[140px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Previous Pick</span>
              {previousPickTeam && previousPickPlayer ? (
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">{previousPickTeam.name}</span>
                  <div className="text-sm font-bold">
                    <span>{previousPickPlayer.name} <span className="text-muted-foreground font-normal">({previousPickPlayer.positions.join('/')})</span></span>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
         </div>

         <div className="flex items-center gap-2">
            <FontSizeToggle />
            <ModeToggle />
         </div>
      </div>

      <div className="h-10 px-4 flex items-center gap-2 overflow-x-auto">
        <div 
          data-testid="status-connection"
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold mr-2",
            isConnected 
              ? "bg-green-500/20 text-green-500 border border-green-500/30" 
              : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
          )}
        >
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          LIVE: {roomId}
        </div>
        
        <NavLink href="/" icon={Users} label="Players" />
        <NavLink href="/board" icon={Grid3X3} label="Draft Board" />
        <NavLink href="/rosters" icon={Shield} label="Rosters" />
        <NavLink href="/log" icon={List} label="Pick Log" />
        <Link href={`/live/${roomId}`}>
          <Button data-testid="link-live-draft" variant="default" size="sm" className="gap-2 bg-red-600 hover:bg-red-700">
            <Radio className="h-4 w-4" />
            Live Draft
          </Button>
        </Link>
      </div>
    </div>
  );
}
