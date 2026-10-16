import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import rawDraftGrid from "./raw_draft_grid.json";

interface Pick {
  id: string;
  overallPickNumber: number;
  round: number;
  pickInRound: number;
  phase: 'ML' | 'MiL';
  ownerTeamId: number;
  originalOwnerTeamId: number;
  playerId: string | null;
  isOTL: boolean;
  timestamp?: number;
}

const TEAM_NAME_TO_ID: Record<string, number> = {
  "Matt": 6,
  "Mike N": 1,
  "Mike": 7,
  "Lee": 5,
  "Jake": 4,
  "jake": 4,
  "Tyler": 9,
  "Chris": 2,
  "Zack": 10,
  "Zach": 10,
  "Gus": 3,
  "Scott": 8,
  "Al": 1
};

function generateDraftPicks(): Pick[] {
  const picks: Pick[] = [];
  let overallPickNumber = 1;

  for (let i = 1; i < rawDraftGrid.length; i += 2) {
    const roundRow = rawDraftGrid[i];
    const ownerRow = rawDraftGrid[i + 1];

    if (!roundRow || !ownerRow) break;

    const roundNum = roundRow[0];
    if (typeof roundNum !== 'number') continue;
    if (roundNum > 16) continue;

    for (let pickIdx = 1; pickIdx <= 10; pickIdx++) {
      const ownerName = ownerRow[pickIdx] as string;
      const teamId = TEAM_NAME_TO_ID[ownerName] || pickIdx;
      
      picks.push({
        id: `ml-${roundNum}-${pickIdx}`,
        overallPickNumber: overallPickNumber++,
        round: roundNum,
        pickInRound: pickIdx,
        phase: 'ML',
        ownerTeamId: teamId,
        originalOwnerTeamId: teamId,
        playerId: null,
        isOTL: false
      });
    }
  }

  for (let round = 1; round <= 10; round++) {
    for (let pick = 1; pick <= 10; pick++) {
      picks.push({
        id: `mil-${round}-${pick}`,
        overallPickNumber: overallPickNumber++,
        round,
        pickInRound: pick,
        phase: 'MiL',
        ownerTeamId: pick,
        originalOwnerTeamId: pick,
        playerId: null,
        isOTL: false
      });
    }
  }

  return picks;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  
  // ===== LIVE DRAFT ENDPOINTS =====
  
  app.get("/api/live/:roomId/state", async (req, res) => {
    const roomId = req.params.roomId;
    
    const [draftRoom, teams, picks, state] = await Promise.all([
      storage.getDraftRoom(roomId),
      storage.getTeams(roomId),
      storage.getPicks(roomId),
      storage.getDraftState(roomId)
    ]);
    
    if (!draftRoom) {
      return res.status(404).json({ message: "Draft room not found" });
    }
    
    res.json({
      room: draftRoom,
      teams,
      picks,
      state,
      serverTime: Date.now()
    });
  });
  
  app.post("/api/live/:roomId/init", async (req, res) => {
    const roomId = req.params.roomId;
    const { roomCode } = req.body;
    
    if (roomCode !== process.env.ROOM_CODE) {
      return res.status(403).json({ message: "Invalid room code" });
    }
    
    const existing = await storage.getDraftRoom(roomId);
    if (existing) {
      return res.status(400).json({ message: "Room already exists" });
    }
    
    const room = await storage.createDraftRoom({ roomId, name: "Dynasty Draft 2025" });
    
    const teamNames = ["Al", "Chris", "Gus", "jake", "Lee", "Matt", "Mike", "Scott", "Tyler", "Zach"];
    for (let i = 0; i < teamNames.length; i++) {
      await storage.createTeam({
        roomId,
        teamId: i + 1,
        name: teamNames[i],
        orderIndex: i,
        otlTokens: 1
      });
    }
    
    const draftPicks = generateDraftPicks();
    for (const pick of draftPicks) {
      await storage.createPick({
        roomId,
        pickNumber: pick.overallPickNumber,
        round: pick.round,
        pickInRound: pick.pickInRound,
        phase: pick.phase,
        teamId: pick.ownerTeamId,
        originalTeamId: pick.originalOwnerTeamId,
        playerId: null,
        playerName: null,
        isOtl: false,
        createdAt: null,
        createdBy: null
      });
    }
    
    const firstPick = draftPicks[0];
    await storage.createOrUpdateDraftState(roomId, {
      roomId,
      currentPickNumber: 1,
      onClockTeamId: firstPick?.ownerTeamId || 1,
      phase: "ML",
      isPaused: true
    });
    
    await storage.addAuditLog({
      roomId,
      action: "ROOM_CREATED",
      payload: { teamNames },
      createdBy: "system"
    });
    
    res.json({ success: true, roomId });
  });
  
  app.post("/api/live/:roomId/pick", async (req, res) => {
    const roomId = req.params.roomId;
    const { teamId, playerId, playerName, isOtl, roomCode, commishPin } = req.body;
    
    if (roomCode !== process.env.ROOM_CODE) {
      return res.status(403).json({ message: "Invalid room code" });
    }
    
    const state = await storage.getDraftState(roomId);
    if (!state) {
      return res.status(404).json({ message: "Draft not found" });
    }
    
    if (state.isPaused) {
      return res.status(400).json({ message: "Draft is paused" });
    }
    
    const picks = await storage.getPicks(roomId);
    const currentPick = picks.find(p => p.pickNumber === state.currentPickNumber);
    
    if (!currentPick) {
      return res.status(400).json({ message: "No current pick" });
    }
    
    const isCommissioner = commishPin === process.env.COMMISH_PIN;
    
    if (!isCommissioner && currentPick.teamId !== teamId) {
      return res.status(403).json({ message: "Not your turn to pick" });
    }
    
    const alreadyPicked = picks.find(p => p.playerId === playerId);
    if (alreadyPicked) {
      return res.status(400).json({ message: "Player already drafted" });
    }
    
    if (isOtl) {
      const teams = await storage.getTeams(roomId);
      const team = teams.find(t => t.teamId === currentPick.teamId);
      if (!team || team.otlTokens <= 0) {
        return res.status(400).json({ message: "No OTL tokens available" });
      }
      await storage.updateTeamTokens(roomId, currentPick.teamId, team.otlTokens - 1);
    }
    
    await storage.updatePick(roomId, state.currentPickNumber, {
      playerId,
      playerName,
      isOtl: isOtl || false,
      createdAt: new Date(),
      createdBy: `team-${teamId}`
    });
    
    const nextPickNumber = state.currentPickNumber + 1;
    const nextPick = picks.find(p => p.pickNumber === nextPickNumber);
    
    await storage.createOrUpdateDraftState(roomId, {
      currentPickNumber: nextPickNumber,
      onClockTeamId: nextPick?.teamId || null,
      phase: nextPick?.phase || state.phase
    });
    
    await storage.addAuditLog({
      roomId,
      action: "PICK_MADE",
      payload: { pickNumber: state.currentPickNumber, playerId, playerName, teamId: currentPick.teamId, isOtl },
      createdBy: isCommissioner ? "commissioner" : `team-${teamId}`
    });
    
    res.json({ success: true });
  });
  
  app.post("/api/live/:roomId/undo", async (req, res) => {
    const roomId = req.params.roomId;
    const { commishPin, roomCode } = req.body;
    
    if (roomCode !== process.env.ROOM_CODE) {
      return res.status(403).json({ message: "Invalid room code" });
    }
    
    if (commishPin !== process.env.COMMISH_PIN) {
      return res.status(403).json({ message: "Commissioner access required" });
    }
    
    const state = await storage.getDraftState(roomId);
    if (!state || state.currentPickNumber === 0) {
      return res.status(400).json({ message: "No picks to undo" });
    }
    
    const picks = await storage.getPicks(roomId);
    const lastPickNumber = state.currentPickNumber - 1;
    const lastPick = picks.find(p => p.pickNumber === lastPickNumber);
    
    if (!lastPick) {
      return res.status(400).json({ message: "Pick not found" });
    }
    
    if (lastPick.isOtl) {
      const teams = await storage.getTeams(roomId);
      const team = teams.find(t => t.teamId === lastPick.teamId);
      if (team) {
        await storage.updateTeamTokens(roomId, lastPick.teamId, team.otlTokens + 1);
      }
    }
    
    await storage.clearPick(roomId, lastPickNumber);
    
    await storage.createOrUpdateDraftState(roomId, {
      currentPickNumber: lastPickNumber,
      onClockTeamId: lastPick.teamId,
      phase: lastPick.phase
    });
    
    await storage.addAuditLog({
      roomId,
      action: "PICK_UNDONE",
      payload: { pickNumber: lastPickNumber },
      createdBy: "commissioner"
    });
    
    res.json({ success: true });
  });
  
  app.post("/api/live/:roomId/pause", async (req, res) => {
    const roomId = req.params.roomId;
    const { commishPin, roomCode, isPaused } = req.body;
    
    if (roomCode !== process.env.ROOM_CODE) {
      return res.status(403).json({ message: "Invalid room code" });
    }
    
    if (commishPin !== process.env.COMMISH_PIN) {
      return res.status(403).json({ message: "Commissioner access required" });
    }
    
    await storage.createOrUpdateDraftState(roomId, { isPaused });
    
    await storage.addAuditLog({
      roomId,
      action: isPaused ? "DRAFT_PAUSED" : "DRAFT_RESUMED",
      payload: {},
      createdBy: "commissioner"
    });
    
    res.json({ success: true });
  });
  
  app.post("/api/live/:roomId/set-pick", async (req, res) => {
    const roomId = req.params.roomId;
    const { commishPin, roomCode, pickNumber } = req.body;
    
    if (roomCode !== process.env.ROOM_CODE) {
      return res.status(403).json({ message: "Invalid room code" });
    }
    
    if (commishPin !== process.env.COMMISH_PIN) {
      return res.status(403).json({ message: "Commissioner access required" });
    }
    
    const picks = await storage.getPicks(roomId);
    const pick = picks.find(p => p.pickNumber === pickNumber);
    
    if (!pick) {
      return res.status(400).json({ message: "Invalid pick number" });
    }
    
    await storage.createOrUpdateDraftState(roomId, {
      currentPickNumber: pickNumber,
      onClockTeamId: pick.teamId,
      phase: pick.phase
    });
    
    await storage.addAuditLog({
      roomId,
      action: "PICK_NUMBER_SET",
      payload: { pickNumber },
      createdBy: "commissioner"
    });
    
    res.json({ success: true });
  });
  
  app.get("/api/live/:roomId/export.csv", async (req, res) => {
    const roomId = req.params.roomId;
    
    const [teams, picks] = await Promise.all([
      storage.getTeams(roomId),
      storage.getPicks(roomId)
    ]);
    
    const teamsMap = new Map(teams.map(t => [t.teamId, t.name]));
    
    const csvRows = ["Pick,Round,Team,Player,OTL,Phase,Timestamp"];
    
    for (const pick of picks) {
      if (pick.playerId) {
        csvRows.push([
          pick.pickNumber,
          pick.round,
          teamsMap.get(pick.teamId) || `Team ${pick.teamId}`,
          `"${pick.playerName || pick.playerId}"`,
          pick.isOtl ? "Yes" : "No",
          pick.phase,
          pick.createdAt ? new Date(pick.createdAt).toISOString() : ""
        ].join(","));
      }
    }
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=draft-${roomId}.csv`);
    res.send(csvRows.join("\n"));
  });

  return httpServer;
}
