import { 
  type Room, type InsertRoom,
  type DraftRoom, type InsertDraftRoom,
  type DraftTeam, type InsertDraftTeam,
  type DraftPick, type InsertDraftPick,
  type DraftState, type InsertDraftState,
  type AuditLog, type InsertAuditLog,
  rooms, draftRooms, draftTeams, draftPicks, draftState, auditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";

export interface IStorage {
  getRoom(roomId: string): Promise<Room | undefined>;
  createOrUpdateRoom(roomId: string, data: Partial<InsertRoom>): Promise<Room>;
  
  getDraftRoom(roomId: string): Promise<DraftRoom | undefined>;
  createDraftRoom(data: InsertDraftRoom): Promise<DraftRoom>;
  
  getTeams(roomId: string): Promise<DraftTeam[]>;
  createTeam(data: InsertDraftTeam): Promise<DraftTeam>;
  updateTeamTokens(roomId: string, teamId: number, tokens: number): Promise<void>;
  
  getPicks(roomId: string): Promise<DraftPick[]>;
  createPick(data: InsertDraftPick): Promise<DraftPick>;
  updatePick(roomId: string, pickNumber: number, data: Partial<InsertDraftPick>): Promise<DraftPick | undefined>;
  clearPick(roomId: string, pickNumber: number): Promise<void>;
  
  getDraftState(roomId: string): Promise<DraftState | undefined>;
  createOrUpdateDraftState(roomId: string, data: Partial<InsertDraftState>): Promise<DraftState>;
  
  addAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(roomId: string): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getRoom(roomId: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.roomId, roomId));
    return room;
  }

  async createOrUpdateRoom(roomId: string, data: Partial<InsertRoom>): Promise<Room> {
    const existing = await this.getRoom(roomId);
    if (existing) {
      const [updated] = await db
        .update(rooms)
        .set({ ...data, lastUpdated: new Date() })
        .where(eq(rooms.roomId, roomId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(rooms)
        .values({
          roomId,
          currentPickIndex: data.currentPickIndex || 0,
          picks: data.picks || [],
          lastUpdated: new Date()
        })
        .returning();
      return created;
    }
  }

  async getDraftRoom(roomId: string): Promise<DraftRoom | undefined> {
    try {
      const result = await db.select().from(draftRooms).where(eq(draftRooms.roomId, roomId));
      return result[0];
    } catch (e) {
      return undefined;
    }
  }

  async createDraftRoom(data: InsertDraftRoom): Promise<DraftRoom> {
    const [created] = await db.insert(draftRooms).values(data).returning();
    return created;
  }

  async getTeams(roomId: string): Promise<DraftTeam[]> {
    try {
      return await db.select().from(draftTeams).where(eq(draftTeams.roomId, roomId)).orderBy(asc(draftTeams.orderIndex));
    } catch (e) {
      return [];
    }
  }

  async createTeam(data: InsertDraftTeam): Promise<DraftTeam> {
    const [created] = await db.insert(draftTeams).values(data).returning();
    return created;
  }

  async updateTeamTokens(roomId: string, teamId: number, tokens: number): Promise<void> {
    await db.update(draftTeams)
      .set({ otlTokens: tokens })
      .where(and(eq(draftTeams.roomId, roomId), eq(draftTeams.teamId, teamId)));
  }

  async getPicks(roomId: string): Promise<DraftPick[]> {
    try {
      return await db.select().from(draftPicks).where(eq(draftPicks.roomId, roomId)).orderBy(asc(draftPicks.pickNumber));
    } catch (e) {
      return [];
    }
  }

  async createPick(data: InsertDraftPick): Promise<DraftPick> {
    const [created] = await db.insert(draftPicks).values(data).returning();
    return created;
  }

  async updatePick(roomId: string, pickNumber: number, data: Partial<InsertDraftPick>): Promise<DraftPick | undefined> {
    const [updated] = await db
      .update(draftPicks)
      .set(data)
      .where(and(eq(draftPicks.roomId, roomId), eq(draftPicks.pickNumber, pickNumber)))
      .returning();
    return updated;
  }

  async clearPick(roomId: string, pickNumber: number): Promise<void> {
    await db.update(draftPicks)
      .set({ playerId: null, playerName: null, isOtl: false, createdAt: null, createdBy: null })
      .where(and(eq(draftPicks.roomId, roomId), eq(draftPicks.pickNumber, pickNumber)));
  }

  async getDraftState(roomId: string): Promise<DraftState | undefined> {
    try {
      const result = await db.select().from(draftState).where(eq(draftState.roomId, roomId));
      return result[0];
    } catch (e) {
      return undefined;
    }
  }

  async createOrUpdateDraftState(roomId: string, data: Partial<InsertDraftState>): Promise<DraftState> {
    const existing = await this.getDraftState(roomId);
    if (existing) {
      const [updated] = await db
        .update(draftState)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(draftState.roomId, roomId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(draftState)
        .values({ roomId, ...data, updatedAt: new Date() })
        .returning();
      return created;
    }
  }

  async addAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLog).values(data).returning();
    return created;
  }

  async getAuditLogs(roomId: string): Promise<AuditLog[]> {
    return db.select().from(auditLog).where(eq(auditLog.roomId, roomId)).orderBy(asc(auditLog.createdAt));
  }
}

