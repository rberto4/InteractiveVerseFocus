import { z } from 'zod';

// User types
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Calendar Event types
export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  color: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  reminders: z.array(z.number()).optional(), // minutes before event
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

// Goal types
export enum GoalPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export const GoalSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  deadline: z.string().datetime(),
  priority: z.nativeEnum(GoalPriority).default(GoalPriority.MEDIUM),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Goal = z.infer<typeof GoalSchema>;

// Subtask types
export const SubtaskSchema = z.object({
  id: z.string(),
  goalId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  suggestedStart: z.string().datetime(),
  duration: z.number().positive(), // in minutes
  priority: z.number().min(1).max(5),
  dependencies: z.array(z.string()).optional(),
  status: z.enum(['pending', 'scheduled', 'completed']).default('pending'),
});

export type Subtask = z.infer<typeof SubtaskSchema>;

// Task Plan types
export const TaskPlanSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  userId: z.string().uuid(),
  subtasks: z.array(SubtaskSchema),
  conflicts: z.array(z.string()).optional(),
  createdAt: z.date(),
  status: z.enum(['draft', 'approved', 'committed', 'rejected']),
});

export type TaskPlan = z.infer<typeof TaskPlanSchema>;

// API Request/Response types
export const GeneratePlanRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  deadline: z.string().datetime(),
  priority: z.nativeEnum(GoalPriority).default(GoalPriority.MEDIUM),
});

export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;

export const GeneratePlanResponseSchema = z.object({
  planId: z.string().uuid(),
  subtasks: z.array(SubtaskSchema),
  conflicts: z.array(z.string()).optional(),
});

export type GeneratePlanResponse = z.infer<typeof GeneratePlanResponseSchema>;

export const CommitPlanRequestSchema = z.object({
  planId: z.string().uuid(),
  approvedTasks: z.array(
    z.object({
      id: z.string(),
      start: z.string().datetime(),
      duration: z.number().positive(),
    })
  ),
});

export type CommitPlanRequest = z.infer<typeof CommitPlanRequestSchema>;

export const CommitPlanResponseSchema = z.object({
  createdEvents: z.array(
    z.object({
      eventId: z.string(),
      taskId: z.string(),
      status: z.enum(['created', 'failed']),
      error: z.string().optional(),
    })
  ),
  errors: z.array(z.string()).optional(),
});

export type CommitPlanResponse = z.infer<typeof CommitPlanResponseSchema>;

// Auth types
export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.date(),
  provider: z.enum(['google', 'microsoft', 'caldav']),
});

export type AuthToken = z.infer<typeof AuthTokenSchema>;

// Calendar Provider types
export interface CalendarProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface CalendarContext {
  events: CalendarEvent[];
  workingHours?: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  timezone: string;
  preferences?: {
    bufferTime?: number; // minutes
    preferredTimeBlocks?: string[]; // e.g., ['morning', 'afternoon']
  };
}
