import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';

export interface Subtask {
  title: string;
  description: string;
  estimatedDuration: number; // in minutes
  priority: 'high' | 'medium' | 'low';
  suggestedStart?: string; // ISO date string
  suggestedEnd?: string; // ISO date string
  location?: string;
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; // How often it repeats
    interval?: number; // Every N days/weeks/months (default: 1)
    until?: string; // ISO date string - when to stop repeating
    count?: number; // Alternative to until - how many times to repeat
    byDay?: string[]; // For weekly: ['MO', 'WE', 'FR']
  };
}

export interface TaskPlanResponse {
  subtasks: Subtask[];
  conflicts: string[];
  recommendations: string[];
  id?: string;
  status?: string;
  userId?: string;
  goalId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  calendarEvents?: any;
}

@Injectable()
export class TaskPlanService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private calendarService: CalendarService,
  ) {}

  async generateTaskPlan(
    userId: string,
    goalId: string,
  ): Promise<TaskPlanResponse> {
    // Get goal details
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Get user's existing calendar events to check for conflicts
    const now = new Date();
    
    // Fetch events from Google Calendar (not just local database)
    let existingEvents: any[] = [];
    try {
      const googleEvents = await this.calendarService.getEvents(userId, {
        timeMin: now,
        timeMax: goal.deadline,
        maxResults: 250, // Get more events to ensure we have all conflicts
      });

      // Transform Google Calendar events to our format
      existingEvents = googleEvents
        .filter(e => e.start && e.end)
        .map(e => {
          const startTime = e.start?.dateTime || e.start?.date;
          const endTime = e.end?.dateTime || e.end?.date;
          
          if (!startTime || !endTime) return null;
          
          return {
            id: e.id,
            title: e.summary || 'Untitled Event',
            description: e.description,
            start: new Date(startTime),
            end: new Date(endTime),
            location: e.location,
            isAllDay: !e.start?.dateTime, // If no dateTime, it's an all-day event
          };
        })
        .filter(e => e !== null);

      console.log(`📅 Fetched ${existingEvents.length} events from Google Calendar`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('⚠️ Failed to fetch Google Calendar events:', errorMessage);
      console.log('📅 Falling back to local database events...');
      
      // Fallback to local database if Google Calendar fails
      existingEvents = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          start: {
            gte: now,
            lte: goal.deadline,
          },
        },
        orderBy: { start: 'asc' },
      });
    }

    // Log existing events with their FULL time ranges for debugging
    console.log('📅 Existing calendar events found:');
    if (existingEvents.length === 0) {
      console.log('   ✅ No events - calendar is free');
    } else {
      existingEvents.forEach(e => {
        const start = new Date(e.start);
        const end = new Date(e.end);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
        console.log(`   📌 "${e.title}"`);
        console.log(`      ⏰ Start: ${start.toLocaleString('it-IT')}`);
        console.log(`      ⏰ End: ${end.toLocaleString('it-IT')}`);
        console.log(`      ⌛ Duration: ${duration} minutes (${Math.floor(duration / 60)}h ${duration % 60}m)`);
      });
    }

    // Calculate available time slots
    const totalDays = Math.ceil(
      (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );


    // qui

   // Try generating plan with automatic overlap detection and retry
  let taskPlan: TaskPlanResponse | undefined;
  let attempts = 0;
  const maxAttempts = 5;
  let previousOverlaps: string[] = [];

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🤖 AI generation attempt ${attempts}/${maxAttempts}`);

    // Build AI prompt (include previous overlaps if any)
    const prompt = this.buildPrompt(goal, existingEvents, totalDays, previousOverlaps);

    // Call AI API
    const aiResponse = await this.callAI(prompt);

    // Parse AI response
    const currentPlan = this.parseAIResponse(aiResponse);

    // Validate for overlaps
    const overlaps = this.detectOverlaps(currentPlan.subtasks, existingEvents);
    
    // ⚠️ REMOVED: detectDuplicateTasks - AI now handles this intelligently
    
    // ⚠️ Validate for invalid recurring events ONLY if user disabled allowRecurrence
    console.log(`🔍 Goal allowRecurrence value: ${(goal as any).allowRecurrence} (type: ${typeof (goal as any).allowRecurrence})`);
    const invalidRecurrence = (goal as any).allowRecurrence === false 
      ? this.detectInvalidRecurrence(currentPlan.subtasks)
      : [];
    console.log(`🔍 invalidRecurrence array length: ${invalidRecurrence.length}`);

    // ✅ UPDATED: Only check overlaps and invalid recurrence
    if (overlaps.length === 0 && invalidRecurrence.length === 0) {
      console.log('✅ No overlaps or invalid recurrence detected, plan is valid!');
      taskPlan = currentPlan;
      break;
    }
    
    if (invalidRecurrence.length > 0) {
      console.warn(`⚠️ Detected ${invalidRecurrence.length} invalid recurring events:`);
      invalidRecurrence.forEach(err => console.warn(`  - ${err}`));
    }

    if (overlaps.length > 0) {
      console.warn(`⚠️ Detected ${overlaps.length} overlaps on attempt ${attempts}:`);
      overlaps.forEach(overlap => console.warn(`  - ${overlap}`));
    }

    // ✅ UPDATED: Store only overlaps and invalid recurrence for next attempt
    previousOverlaps = [...overlaps, ...invalidRecurrence];

    if (attempts === maxAttempts) {
      // Add overlaps to conflicts section with helpful suggestions
      currentPlan.conflicts = [
        ...(currentPlan.conflicts || []),
        ...overlaps.map(o => `SOVRAPPOSIZIONE: ${o}`),
      ];
      
      // Add recommendations on how to fix conflicts
      currentPlan.recommendations = [
        ...(currentPlan.recommendations || []),
        '🔄 SUGGERIMENTO: Puoi rigenerare il piano - il sistema proverà automaticamente a evitare le sovrapposizioni',
        '✏️ ALTERNATIVA: Modifica manualmente gli orari dei task in conflitto',
        '📅 NOTA: Gli eventi esistenti nel calendario hanno priorità e non possono essere spostati',
      ];
      
      console.error('❌ Max attempts reached, returning plan with overlap warnings');
      taskPlan = currentPlan;
    }
  }

    if (!taskPlan) {
      throw new Error('Failed to generate task plan');
    }

    // Save task plan to database
    const savedPlan = await this.prisma.taskPlan.create({
      data: {
        userId,
        goalId,
        status: 'draft',
        subtasks: taskPlan.subtasks as any,
        conflicts: taskPlan.conflicts as any,
      },
    });

    // ✅ Return the complete plan from database (with id, status, userId, etc.)
    return {
      ...taskPlan,
      id: savedPlan.id,
      status: savedPlan.status,
      userId: savedPlan.userId,
      goalId: savedPlan.goalId,
      createdAt: savedPlan.createdAt,
      updatedAt: savedPlan.updatedAt,
    };
  }

  /**
   * Detect overlaps between generated tasks and existing calendar events
   */
  private detectOverlaps(subtasks: Subtask[], existingEvents: any[]): string[] {
    const overlaps: string[] = [];

    for (const task of subtasks) {
      if (!task.suggestedStart || !task.suggestedEnd) continue;

      // Se il task ha recurrence, espandi tutte le istanze
      const taskInstances = this.expandRecurrence(
        task.suggestedStart,
        task.suggestedEnd,
        task.recurrence
      );

      // Controlla ogni istanza del task contro tutti gli eventi
      for (const [taskStart, taskEnd] of taskInstances) {
        for (const event of existingEvents) {
          const eventStart = new Date(event.start).getTime();
          const eventEnd = new Date(event.end).getTime();
          
          // Buffer di 15 minuti (900000 ms)
          const buffer = 15 * 60 * 1000;

          // Check for overlap WITH BUFFER: (taskStart < eventEnd + buffer) AND (taskEnd > eventStart - buffer)
          if (taskStart < eventEnd + buffer && taskEnd > eventStart - buffer) {
            const taskStartStr = new Date(taskStart).toLocaleString('it-IT', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            const taskEndStr = new Date(taskEnd).toLocaleString('it-IT', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            const eventStartStr = new Date(eventStart).toLocaleString('it-IT', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            const eventEndStr = new Date(eventEnd).toLocaleString('it-IT', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            overlaps.push(
              `Task "${task.title}" (${taskStartStr} - ${taskEndStr}) si sovrappone con evento "${event.title}" (${eventStartStr} - ${eventEndStr})`
            );
            
            // 🔍 DEBUG: Log dettagliato della sovrapposizione
            console.log(`🔍 OVERLAP DETECTED:
  Task: "${task.title}" 
  Task Time: ${new Date(taskStart).toISOString()} - ${new Date(taskEnd).toISOString()}
  Event: "${event.title}"
  Event Time: ${new Date(eventStart).toISOString()} - ${new Date(eventEnd).toISOString()}
  Buffer: ${buffer}ms (15 minutes)
  taskStart (${taskStart}) < eventEnd + buffer (${eventEnd + buffer})? ${taskStart < eventEnd + buffer}
  taskEnd (${taskEnd}) > eventStart - buffer (${eventStart - buffer})? ${taskEnd > eventStart - buffer}`);
          }
        }
      }
    }

    return overlaps;
  }

  /**
   * Espande un evento ricorrente in tutte le sue istanze individuali
   */
  private expandRecurrence(
    startISO: string,
    endISO: string,
    recurrence?: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      interval?: number;
      byDay?: string[];
      until?: string;
    }
  ): Array<[number, number]> {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const duration = end.getTime() - start.getTime();
    const instances: Array<[number, number]> = [];

    // Se non c'è recurrence, ritorna solo l'istanza singola
    if (!recurrence) {
      instances.push([start.getTime(), end.getTime()]);
      return instances;
    }

    const until = recurrence.until ? new Date(recurrence.until) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000); // max 1 anno
    const interval = recurrence.interval || 1;

    let currentDate = new Date(start);

    // Espandi in base alla frequenza
    while (currentDate <= until) {
      if (recurrence.frequency === 'WEEKLY' && recurrence.byDay) {
        // Per ogni giorno della settimana specificato
        for (const day of recurrence.byDay) {
          const dayIndex = this.getDayIndex(day);
          const targetDate = new Date(currentDate);
          const currentDay = targetDate.getDay();
          const daysToAdd = (dayIndex - currentDay + 7) % 7;
          targetDate.setDate(targetDate.getDate() + daysToAdd);

          // Controlla se questa istanza è nel range
          if (targetDate >= start && targetDate <= until) {
            const instanceStart = new Date(targetDate);
            instanceStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
            const instanceEnd = new Date(instanceStart.getTime() + duration);
            
            instances.push([instanceStart.getTime(), instanceEnd.getTime()]);
          }
        }
        // Vai alla prossima settimana (interval settimane)
        currentDate.setDate(currentDate.getDate() + (7 * interval));
      } else if (recurrence.frequency === 'DAILY') {
        const instanceStart = new Date(currentDate);
        const instanceEnd = new Date(instanceStart.getTime() + duration);
        instances.push([instanceStart.getTime(), instanceEnd.getTime()]);
        currentDate.setDate(currentDate.getDate() + interval);
      } else if (recurrence.frequency === 'MONTHLY') {
        const instanceStart = new Date(currentDate);
        const instanceEnd = new Date(instanceStart.getTime() + duration);
        instances.push([instanceStart.getTime(), instanceEnd.getTime()]);
        currentDate.setMonth(currentDate.getMonth() + interval);
      }
    }

    return instances;
  }

  /**
   * Converte abbreviazione giorno (MO, TU, etc.) in indice (0=Domenica, 1=Lunedì, etc.)
   */
  private getDayIndex(dayAbbr: string): number {
    const map: { [key: string]: number } = {
      'SU': 0,
      'MO': 1,
      'TU': 2,
      'WE': 3,
      'TH': 4,
      'FR': 5,
      'SA': 6,
    };
    return map[dayAbbr] ?? 1;
  }

  /**
   * Validate that recurring events should have the SAME title/purpose
   * If we detect multiple subtasks with recurrence but different titles, it's likely an error
   */
  private detectInvalidRecurrence(subtasks: Subtask[]): string[] {
    const errors: string[] = [];
    
    // Se ci sono più subtask con recurrence, probabilmente è sbagliato
    const recurringTasks = subtasks.filter(t => t.recurrence);
    
    if (recurringTasks.length > 1) {
      // Controlla se hanno titoli diversi (potrebbero essere fasi diverse)
      const uniqueTitles = new Set(recurringTasks.map(t => t.title));
      
      if (uniqueTitles.size > 1) {
        errors.push(
          `ERRORE: Trovati ${recurringTasks.length} task ricorrenti con titoli DIVERSI: ${Array.from(uniqueTitles).join(', ')}. ` +
          `Se sono FASI DIVERSE o ATTIVITÀ DIVERSE, NON devono avere recurrence. ` +
          `Crea invece eventi SEPARATI senza recurrence, uno per ogni fase/attività. ` +
          `La recurrence va usata SOLO quando la STESSA attività si ripete (es: "Allenamento" ogni settimana).`
        );
      }
    }
    
    // Se un task ha recurrence e contiene indicatori di "fase" nel titolo, è probabilmente sbagliato
    for (const task of recurringTasks) {
      const phaseIndicators = ['fase', 'step', 'modulo', 'capitolo', 'parte', 'milestone', 'consegna', 'revisione', 'implementazione', 'analisi', 'testing', 'deploy'];
      const lowerTitle = task.title.toLowerCase();
      
      if (phaseIndicators.some(indicator => lowerTitle.includes(indicator))) {
        errors.push(
          `ERRORE: Il task "${task.title}" ha recurrence ma sembra essere una FASE/STEP di un progetto. ` +
          `Le fasi di un progetto NON devono avere recurrence. ` +
          `Crea eventi SEPARATI senza recurrence per ogni fase.`
        );
      }
    }
    
    return errors;
  }

  /**
   * Valida che un evento sia in un orario realistico e sostenibile
   */
  private validateRealisticTime(startDate: Date, endDate: Date): { valid: boolean; reason?: string } {
    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();
    
    // 1. Orari notturni vietati (00:00-06:00)
    if (startHour >= 0 && startHour < 6) {
      return {
        valid: false,
        reason: `Orario notturno non valido (${startHour}:${startMinute.toString().padStart(2, '0')}). Gli eventi devono iniziare dopo le 06:00.`
      };
    }
    
    // 2. Eventi che finiscono di notte
    if (endHour >= 0 && endHour < 6) {
      return {
        valid: false,
        reason: `L'evento termina di notte (${endHour}:${endMinute.toString().padStart(2, '0')}). Gli eventi devono terminare prima delle 23:59 o dopo le 06:00.`
      };
    }
    
    // 3. Eventi troppo tardi (inizio dopo le 23:00)
    if (startHour >= 23) {
      return {
        valid: false,
        reason: `Orario di inizio troppo tardo (${startHour}:${startMinute.toString().padStart(2, '0')}). Gli eventi devono iniziare prima delle 23:00.`
      };
    }
    
    // 4. Durata minima (almeno 15 minuti)
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    if (durationMinutes < 15) {
      return {
        valid: false,
        reason: `Durata troppo breve (${Math.round(durationMinutes)} minuti). Gli eventi devono durare almeno 15 minuti.`
      };
    }
    
    // 5. Durata massima ragionevole (max 12 ore per singolo evento)
    if (durationMinutes > 12 * 60) {
      return {
        valid: false,
        reason: `Durata eccessiva (${Math.round(durationMinutes / 60)} ore). Gli eventi non dovrebbero superare le 12 ore.`
      };
    }
    
    return { valid: true };
  }