export class MemStorage implements IStorage {
  private roomsMap: Map<string, Room>;
  private draftRoomsMap: Map<string, DraftRoom>;
  private teamsMap: Map<string, DraftTeam[]>;
  private picksMap: Map<string, DraftPick[]>;
  private stateMap: Map<string, DraftState>;
  private logsMap: Map<string, AuditLog[]>;

  constructor() {
    this.roomsMap = new Map();
    this.draftRoomsMap = new Map();
    this.teamsMap = new Map();
    this.picksMap = new Map();
    this.stateMap = new Map();
    this.logsMap = new Map();
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    return Array.from(this.roomsMap.values()).find(r => r.roomId === roomId);
  }

  async createOrUpdateRoom(roomId: string, data: Partial<InsertRoom>): Promise<Room> {
    let room = await this.getRoom(roomId);
    if (room) {
      const updatedRoom = { ...room, ...data, lastUpdated: new Date() };
      this.roomsMap.set(String(room.id), updatedRoom);
      return updatedRoom;
    } else {
      const id = this.roomsMap.size + 1;
      const newRoom: Room = {
        id,
        roomId,
        currentPickIndex: data.currentPickIndex || 0,
        picks: data.picks || [],
        lastUpdated: new Date()
      };
      this.roomsMap.set(String(id), newRoom);
      return newRoom;
    }
  }

  async getDraftRoom(roomId: string): Promise<DraftRoom | undefined> {
    return this.draftRoomsMap.get(roomId);
  }

  async createDraftRoom(data: InsertDraftRoom): Promise<DraftRoom> {
    const room: DraftRoom = { id: this.draftRoomsMap.size + 1, ...data, name: data.name || null, createdAt: new Date() };
    this.draftRoomsMap.set(data.roomId, room);
    return room;
  }

  async getTeams(roomId: string): Promise<DraftTeam[]> {
    return this.teamsMap.get(roomId) || [];
  }

  async createTeam(data: InsertDraftTeam): Promise<DraftTeam> {
    const teams = this.teamsMap.get(data.roomId) || [];
    const team: DraftTeam = { 
      id: teams.length + 1, 
      roomId: data.roomId,
      teamId: data.teamId,
      name: data.name,
      orderIndex: data.orderIndex,
      otlTokens: data.otlTokens ?? 1
    };
    teams.push(team);
    this.teamsMap.set(data.roomId, teams);
    return team;
  }

  async updateTeamTokens(roomId: string, teamId: number, tokens: number): Promise<void> {
    const teams = this.teamsMap.get(roomId) || [];
    const team = teams.find(t => t.teamId === teamId);
    if (team) team.otlTokens = tokens;
  }

  async getPicks(roomId: string): Promise<DraftPick[]> {
    return this.picksMap.get(roomId) || [];
  }

  async createPick(data: InsertDraftPick): Promise<DraftPick> {
    const picks = this.picksMap.get(data.roomId) || [];
    const pick: DraftPick = { 
      id: picks.length + 1,
      roomId: data.roomId,
      pickNumber: data.pickNumber,
      round: data.round,
      pickInRound: data.pickInRound,
      phase: data.phase,
      teamId: data.teamId,
      originalTeamId: data.originalTeamId,
      playerId: data.playerId ?? null,
      playerName: data.playerName ?? null,
      isOtl: data.isOtl ?? false,
      createdAt: data.createdAt ?? null,
      createdBy: data.createdBy ?? null
    };
    picks.push(pick);
    this.picksMap.set(data.roomId, picks);
    return pick;
  }

  async updatePick(roomId: string, pickNumber: number, data: Partial<InsertDraftPick>): Promise<DraftPick | undefined> {
    const picks = this.picksMap.get(roomId) || [];
    const pick = picks.find(p => p.pickNumber === pickNumber);
    if (pick) Object.assign(pick, data);
    return pick;
  }

  async clearPick(roomId: string, pickNumber: number): Promise<void> {
    const picks = this.picksMap.get(roomId) || [];
    const pick = picks.find(p => p.pickNumber === pickNumber);
    if (pick) {
      pick.playerId = null;
      pick.playerName = null;
      pick.isOtl = false;
      pick.createdAt = null;
      pick.createdBy = null;
    }
  }

  async getDraftState(roomId: string): Promise<DraftState | undefined> {
    return this.stateMap.get(roomId);
  }

  async createOrUpdateDraftState(roomId: string, data: Partial<InsertDraftState>): Promise<DraftState> {
    const existing = this.stateMap.get(roomId);
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.stateMap.set(roomId, updated);
      return updated;
    } else {
      const state: DraftState = {
        id: this.stateMap.size + 1,
        roomId,
        currentPickNumber: data.currentPickNumber || 0,
        onClockTeamId: data.onClockTeamId || null,
        phase: data.phase || 'ML',
        isPaused: data.isPaused ?? true,
        updatedAt: new Date()
      };
      this.stateMap.set(roomId, state);
      return state;
    }
  }

  async addAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const logs = this.logsMap.get(data.roomId) || [];
    const log: AuditLog = { 
      id: logs.length + 1, 
      roomId: data.roomId,
      action: data.action,
      payload: data.payload ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: new Date() 
    };
    logs.push(log);
    this.logsMap.set(data.roomId, logs);
    return log;
  }

  async getAuditLogs(roomId: string): Promise<AuditLog[]> {
    return this.logsMap.get(roomId) || [];
  }
}

export const storage: IStorage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
