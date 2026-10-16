import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const draftRooms = pgTable("draft_rooms", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull().unique(),
  name: text("name").default("Dynasty Draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const draftTeams = pgTable("draft_teams", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  teamId: integer("team_id").notNull(),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  otlTokens: integer("otl_tokens").default(1).notNull(),
});

export const draftPicks = pgTable("draft_picks", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  pickNumber: integer("pick_number").notNull(),
  round: integer("round").notNull(),
  pickInRound: integer("pick_in_round").notNull(),
  phase: text("phase").notNull(),
  teamId: integer("team_id").notNull(),
  originalTeamId: integer("original_team_id").notNull(),
  playerId: text("player_id"),
  playerName: text("player_name"),
  isOtl: boolean("is_otl").default(false).notNull(),
  createdAt: timestamp("created_at"),
  createdBy: text("created_by"),
});

export const draftState = pgTable("draft_state", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull().unique(),
  currentPickNumber: integer("current_pick_number").default(0).notNull(),
  onClockTeamId: integer("on_clock_team_id"),
  phase: text("phase").default("ML").notNull(),
  isPaused: boolean("is_paused").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDraftRoomSchema = createInsertSchema(draftRooms).omit({ id: true, createdAt: true });
export type InsertDraftRoom = z.infer<typeof insertDraftRoomSchema>;
export type DraftRoom = typeof draftRooms.$inferSelect;

export const insertDraftTeamSchema = createInsertSchema(draftTeams).omit({ id: true });
export type InsertDraftTeam = z.infer<typeof insertDraftTeamSchema>;
export type DraftTeam = typeof draftTeams.$inferSelect;

export const insertDraftPickSchema = createInsertSchema(draftPicks).omit({ id: true });
export type InsertDraftPick = z.infer<typeof insertDraftPickSchema>;
export type DraftPick = typeof draftPicks.$inferSelect;

export const insertDraftStateSchema = createInsertSchema(draftState).omit({ id: true, updatedAt: true });
export type InsertDraftState = z.infer<typeof insertDraftStateSchema>;
export type DraftState = typeof draftState.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull().unique(),
  currentPickIndex: integer("current_pick_index").default(0).notNull(),
  picks: jsonb("picks").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertRoomSchema = createInsertSchema(rooms);
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