private buildPrompt(
  goal: any,
  existingEvents: any[],
  totalDays: number,
  previousOverlaps: string[] = [],
): string {
  const now = new Date();
  const deadline = new Date(goal.deadline);
  
  // Calculate available time
  const workHoursPerDay = 8;
  const totalWorkHours = totalDays * workHoursPerDay;
  const occupiedHours = existingEvents.reduce((total, event) => {
    return total + (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
  }, 0);
  const availableHours = totalWorkHours - occupiedHours;
  
  // Format occupied slots compactly
  const occupiedSlots = existingEvents.map(e => ({
    title: e.title,
    start: new Date(e.start).toISOString(),
    end: new Date(e.end).toISOString(),
    duration: Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / (1000 * 60))
  }));

  // File context
  const fileContext = goal.extractedContent 
    ? `ATTACHED_FILE: "${goal.attachedFileName}"\nCONTENT: ${goal.extractedContent.substring(0, 1000)}...\nUSE this content to create specific, relevant subtasks.`
    : '';

  // Retry feedback
  const retryContext = previousOverlaps.length > 0 
    ? `PREVIOUS_ERRORS:\n${previousOverlaps.map((o, i) => `${i + 1}. ${o}`).join('\n')}\nFIX: Reschedule conflicting tasks to completely different time slots.\n`
    : '';

  // Recurrence policy
  const recurrencePolicy = (goal as any).allowRecurrence === false
    ? 'RECURRENCE_DISABLED: User explicitly disabled recurring events. Create separate single events even for repeated activities.'
    : 'RECURRENCE_ENABLED: Use recurrence for same repeated activities.';

  return `You are an expert AI scheduler. Generate a conflict-free task plan in JSON format.

CONTEXT:
${JSON.stringify({
  goal: {
    title: goal.title,
    description: goal.description || 'N/A',
    priority: goal.priority,
    deadline: deadline.toISOString()
  },
  timeWindow: {
    start: now.toISOString(),
    end: deadline.toISOString(),
    daysAvailable: totalDays,
    hoursAvailable: Math.round(availableHours),
    minutesAvailable: Math.round(availableHours * 60)
  },
  occupiedSlots: occupiedSlots.length > 0 ? occupiedSlots : "CALENDAR_FREE",
  userLocation: "Monza, IT (UTC+1)"
}, null, 0)}

${fileContext}
${retryContext}

MANDATORY_RULES:
1. USER_SETTINGS (IMPERATIVE - MUST FOLLOW):
   - ${recurrencePolicy}
   - Output language: ITALIAN only (all titles/descriptions in Italian)
   - Frequency precision: If user says "N times/week", use EXACTLY N days in byDay array

2. SCHEDULING_CONSTRAINTS:
   - NO overlaps with occupied slots (15min buffer required)
   - Valid hours: 06:00-23:00 (prefer 08:00-22:00)
   - FORBIDDEN: 00:00-06:00 (night), starting after 23:00
   - Minimum duration: 15min, Maximum: 12 hours
   - Realistic timing: consider travel time, breaks, physical limits

3. TASK_GRANULARITY (CRITICAL):
   MERGE when: Activities happen in SAME session (e.g., workout exercises → 1 subtask)
   SEPARATE when: Different phases/milestones OR different days (e.g., project phases → N subtasks)
   
   Pattern detection:
   - Keywords "fase/step/modulo/capitolo" → SEPARATE events
   - "N times/week" + same activity → 1 RECURRING event
   - "N phases" + different activities → N SEPARATE events

4. MULTIPLE_TASKS_PER_DAY (SMART LOGIC):
   ⚠️ ONLY schedule multiple tasks on same day when:
   
   ALLOWED (natural/requested):
   ✅ User explicitly requests: "morning workout + afternoon study"
   ✅ Natural daily structure: "work session + meeting + review" 
   ✅ Complementary activities: "gym + meal prep"
   ✅ Full-day project breakdown: "coding morning + testing afternoon"
   ✅ Multi-part routine: "warm-up + workout + stretching" (but merge these into 1 task!)
   
   FORBIDDEN (unnatural):
   ❌ Repeating same activity: "Workout 1" + "Workout 2" same day → NO, use 2 different days
   ❌ Arbitrary splitting: "Study session 1" + "Study session 2" → NO, make 1 longer session
   ❌ Forced filling: Don't add extra tasks just because time is available
   
   DEFAULT BEHAVIOR: ONE main task per day unless context clearly indicates otherwise.
   
   Decision criteria:
   - Read goal.description for explicit day structure requests
   - Check goal.title for keywords: "giornata", "mattina+pomeriggio", "multi-task"
   - Analyze attached file for daily schedules or routines
   - If uncertain → distribute across different days

5. RECURRENCE_LOGIC:
   USE recurrence when: SAME activity repeats (e.g., "Weekly workout")
   NO recurrence when: DIFFERENT activities in sequence (e.g., "Phase 1, Phase 2, Phase 3")
   
   Frequency mapping (EXACT):
   - "1/week" → byDay: ["WE"] (1 day)
   - "2/week" → byDay: ["MO","TH"] (2 days)
   - "3/week" → byDay: ["MO","WE","FR"] (3 days)
   - "daily" → frequency: "DAILY"

6. CONFLICT_DETECTION_ALGORITHM:
   For each subtask:
     taskStart = Date(suggestedStart).getTime()
     taskEnd = Date(suggestedEnd).getTime()
     buffer = 900000 // 15min in ms
     
     For each occupiedSlot:
       eventStart = Date(start).getTime()
       eventEnd = Date(end).getTime()
       
       IF (taskStart < eventEnd + buffer) AND (taskEnd > eventStart - buffer):
         CONFLICT → Must reschedule task

OUTPUT_SCHEMA (JSON only, no markdown):
{
  "subtasks": [
    {
      "title": "string (max 60 chars, Italian)",
      "description": "string (detailed, Italian)",
      "estimatedDuration": number, // minutes (60-180 typical)
      "priority": "high"|"medium"|"low",
      "suggestedStart": "ISO8601 timestamp (REQUIRED)",
      "suggestedEnd": "ISO8601 timestamp (REQUIRED)",
      "location": "string (optional)",
      "recurrence": { // OPTIONAL - only for repeated SAME activity
        "frequency": "DAILY"|"WEEKLY"|"MONTHLY",
        "interval": number, // default: 1
        "byDay": ["MO","TU","WE","TH","FR","SA","SU"], // for WEEKLY
        "until": "ISO8601 timestamp" // use goal.deadline
      }
    }
  ],
  "conflicts": ["string"], // warnings about tight deadlines, full calendar, etc.
  "recommendations": ["string"] // strategic suggestions for user
}

VALIDATION_CHECKLIST (before outputting):
✓ All suggestedStart/End are ISO8601 timestamps
✓ No overlaps with occupiedSlots (checked with algorithm above)
✓ If user said "N/week", byDay.length === N
✓ Recurrence only for SAME repeated activity
✓ Multiple tasks per day ONLY if natural/requested (see rule 4)
✓ All text in ITALIAN
✓ Valid time range (06:00-23:00)
✓ Realistic durations (15min - 12h)

START_ANALYSIS: Generate the task plan now.`;
}

  private async callAI(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');

    if (!apiKey || apiKey === 'your-openrouter-api-key') {
      // Fallback: return mock response for development
      console.warn('OpenRouter API key not configured, using mock response');
      return this.getMockResponse();
    }

    try {
      console.log('🤖 Calling OpenRouter API with model: google/gemma-3-27b-it:free');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'InteractiveVerseFocus',
        },
        body: JSON.stringify({
          model: 'google/gemma-3-27b-it:free',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 10000, // Increased for complex scheduling logic
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error response:', errorText);
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log('✅ OpenRouter API response received');
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI API call failed:', error);
      // Fallback to mock response
      return this.getMockResponse();
    }
  }

  private getMockResponse(): string {
    return JSON.stringify({
      subtasks: [
        {
          title: 'Pianificazione iniziale',
          description: 'Analizzare i requisiti e definire milestone principali',
          estimatedDuration: 60,
          priority: 'high',
        },
        {
          title: 'Ricerca e documentazione',
          description: 'Raccogliere informazioni necessarie e documentare approccio',
          estimatedDuration: 90,
          priority: 'medium',
        },
        {
          title: 'Implementazione fase 1',
          description: 'Sviluppare le funzionalità core del progetto',
          estimatedDuration: 180,
          priority: 'high',
        },
        {
          title: 'Testing e review',
          description: 'Testare tutto e fare review del lavoro svolto',
          estimatedDuration: 60,
          priority: 'medium',
        },
        {
          title: 'Finalizzazione',
          description: 'Completare documentazione e preparare consegna',
          estimatedDuration: 45,
          priority: 'low',
        },
      ],
      conflicts: [],
      recommendations: [
        'Considera di dedicare le mattine alle task ad alta priorità',
        'Prevedi buffer time tra le sessioni di lavoro',
        'Fai review giornaliera dei progressi',
      ],
    });
  }

  private parseAIResponse(response: string): TaskPlanResponse {
    try {
      // Log raw response for debugging
      console.log('📝 Raw AI response length:', response.length);
      console.log('📝 First 200 chars:', response.substring(0, 200));
      console.log('📝 Last 200 chars:', response.substring(response.length - 200));
      
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }

      // Try to extract JSON if there's extra text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      // Fix common JSON issues
      cleanedResponse = cleanedResponse
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/\\n/g, ' ') // Replace newlines in strings
        .replace(/\n/g, ' ') // Replace actual newlines
        .trim();

      // Try to fix truncated JSON by closing it properly
      const openBraces = (cleanedResponse.match(/\{/g) || []).length;
      const closeBraces = (cleanedResponse.match(/\}/g) || []).length;
      const openBrackets = (cleanedResponse.match(/\[/g) || []).length;
      const closeBrackets = (cleanedResponse.match(/\]/g) || []).length;

      // If JSON is incomplete, try to close it
      if (openBrackets > closeBrackets || openBraces > closeBraces) {
        console.warn('⚠️ Detected incomplete JSON, attempting to fix...');
        
        // Remove any incomplete last element
        const lastComma = cleanedResponse.lastIndexOf(',');
        if (lastComma > 0) {
          cleanedResponse = cleanedResponse.substring(0, lastComma);
        }
        
        // Close missing brackets and braces
        for (let i = 0; i < (openBrackets - closeBrackets); i++) {
          cleanedResponse += ']';
        }
        for (let i = 0; i < (openBraces - closeBraces); i++) {
          cleanedResponse += '}';
        }
        
        console.log('🔧 Fixed JSON length:', cleanedResponse.length);
      }

      console.log('🧹 Cleaned response length:', cleanedResponse.length);

      const parsed = JSON.parse(cleanedResponse);
      
      // Validate structure
      if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) {
        throw new Error('Invalid AI response structure - no subtasks array');
      }

      console.log(`✅ Successfully parsed ${parsed.subtasks.length} subtasks`);

      return {
        subtasks: parsed.subtasks,
        conflicts: parsed.conflicts || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      console.error('Response that failed:', response.substring(0, 500));
      
      // Return mock as fallback
      console.warn('⚠️ Falling back to mock response');
      return JSON.parse(this.getMockResponse());
    }
  }

  async getTaskPlan(userId: string, goalId: string) {
    return this.prisma.taskPlan.findFirst({
      where: { userId, goalId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskPlanById(userId: string, planId: string) {
    return this.prisma.taskPlan.findFirst({
      where: { userId, id: planId },
    });
  }

  async updateTaskPlanStatus(
    userId: string,
    planId: string,
    status: 'draft' | 'approved' | 'committed' | 'rejected',
  ) {
    return this.prisma.taskPlan.updateMany({
      where: { id: planId, userId },
      data: { status },
    });
  }

  async scheduleTasksToCalendar(userId: string, planId: string) {
    // Get the task plan
    const taskPlan = await this.prisma.taskPlan.findFirst({
      where: { id: planId, userId },
      include: { goal: true },
    });

    if (!taskPlan) {
      throw new Error('Task plan not found');
    }

    // ⚠️ STEP 1: Fetch ALL existing events from Google Calendar (not from DB!)
    console.log('🔍 Fetching existing events from Google Calendar for final validation...');
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    const existingGoogleEvents = await this.calendarService.getEvents(userId, {
      timeMin: now,
      timeMax: oneYearFromNow,
      maxResults: 2500, // Get all events
    });

    // Transform Google Calendar events to our format
    const existingEvents = existingGoogleEvents.map((event: any) => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      isRecurring: !!event.recurrence,
    }));

    console.log(`📅 Found ${existingEvents.length} existing events in Google Calendar`);

    const subtasks = taskPlan.subtasks as any as Subtask[];
    const createdEvents = [];
    const skippedEvents = [];
    const calendarEventsMap: Record<number, string> = {}; // Map subtask index to event ID

    // ⚠️ STEP 2: Create calendar events ONLY if they don't overlap
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      
      if (!subtask || !subtask.suggestedStart || !subtask.suggestedEnd) {
        console.warn(`⏭️ Skipping subtask at index ${i} - no suggested time or undefined`);
        continue;
      }

      try {
        // ⚠️ STEP 1: Validate realistic time slots
        const startDate = new Date(subtask.suggestedStart);
        const endDate = new Date(subtask.suggestedEnd);
        
        // Check for unrealistic time slots
        const timeValidation = this.validateRealisticTime(startDate, endDate);
        if (!timeValidation.valid) {
          console.error(`❌ BLOCKED: Event "${subtask.title}" has unrealistic time slot: ${timeValidation.reason}`);
          skippedEvents.push({
            subtaskTitle: subtask.title,
            start: subtask.suggestedStart,
            reason: timeValidation.reason,
          });
          continue;
        }
        
        // ⚠️ STEP 2: Validate this specific subtask against ALL existing events
        const overlaps = this.detectOverlaps([subtask], existingEvents);
        
        if (overlaps.length > 0) {
          console.error(`❌ BLOCKED: Event "${subtask.title}" would overlap with existing events:`);
          overlaps.forEach(overlap => console.error(`   - ${overlap}`));
          
          skippedEvents.push({
            subtaskTitle: subtask.title,
            start: subtask.suggestedStart,
            reason: 'Overlap detected',
            overlaps: overlaps,
          });
          
          // ⚠️ DO NOT CREATE THIS EVENT - skip to next
          continue;
        }

        // Build recurrence rules if specified
        let recurrenceRules: string[] | undefined;
        if (subtask.recurrence) {
          const rrule = this.buildRRule(subtask.recurrence);
          if (rrule) {
            recurrenceRules = [rrule];
            console.log(`🔁 Creating recurring event: ${subtask.title} with rule: ${rrule}`);
          }
        }

        // ✅ No overlaps - safe to create
        const event = await this.calendarService.createEvent(userId, {
          summary: `${taskPlan.goal.title}: ${subtask.title}`,
          description: `${subtask.description}\n\n📋 Parte dell'obiettivo: ${taskPlan.goal.title}\n⏱️ Durata stimata: ${subtask.estimatedDuration} minuti\n🎯 Priorità: ${subtask.priority}${subtask.recurrence ? `\n🔁 Ricorrenza: ${this.formatRecurrence(subtask.recurrence)}` : ''}`,
          start: new Date(subtask.suggestedStart),
          end: new Date(subtask.suggestedEnd),
          location: subtask.location,
          recurrence: recurrenceRules,
        });

        // Store the mapping of subtask index to event ID
        if (event.id) {
          calendarEventsMap[i] = event.id;
        }

        createdEvents.push({
          eventId: event.id,
          subtaskTitle: subtask.title,
          start: subtask.suggestedStart,
          isRecurring: !!subtask.recurrence,
        });

        console.log(`✅ Created calendar event for: ${subtask.title}${subtask.recurrence ? ' (RECURRING)' : ''}`);
        
        // ⚠️ IMPORTANT: Add this newly created event to existingEvents 
        // so next iterations check against it too!
        existingEvents.push({
          id: event.id || `temp-${i}`,
          title: `${taskPlan.goal.title}: ${subtask.title}`,
          start: subtask.suggestedStart,
          end: subtask.suggestedEnd,
          isRecurring: !!subtask.recurrence,
        });
        
      } catch (error) {
        console.error(`❌ Failed to create event for subtask "${subtask.title}":`, error);
        skippedEvents.push({
          subtaskTitle: subtask.title,
          start: subtask.suggestedStart,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update task plan with status and calendar events mapping
    await this.prisma.taskPlan.update({
      where: { id: planId },
      data: { 
        status: 'committed',
        calendarEvents: calendarEventsMap as any,
      },
    });

    // ⚠️ Log summary
    if (skippedEvents.length > 0) {
      console.warn(`⚠️ ${skippedEvents.length} eventi sono stati SALTATI per sovrapposizioni:`);
      skippedEvents.forEach(skipped => {
        console.warn(`   - ${skipped.subtaskTitle} (${skipped.reason})`);
      });
    }

    return {
      success: true,
      createdEvents,
      skippedEvents,
      message: `${createdEvents.length}/${subtasks.length} eventi creati sul calendario${skippedEvents.length > 0 ? ` (${skippedEvents.length} saltati per sovrapposizioni)` : ''}`,
    };
  }

  /**
   * Remove a calendar event ID from a task plan after deletion
   */
  async removeCalendarEventFromPlan(userId: string, planId: string, taskIndex: number) {
    const taskPlan = await this.prisma.taskPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!taskPlan) {
      throw new Error('Task plan not found');
    }

    const calendarEvents = (taskPlan.calendarEvents as any) || {};
    delete calendarEvents[taskIndex];

    await this.prisma.taskPlan.update({
      where: { id: planId },
      data: { calendarEvents: calendarEvents as any },
    });

    console.log(`✅ Removed calendar event for task ${taskIndex} from plan ${planId}`);
  }

  /**
   * Clear all calendar events from a task plan
   */
  async clearCalendarEvents(userId: string, planId: string) {
    const taskPlan = await this.prisma.taskPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!taskPlan) {
      throw new Error('Task plan not found');
    }

    await this.prisma.taskPlan.update({
      where: { id: planId },
      data: { 
        calendarEvents: {} as any,
        status: 'draft', // Reset to draft since events are deleted
      },
    });

    console.log(`✅ Cleared all calendar events from plan ${planId}`);
  }

  /**
   * Delete a task plan completely
   */
  async deleteTaskPlan(userId: string, planId: string) {
    const taskPlan = await this.prisma.taskPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!taskPlan) {
      throw new Error('Task plan not found');
    }

    await this.prisma.taskPlan.delete({
      where: { id: planId },
    });

    console.log(`✅ Deleted task plan ${planId}`);
  }

  /**
   * Build RRULE string from recurrence object
   */
  private buildRRule(recurrence: Subtask['recurrence']): string | null {
    if (!recurrence) return null;

    const parts: string[] = [`FREQ=${recurrence.frequency}`];

    if (recurrence.interval && recurrence.interval > 1) {
      parts.push(`INTERVAL=${recurrence.interval}`);
    }

    if (recurrence.until) {
      // Convert ISO date to RRULE format: YYYYMMDDTHHMMSSZ
      const until = new Date(recurrence.until);
      const rruleDate = until.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      parts.push(`UNTIL=${rruleDate}`);
    } else if (recurrence.count) {
      parts.push(`COUNT=${recurrence.count}`);
    }

    if (recurrence.byDay && recurrence.byDay.length > 0) {
      parts.push(`BYDAY=${recurrence.byDay.join(',')}`);
    }

    return `RRULE:${parts.join(';')}`;
  }

  /**
   * Format recurrence for human-readable description
   */
  private formatRecurrence(recurrence: Subtask['recurrence']): string {
    if (!recurrence) return '';

    let desc = '';
    
    if (recurrence.frequency === 'DAILY') {
      desc = recurrence.interval && recurrence.interval > 1 
        ? `Ogni ${recurrence.interval} giorni` 
        : 'Ogni giorno';
    } else if (recurrence.frequency === 'WEEKLY') {
      desc = recurrence.interval && recurrence.interval > 1 
        ? `Ogni ${recurrence.interval} settimane` 
        : 'Ogni settimana';
      
      if (recurrence.byDay && recurrence.byDay.length > 0) {
        const dayNames: Record<string, string> = {
          'MO': 'Lun', 'TU': 'Mar', 'WE': 'Mer', 
          'TH': 'Gio', 'FR': 'Ven', 'SA': 'Sab', 'SU': 'Dom'
        };
        const days = recurrence.byDay.map(d => dayNames[d] || d).join(', ');
        desc += ` (${days})`;
      }
    } else if (recurrence.frequency === 'MONTHLY') {
      desc = recurrence.interval && recurrence.interval > 1 
        ? `Ogni ${recurrence.interval} mesi` 
        : 'Ogni mese';
    }

    if (recurrence.until) {
      const until = new Date(recurrence.until);
      desc += ` fino al ${until.toLocaleDateString('it-IT')}`;
    } else if (recurrence.count) {
      desc += ` per ${recurrence.count} volte`;
    }

    return desc;
  }
}
