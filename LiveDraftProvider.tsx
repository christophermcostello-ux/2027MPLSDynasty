import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useLiveDraftStore, LiveTeam, LivePick, LiveDraftState } from '@/lib/liveDraftStore';

const POLL_INTERVAL = 1500;

export function LiveDraftProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isLiveMode, roomId, setLiveMode, setConnected, updateState } = useLiveDraftStore();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const match = location.match(/^\/live\/([^/?]+)/);
    if (match) {
      const urlRoomId = match[1];
      if (urlRoomId !== roomId) {
        setLiveMode(urlRoomId);
      }
    } else {
      const storedRoomId = sessionStorage.getItem('liveDraftRoomId');
      if (storedRoomId && !isLiveMode) {
        setLiveMode(storedRoomId);
      }
    }
  }, [location, roomId, isLiveMode, setLiveMode]);

  useEffect(() => {
    if (!isLiveMode || !roomId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/live/${roomId}/state`);
        if (res.ok) {
          const data = await res.json();
          
          const teams: LiveTeam[] = (data.teams || []).map((t: any) => ({
            id: t.teamId,
            name: t.name,
            otlTokens: t.otlTokens
          }));
          
          const picks: LivePick[] = (data.picks || []).map((p: any) => ({
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
          }));
          
          const draftState: LiveDraftState = {
            currentPick: data.currentPick || 1,
            onClockTeamId: data.onClockTeamId,
            isPaused: data.isPaused || false,
            phase: data.phase || 'ML'
          };
          
          updateState(teams, picks, draftState);
        } else {
          setConnected(false);
        }
      } catch (e) {
        setConnected(false);
      }
    };

    fetchState();
    pollIntervalRef.current = setInterval(fetchState, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isLiveMode, roomId, updateState, setConnected]);

  return <>{children}</>;
}
