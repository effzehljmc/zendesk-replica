import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketNumber: integer('ticket_number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('new'),
  priority: text('priority').notNull().default('medium'),
  customerId: uuid('customer_id').notNull().references(() => profiles.id),
  assignedToId: uuid('assigned_to_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  firstResponseAt: timestamp('first_response_at', { withTimezone: true }),
  resolutionTime: text('resolution_time'), // interval type mapped to text
  satisfactionRating: integer('satisfaction_rating'),
  satisfactionFeedback: text('satisfaction_feedback')
});

export const ticketNotes = pgTable('ticket_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id),
  content: text('content').notNull(),
  visibility: text('visibility').notNull().default('private'),
  createdById: uuid('created_by_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 30 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(),
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdById: uuid('created_by_id').notNull().references(() => profiles.id)
});

export const ticketTags = pgTable('ticket_tags', {
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id),
  tagId: uuid('tag_id').notNull().references(() => tags.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdById: uuid('created_by_id').notNull().references(() => profiles.id)
});

export const kbArticles = pgTable('kb_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  authorId: uuid('author_id').notNull().references(() => profiles.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedById: uuid('updated_by_id').references(() => profiles.id)
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  userRoles: many(userRoles),
  ticketsAsCustomer: many(tickets, { relationName: 'customerTickets' }),
  ticketsAsAgent: many(tickets, { relationName: 'agentTickets' }),
  ticketNotes: many(ticketNotes),
  kbArticles: many(kbArticles),
  tags: many(tags)
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  customer: one(profiles, {
    fields: [tickets.customerId],
    references: [profiles.id],
    relationName: 'customerTickets'
  }),
  assignedTo: one(profiles, {
    fields: [tickets.assignedToId],
    references: [profiles.id],
    relationName: 'agentTickets'
  }),
  notes: many(ticketNotes),
  tags: many(ticketTags)
}));

export const ticketNotesRelations = relations(ticketNotes, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketNotes.ticketId],
    references: [tickets.id]
  }),
  createdBy: one(profiles, {
    fields: [ticketNotes.createdById],
    references: [profiles.id]
  })
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  createdBy: one(profiles, {
    fields: [tags.createdById],
    references: [profiles.id]
  }),
  tickets: many(ticketTags)
}));

export const ticketTagsRelations = relations(ticketTags, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketTags.ticketId],
    references: [tickets.id]
  }),
  tag: one(tags, {
    fields: [ticketTags.tagId],
    references: [tags.id]
  }),
  createdBy: one(profiles, {
    fields: [ticketTags.createdById],
    references: [profiles.id]
  })
}));

export const kbArticlesRelations = relations(kbArticles, ({ one }) => ({
  author: one(profiles, {
    fields: [kbArticles.authorId],
    references: [profiles.id]
  })
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  updatedBy: one(profiles, {
    fields: [settings.updatedById],
    references: [profiles.id]
  })
})); 