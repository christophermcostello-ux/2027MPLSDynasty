import { useMemo, useCallback } from 'react';
import { useLiveDraftStore, LivePick, LiveTeam, Player, Phase, getLiveDraftedPlayerIds } from './liveDraftStore';

export interface UnifiedPick {
  id: string;
  overallPickNumber: number;
  round: number;
  pickInRound: number;
  phase: Phase;
  ownerTeamId: number;
  originalOwnerTeamId: number;
  playerId: string | null;
  playerName?: string | null;
  isOTL: boolean;
  timestamp?: number | string | null;
}

export interface UnifiedTeam {
  id: number;
  name: string;
  otlTokens: number;
  keepers: string[];
  lineup: Record<string, string | null>;
}

export interface UnifiedDraftState {
  isLiveMode: boolean;
  roomId: string | null;
  isConnected: boolean;
  
  players: Player[];
  teams: UnifiedTeam[];
  picks: UnifiedPick[];
  
  currentPickIndex: number;
  currentPick: UnifiedPick | null;
  phase: Phase;
  isPaused: boolean;
  isCommissionerMode: boolean;
  
  makePick: (playerId: string, useOTL?: boolean) => Promise<boolean>;
  undoPick: () => Promise<boolean>;
  
  draftedPlayerIds: Set<string>;
}

function getRoomId(): string | null {
  try {
    return sessionStorage.getItem('liveDraftRoomId');
  } catch {
    return null;
  }
}

function getRoomCode(roomId: string): string {
  try {
    return sessionStorage.getItem(`live-room-code-${roomId}`) || '';
  } catch {
    return '';
  }
}

function getCommishPin(roomId: string): string | null {
  try {
    const isCommish = sessionStorage.getItem(`live-commissioner-${roomId}`) === 'true';
    if (!isCommish) return null;
    return sessionStorage.getItem(`live-commish-pin-${roomId}`) || null;
  } catch {
    return null;
  }
}

export function useDraftData(): UnifiedDraftState {
  const roomId = getRoomId();
  const liveStore = useLiveDraftStore();
  
  const liveTeams = liveStore.teams;
  const livePicks = liveStore.picks;
  const liveDraftState = liveStore.draftState;
  const isConnected = liveStore.isConnected;
  const players = liveStore.players;
  
  const isLiveMode = !!roomId;
  
  const unifiedTeams: UnifiedTeam[] = useMemo(() => {
    return liveTeams.map(t => ({
      id: t.id,
      name: t.name,
      otlTokens: t.otlTokens,
      keepers: t.keepers || [],
      lineup: {}
    }));
  }, [liveTeams]);
  
  const unifiedPicks: UnifiedPick[] = useMemo(() => {
    return livePicks.map((p) => ({
      id: `live-${p.pickNumber}`,
      overallPickNumber: p.pickNumber,
      round: p.round,
      pickInRound: p.pickInRound,
      phase: p.phase,
      ownerTeamId: p.teamId,
      originalOwnerTeamId: p.teamId,
      playerId: p.playerId,
      playerName: p.playerName,
      isOTL: p.isOTL,
      timestamp: p.timestamp
    }));
  }, [livePicks]);
  
  const currentPickIndex = useMemo(() => {
    if (liveDraftState) {
      return (liveDraftState.currentPick || 1) - 1;
    }
    return 0;
  }, [liveDraftState]);
  
  const currentPick = unifiedPicks[currentPickIndex] || null;
  
  const phase: Phase = liveDraftState?.phase || 'ML';
  const isPaused = liveDraftState?.isPaused || false;
  
  const isCommissionerMode = useMemo(() => {
    if (!roomId) return false;
    try {
      return sessionStorage.getItem(`live-commissioner-${roomId}`) === 'true';
    } catch {
      return false;
    }
  }, [roomId]);
  
  const draftedPlayerIds = useMemo(() => {
    return getLiveDraftedPlayerIds();
  }, [livePicks, liveTeams]);
  
  const makePick = useCallback(async (playerId: string, useOTL = false): Promise<boolean> => {
    if (!roomId) return false;
    
    const roomCode = getRoomCode(roomId);
    const commishPin = getCommishPin(roomId);
    const player = players.find(p => p.id === playerId);
    
    try {
      const res = await fetch(`/api/live/${roomId}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName: player?.name || playerId,
          isOtl: useOTL,
          roomCode,
          commishPin
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [roomId, players]);
  
  const undoPick = useCallback(async (): Promise<boolean> => {
    if (!roomId) return false;
    
    const roomCode = getRoomCode(roomId);
    const commishPin = getCommishPin(roomId);
    
    if (!commishPin) {
      console.error('Commissioner privileges required for undo');
      return false;
    }
    
    try {
      const res = await fetch(`/api/live/${roomId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, commishPin })
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [roomId]);
  
  return {
    isLiveMode,
    roomId,
    isConnected,
    
    players,
    teams: unifiedTeams,
    picks: unifiedPicks,
    
    currentPickIndex,
    currentPick,
    phase,
    isPaused,
    isCommissionerMode,
    
    makePick,
    undoPick,
    
    draftedPlayerIds
  };
}
