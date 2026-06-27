import { pgTable, serial, text, integer, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const electionStatusEnum = pgEnum("election_status", ["declared", "counting", "pending"]);
export const constituencyStatusEnum = pgEnum("constituency_status", ["declared", "counting", "pending"]);

export const electionsTable = pgTable("elections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  totalSeats: integer("total_seats").notNull(),
  status: electionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partiesTable = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  color: text("color").notNull(),
  description: text("description"),
});

export const constituenciesTable = pgTable("constituencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
});

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  partyId: integer("party_id").notNull().references(() => partiesTable.id),
  constituencyId: integer("constituency_id").notNull().references(() => constituenciesTable.id),
  electionId: integer("election_id").notNull().references(() => electionsTable.id),
});

export const constituencyResultsTable = pgTable("constituency_results", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => electionsTable.id),
  constituencyId: integer("constituency_id").notNull().references(() => constituenciesTable.id),
  registeredVoters: integer("registered_voters").notNull(),
  votesCast: integer("votes_cast").notNull().default(0),
  status: constituencyStatusEnum("status").notNull().default("pending"),
});

export const candidateVotesTable = pgTable("candidate_votes", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull().references(() => electionsTable.id),
  candidateId: integer("candidate_id").notNull().references(() => candidatesTable.id),
  constituencyId: integer("constituency_id").notNull().references(() => constituenciesTable.id),
  votes: integer("votes").notNull().default(0),
  isWinner: integer("is_winner").notNull().default(0),
});

export const insertElectionSchema = createInsertSchema(electionsTable).omit({ id: true, createdAt: true });
export const insertPartySchema = createInsertSchema(partiesTable).omit({ id: true });
export const insertConstituencySchema = createInsertSchema(constituenciesTable).omit({ id: true });
export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({ id: true });
export const insertConstituencyResultSchema = createInsertSchema(constituencyResultsTable).omit({ id: true });
export const insertCandidateVotesSchema = createInsertSchema(candidateVotesTable).omit({ id: true });

export type Election = typeof electionsTable.$inferSelect;
export type Party = typeof partiesTable.$inferSelect;
export type Constituency = typeof constituenciesTable.$inferSelect;
export type Candidate = typeof candidatesTable.$inferSelect;
export type ConstituencyResult = typeof constituencyResultsTable.$inferSelect;
export type CandidateVotes = typeof candidateVotesTable.$inferSelect;
