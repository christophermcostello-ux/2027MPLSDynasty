import { useState, useEffect, useMemo } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Pause, Play, RotateCcw, RefreshCw, Settings, Users, Clock, Download, Search, Send } from 'lucide-react';
import { useLiveDraftStore } from '@/lib/liveDraftStore';

interface Team {
  id: number;
  teamId: number;
  name: string;
  orderIndex: number;
  otlTokens: number;
}

interface Pick {
  id: number;
  pickNumber: number;
  round: number;
  pickInRound: number;
  phase: string;
  teamId: number;
  playerId: string | null;
  playerName: string | null;
  isOtl: boolean;
}

interface DraftState {
  currentPickNumber: number;
  onClockTeamId: number | null;
  phase: string;
  isPaused: boolean;
  updatedAt: string;
}

interface LiveState {
  teams: Team[];
  picks: Pick[];
  state: DraftState | null;
  serverTime: number;
}

export function LiveDraftPage() {
  const [, params] = useRoute('/live/:roomId');
  const roomId = params?.roomId || '';
  
  const { setLiveMode, teams: sharedTeams, picks: sharedPicks, draftState: sharedState, isConnected, lastUpdated } = useLiveDraftStore();
  
  useEffect(() => {
    if (roomId) {
      setLiveMode(roomId);
    }
  }, [roomId, setLiveMode]);
  
  const liveState: LiveState | null = useMemo(() => {
    if (sharedTeams.length === 0 && sharedPicks.length === 0) return null;
    return {
      teams: sharedTeams.map(t => ({ id: 0, teamId: t.id, name: t.name, orderIndex: 0, otlTokens: t.otlTokens })),
      picks: sharedPicks.map(p => ({
        id: 0,
        pickNumber: p.pickNumber,
        round: p.round,
        pickInRound: p.pickInRound,
        phase: p.phase,
        teamId: p.teamId,
        playerId: p.playerId,
        playerName: p.playerName,
        isOtl: p.isOTL
      })),
      state: sharedState ? {
        currentPickNumber: sharedState.currentPick,
        onClockTeamId: sharedState.onClockTeamId,
        phase: sharedState.phase,
        isPaused: sharedState.isPaused,
        updatedAt: ''
      } : null,
      serverTime: Date.now()
    };
  }, [sharedTeams, sharedPicks, sharedState]);
  
  const lastSync = useMemo(() => lastUpdated ? new Date(lastUpdated) : null, [lastUpdated]);
  const syncError = !isConnected && lastUpdated > 0;
  
  const [activeTeamId, setActiveTeamId] = useState<number | null>(() => {
    const stored = sessionStorage.getItem(`live-team-${roomId}`);
    return stored ? parseInt(stored) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem(`live-logged-in-${roomId}`) === 'true';
  });
  const [roomCode, setRoomCode] = useState(() => {
    return sessionStorage.getItem(`live-room-code-${roomId}`) || '';
  });
  const [commishPin, setCommishPin] = useState('');
  const [isCommissioner, setIsCommissioner] = useState(() => {
    return sessionStorage.getItem(`live-commissioner-${roomId}`) === 'true';
  });
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCommishModal, setShowCommishModal] = useState(false);
  const [showRoomCodeModal, setShowRoomCodeModal] = useState(!roomCode);
  
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [useOtl, setUseOtl] = useState(false);
  const [showPickModal, setShowPickModal] = useState(false);
  const [pickForTeamId, setPickForTeamId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const players = useLiveDraftStore(state => state.players);
  const updateState = useLiveDraftStore(state => state.updateState);
  
  const fetchState = async () => {
    try {
      const res = await fetch(`/api/live/${roomId}/state`);
      if (res.ok) {
        const data = await res.json();
        updateState(
          (data.teams || []).map((t: any) => ({ id: t.teamId, name: t.name, otlTokens: t.otlTokens })),
          (data.picks || []).map((p: any) => ({
            pickNumber: p.pickNumber,
            round: p.round,
            pickInRound: p.pickInRound,
            phase: p.phase as 'ML' | 'MiL',
            teamId: p.teamId,
            teamName: data.teams?.find((t: any) => t.teamId === p.teamId)?.name || '',
            playerId: p.playerId,
            playerName: p.playerName,
            isOTL: p.isOtl,
            timestamp: p.timestamp
          })),
          {
            currentPick: data.currentPick || 1,
            onClockTeamId: data.onClockTeamId,
            isPaused: data.isPaused || false,
            phase: data.phase || 'ML'
          }
        );
      }
    } catch (e) {
    }
  };
  
  const handleLogin = () => {
    if (!activeTeamId) return;
    sessionStorage.setItem(`live-team-${roomId}`, String(activeTeamId));
    sessionStorage.setItem(`live-logged-in-${roomId}`, 'true');
    setIsLoggedIn(true);
    setShowLoginModal(false);
    toast({ title: "Logged in", description: `You are now drafting as ${liveState?.teams.find(t => t.teamId === activeTeamId)?.name}` });
  };
  
  const handleRoomCodeSubmit = () => {
    sessionStorage.setItem(`live-room-code-${roomId}`, roomCode);
    setShowRoomCodeModal(false);
  };
  
  const handleCommishLogin = async () => {
    setIsCommissioner(true);
    sessionStorage.setItem(`live-commissioner-${roomId}`, 'true');
    sessionStorage.setItem(`live-commish-pin-${roomId}`, commishPin);
    setShowCommishModal(false);
    toast({ title: "Commissioner Mode", description: "You now have commissioner access" });
  };
  
  const handlePause = async (isPaused: boolean) => {
    const pin = sessionStorage.getItem(`live-commish-pin-${roomId}`) || commishPin;
    const res = await fetch(`/api/live/${roomId}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commishPin: pin, roomCode, isPaused })
    });
    if (res.ok) {
      toast({ title: isPaused ? "Draft Paused" : "Draft Resumed" });
      fetchState();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.message, variant: "destructive" });
    }
  };
  
  const handleUndo = async () => {
    const pin = sessionStorage.getItem(`live-commish-pin-${roomId}`) || commishPin;
    const res = await fetch(`/api/live/${roomId}/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commishPin: pin, roomCode })
    });
    if (res.ok) {
      toast({ title: "Pick Undone" });
      fetchState();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.message, variant: "destructive" });
    }
  };
  
  const handleInitRoom = async () => {
    if (!confirm("This will reset the entire draft. Are you sure?")) return;
    
    const pin = sessionStorage.getItem(`live-commish-pin-${roomId}`) || commishPin;
    const res = await fetch(`/api/live/${roomId}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, commishPin: pin })
    });
    
    if (res.ok) {
      toast({ title: "Room Initialized", description: "Draft has been reset to pick 1" });
      fetchState();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.message, variant: "destructive" });
    }
  };

  const currentPick = liveState?.picks.find(p => p.pickNumber === liveState.state?.currentPickNumber);
  const onClockTeam = liveState?.teams.find(t => t.teamId === liveState.state?.onClockTeamId);
  const isMyTurn = isLoggedIn && activeTeamId === liveState?.state?.onClockTeamId;
  const recentPicks = liveState?.picks.filter(p => p.playerId).slice(-10).reverse() || [];
  
  const draftedPlayerIds = new Set(liveState?.picks.filter(p => p.playerId).map(p => p.playerId) || []);
  const availablePlayers = players.filter(p => {
    if (draftedPlayerIds.has(p.id)) return false;
    if (!playerSearch) return true;
    return p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
           p.team.toLowerCase().includes(playerSearch.toLowerCase());
  }).slice(0, 50);
  
  const handleMakePick = async () => {
    if (!selectedPlayerId) return;
    
    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return;
    
    const pin = isCommissioner ? (sessionStorage.getItem(`live-commish-pin-${roomId}`) || commishPin) : undefined;
    const teamToPickFor = isCommissioner && pickForTeamId ? pickForTeamId : (liveState?.state?.onClockTeamId || activeTeamId);
    
    const res = await fetch(`/api/live/${roomId}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: teamToPickFor,
        playerId: selectedPlayerId,
        playerName: player.name,
        isOtl: useOtl,
        roomCode,
        commishPin: pin
      })
    });
    
    if (res.ok) {
      toast({ title: "Pick Made!", description: `You drafted ${player.name}` });
      setSelectedPlayerId(null);
      setPlayerSearch('');
      setUseOtl(false);
      setShowPickModal(false);
      fetchState();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.message, variant: "destructive" });
    }
  };
  
  if (!roomId) {
    return <div className="p-8 text-center">No room ID specified</div>;
  }
  
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <Select 
              value={activeTeamId?.toString() || ''} 
              onValueChange={(v) => setActiveTeamId(parseInt(v))}
              disabled={isLoggedIn}
            >
              <SelectTrigger className="w-40" data-testid="team-select">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[9999] max-h-60 overflow-auto">
                {liveState?.teams && liveState.teams.length > 0 ? (
                  liveState.teams.map(team => (
                    <SelectItem key={team.teamId} value={team.teamId.toString()}>
                      {team.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">Loading teams...</div>
                )}
              </SelectContent>
            </Select>
            
            {!isLoggedIn ? (
              <Button 
                onClick={() => setShowLoginModal(true)} 
                disabled={!activeTeamId}
                data-testid="login-button"
              >
                Login
              </Button>
            ) : (
              <Badge variant="secondary" className="px-3 py-1">
                Logged in as {liveState?.teams.find(t => t.teamId === activeTeamId)?.name}
              </Badge>
            )}
          </div>
          
          <Button variant="outline" onClick={() => setShowCommishModal(true)} data-testid="commissioner-button">
            <Settings className="h-4 w-4 mr-2" />
            Commissioner
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
            syncError ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
          )}>
            <div className={cn("w-2 h-2 rounded-full", syncError ? "bg-red-500" : "bg-green-500")} />
            {syncError ? "Disconnected" : "Connected"}
          </div>
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Last sync: {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      {/* Draft Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On The Clock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className={cn("text-2xl font-bold", isMyTurn && "text-green-500")}>
                {onClockTeam?.name || "—"}
              </span>
              {isMyTurn && <Badge className="bg-green-500">Your Turn!</Badge>}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Pick</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPick ? `Round ${currentPick.round}, Pick ${currentPick.pickInRound}` : "—"}
            </div>
            <div className="text-sm text-muted-foreground">
              Overall #{liveState?.state?.currentPickNumber} • {liveState?.state?.phase} Phase
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={liveState?.state?.isPaused ? "secondary" : "default"} className="text-lg px-4 py-1">
              {liveState?.state?.isPaused ? "PAUSED" : "LIVE"}
            </Badge>
          </CardContent>
        </Card>
      </div>
      
      {/* Make Pick Button */}
      {(isMyTurn || isCommissioner) && !liveState?.state?.isPaused && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-4">
            <Button 
              onClick={() => setShowPickModal(true)} 
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              data-testid="make-pick-button"
            >
              <Send className="h-5 w-5 mr-2" />
              {isMyTurn ? "Make Your Pick" : "Make Pick (Commissioner)"}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Commissioner Controls */}
      {isCommissioner && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-500 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Commissioner Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            {liveState?.state?.isPaused ? (
              <Button onClick={() => handlePause(false)} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Resume Draft
              </Button>
            ) : (
              <Button onClick={() => handlePause(true)} variant="secondary">
                <Pause className="h-4 w-4 mr-2" />
                Pause Draft
              </Button>
            )}
            <Button onClick={handleUndo} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Undo Last Pick
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(`/api/live/${roomId}/export.csv`, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleInitRoom} variant="destructive" data-testid="init-room-button">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Draft
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Picks */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Recent Picks</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="space-y-2">
            {recentPicks.map(pick => {
              const team = liveState?.teams.find(t => t.teamId === pick.teamId);
              return (
                <div key={pick.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-16 justify-center">
                      R{pick.round}.{pick.pickInRound}
                    </Badge>
                    <span className="font-medium">{team?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{pick.playerName || pick.playerId}</span>
                    {pick.isOtl && <Badge variant="secondary" className="text-xs">OTL</Badge>}
                  </div>
                </div>
              );
            })}
            {recentPicks.length === 0 && (
              <div className="text-center text-muted-foreground py-4">No picks yet</div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Modals */}
      <Dialog open={showRoomCodeModal} onOpenChange={setShowRoomCodeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Room Code</DialogTitle>
            <DialogDescription>
              Enter the room code to join this draft room.
            </DialogDescription>
          </DialogHeader>
          <Input 
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Room code..."
            data-testid="room-code-input"
          />
          <DialogFooter>
            <Button onClick={handleRoomCodeSubmit} disabled={!roomCode} data-testid="room-code-submit">
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login to Draft</DialogTitle>
            <DialogDescription>
              You are logging in to draft as "{liveState?.teams.find(t => t.teamId === activeTeamId)?.name}". 
              Click OK to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginModal(false)}>Cancel</Button>
            <Button onClick={handleLogin} data-testid="login-confirm">OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showCommishModal} onOpenChange={setShowCommishModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commissioner Access</DialogTitle>
            <DialogDescription>
              Enter the commissioner PIN to enable admin controls.
            </DialogDescription>
          </DialogHeader>
          <Input 
            type="password"
            value={commishPin}
            onChange={(e) => setCommishPin(e.target.value)}
            placeholder="Commissioner PIN..."
            data-testid="commish-pin-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommishModal(false)}>Cancel</Button>
            <Button onClick={handleCommishLogin} disabled={!commishPin} data-testid="commish-submit">
              Enable Commissioner Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showPickModal} onOpenChange={setShowPickModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select a Player</DialogTitle>
            <DialogDescription>
              Search and select a player to draft for {
                isCommissioner && pickForTeamId 
                  ? liveState?.teams.find(t => t.teamId === pickForTeamId)?.name 
                  : (onClockTeam?.name || 'the current team')
              }.
            </DialogDescription>
          </DialogHeader>
          
          {isCommissioner && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Pick for team:</span>
              <Select 
                value={pickForTeamId?.toString() || liveState?.state?.onClockTeamId?.toString() || ''} 
                onValueChange={(v) => setPickForTeamId(parseInt(v))}
              >
                <SelectTrigger className="w-48" data-testid="commish-team-select">
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  {liveState?.teams.map(team => (
                    <SelectItem key={team.teamId} value={team.teamId.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Search players..."
              className="pl-10"
              data-testid="player-search-input"
            />
          </div>
          
          <div className="flex-1 overflow-auto border rounded-md max-h-64">
            {availablePlayers.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayerId(player.id)}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between border-b",
                  selectedPlayerId === player.id && "bg-primary/20"
                )}
                data-testid={`player-option-${player.id}`}
              >
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="text-muted-foreground ml-2 text-sm">{player.team}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {player.positions?.join(', ')}
                </div>
              </button>
            ))}
            {availablePlayers.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">No players found</div>
            )}
          </div>
          
          {selectedPlayerId && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md">
              <span className="font-medium">Selected: {players.find(p => p.id === selectedPlayerId)?.name}</span>
              <label className="flex items-center gap-2 ml-auto">
                <input 
                  type="checkbox" 
                  checked={useOtl} 
                  onChange={(e) => setUseOtl(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Use OTL Token</span>
              </label>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPickModal(false)}>Cancel</Button>
            <Button 
              onClick={handleMakePick} 
              disabled={!selectedPlayerId}
              className="bg-green-600 hover:bg-green-700"
              data-testid="confirm-pick-button"
            >
              <Send className="h-4 w-4 mr-2" />
              Confirm Pick
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
