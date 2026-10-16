import { create } from 'zustand';
import mockData from './mock_data.json';
import rosterData from './roster_data.json';

// --- Types ---
export type Phase = 'ML' | 'MiL';
export type PlayerType = 'Batter' | 'Pitcher';
export type Handedness = 'R' | 'L' | 'S';
export type PitcherRole = 'SP' | 'RP';

export interface Player {
  id: string;
  name: string;
  team: string;
  type: PlayerType;
  positions: string[];
  bats?: Handedness;
  throws?: Handedness;
  role?: PitcherRole;
  isOTL: boolean;
  stats: Record<string, any>;
  splits?: {
    vsL?: Record<string, number | string>;
    vsR?: Record<string, number | string>;
  };
  speed?: number;
  sb?: number;
  range?: number;
  error?: number;
  arm?: number;
  durability?: string | number;
  clutch?: number;
  endurance?: number;
  hold?: number;
  jam?: number;
  on?: number;
  off?: number;
  innings?: number;
}

export interface LiveTeam {
  id: number;
  name: string;
  otlTokens: number;
  keepers?: string[];
}

export interface LivePick {
  pickNumber: number;
  round: number;
  pickInRound: number;
  phase: Phase;
  teamId: number;
  teamName: string;
  playerId: string | null;
  playerName: string | null;
  isOTL: boolean;
  timestamp: string | null;
}

export interface LiveDraftState {
  currentPick: number;
  onClockTeamId: number | null;
  isPaused: boolean;
  phase: Phase;
}

// Load players from JSON
const PLAYERS: Player[] = (mockData.players as any[]).map(p => ({
  ...p,
  type: p.type as PlayerType,
  bats: p.bats as Handedness,
  throws: p.throws as Handedness,
  role: p.role as PitcherRole,
  isOTL: p.isOTL || false,
  positions: p.positions || [],
  stats: p.stats || {},
  splits: p.splits || {}
}));

// Load keepers from roster data
const KEEPERS_MAP: Record<number, string[]> = {};
Object.entries(rosterData as Record<string, string[]>).forEach(([teamId, keepers]) => {
  KEEPERS_MAP[parseInt(teamId)] = keepers;
});

interface LiveDraftStore {
  // Connection state
  isLiveMode: boolean;
  roomId: string | null;
  isConnected: boolean;
  lastUpdated: number;
  
  // Draft data from server
  teams: LiveTeam[];
  picks: LivePick[];
  draftState: LiveDraftState | null;
  
  // Static player data (loaded from JSON)
  players: Player[];
  
  // Actions
  setLiveMode: (roomId: string | null) => void;
  updateState: (teams: LiveTeam[], picks: LivePick[], state: LiveDraftState) => void;
  clearLiveMode: () => void;
  setConnected: (connected: boolean) => void;
}

const ROOM_STORAGE_KEY = 'liveDraftRoomId';

function getStoredRoomId(): string | null {
  try {
    return sessionStorage.getItem(ROOM_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveRoomId(roomId: string | null) {
  try {
    if (roomId) {
      sessionStorage.setItem(ROOM_STORAGE_KEY, roomId);
    } else {
      sessionStorage.removeItem(ROOM_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export const useLiveDraftStore = create<LiveDraftStore>((set) => ({
  isLiveMode: !!getStoredRoomId(),
  roomId: getStoredRoomId(),
  teams: [],
  picks: [],
  draftState: null,
  lastUpdated: 0,
  isConnected: false,
  players: PLAYERS,
  
  setLiveMode: (roomId) => {
    saveRoomId(roomId);
    set({ 
      isLiveMode: !!roomId, 
      roomId,
      isConnected: false
    });
  },
  
  updateState: (teams, picks, draftState) => {
    // Merge keepers into teams
    const teamsWithKeepers = teams.map(t => ({
      ...t,
      keepers: KEEPERS_MAP[t.id] || []
    }));
    
    set({
      teams: teamsWithKeepers,
      picks,
      draftState,
      lastUpdated: Date.now(),
      isConnected: true
    });
  },
  
  clearLiveMode: () => {
    saveRoomId(null);
    set({
      isLiveMode: false,
      roomId: null,
      teams: [],
      picks: [],
      draftState: null,
      lastUpdated: 0,
      isConnected: false
    });
  },
  
  setConnected: (connected) => {
    set({ isConnected: connected });
  }
}));

// Helper to get drafted player IDs
export function getLiveDraftedPlayerIds(): Set<string> {
  const { picks, teams } = useLiveDraftStore.getState();
  const ids = new Set<string>();
  
  // Add drafted players
  picks.filter(p => p.playerId).forEach(p => ids.add(p.playerId!));
  
  // Add keepers
  teams.forEach(t => {
    (t.keepers || []).forEach(k => ids.add(k));
  });
  
  return ids;
}

// Roster slot constants
export const HITTER_SLOTS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];
export const PITCHER_SLOTS = ['SP1', 'SP2', 'SP3', 'SP4', 'SP5', 'RP1', 'RP2', 'RP3', 'RP4'];
