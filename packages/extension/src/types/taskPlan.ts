export interface Subtask {
  title: string;
  description: string;
  estimatedDuration: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  suggestedStart?: string;
  suggestedEnd?: string;
  location?: string;
}

export interface TaskPlanResponse {
  id: string;
  goalId: string;
  subtasks: Subtask[];
  conflicts: string[];
  recommendations: string[];
  status: 'draft' | 'approved' | 'committed' | 'rejected';
  calendarEvents?: Record<number, string>; // Map of subtask index to event ID
  createdAt: string;
  updatedAt: string;
}
