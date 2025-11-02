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

    // Try generating plan with automatic overlap detection and retry
    let taskPlan: TaskPlanResponse | undefined;
    let attempts = 0;
    const maxAttempts = 5; // Aumentato da 3 a 5 per dare più possibilità all'AI
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

      if (overlaps.length === 0) {
        console.log('✅ No overlaps detected, plan is valid!');
        taskPlan = currentPlan;
        break;
      }

      console.warn(`⚠️ Detected ${overlaps.length} overlaps on attempt ${attempts}:`);
      overlaps.forEach(overlap => console.warn(`  - ${overlap}`));

      // Store overlaps for next attempt
      previousOverlaps = overlaps;

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
    await this.prisma.taskPlan.create({
      data: {
        userId,
        goalId,
        status: 'draft',
        subtasks: taskPlan.subtasks as any,
        conflicts: taskPlan.conflicts as any,
      },
    });

    return taskPlan;
  }

  /**
   * Detect overlaps between generated tasks and existing calendar events
   */
  private detectOverlaps(subtasks: Subtask[], existingEvents: any[]): string[] {
    const overlaps: string[] = [];

    for (const task of subtasks) {
      if (!task.suggestedStart || !task.suggestedEnd) continue;

      const taskStart = new Date(task.suggestedStart).getTime();
      const taskEnd = new Date(task.suggestedEnd).getTime();

      for (const event of existingEvents) {
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();

        // Check for overlap: (taskStart < eventEnd) AND (taskEnd > eventStart)
        if (taskStart < eventEnd && taskEnd > eventStart) {
          const taskStartStr = new Date(taskStart).toLocaleString('it-IT', { 
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
          
          overlaps.push(
            `Task "${task.title}" (${taskStartStr}) si sovrappone con evento "${event.title}" (${eventStartStr})`
          );
        }
      }
    }

    return overlaps;
  }

  private buildPrompt(
    goal: any,
    existingEvents: any[],
    totalDays: number,
    previousOverlaps: string[] = [],
  ): string {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    
    // Calcola ore totali disponibili (considerando 8 ore lavorative al giorno)
    const workHoursPerDay = 8;
    const totalWorkHours = totalDays * workHoursPerDay;
    
    // Calcola ore già occupate da eventi
    const occupiedHours = existingEvents.reduce((total, event) => {
      const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);
    
    const availableHours = totalWorkHours - occupiedHours;
    
    // Crea mappa temporale precisa degli slot occupati
    const occupiedSlots = existingEvents.map((e) => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      return `EVENTO BLOCCATO: "${e.title}"
   INIZIO: ${start.toISOString()}
   FINE: ${end.toISOString()}
   DURATA: ${duration} minuti
   GIORNO: ${start.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
   ORARIO: ${start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    }).join('\n\n');

    const eventsAnalysis = existingEvents.length > 0
      ? `EVENTI CALENDARIO CHE OCCUPANO TEMPO (DA EVITARE ASSOLUTAMENTE):\n\n${occupiedSlots}`
      : 'CALENDARIO LIBERO: Nessun evento esistente';

    // Preparazione informazioni contestuali dal file allegato
    const fileContext = goal.extractedContent 
      ? `\n\n📎 CONTENUTO FILE ALLEGATO "${goal.attachedFileName}":\n${goal.extractedContent}\n\nUSA QUESTE INFORMAZIONI per creare task specifici e pertinenti al contenuto del documento.`
      : '';

    // Feedback da tentativi precedenti
    const retryFeedback = previousOverlaps.length > 0 
      ? `\n\n🚨🚨🚨 ATTENZIONE - ERRORI RILEVATI NEL TENTATIVO PRECEDENTE:\n\nHai generato task che si SOVRAPPONGONO con eventi esistenti:\n\n${previousOverlaps.map(o => `❌ ${o}`).join('\n')}\n\n⚠️ DEVI CORREGGERE QUESTI ERRORI:\n- Sposta i task in conflitto in orari COMPLETAMENTE DIVERSI\n- Assicurati che NON ci sia sovrapposizione con gli eventi elencati sopra\n- Considera di spostare i task al pomeriggio, sera, o su altri giorni\n- Se necessario, riduci la durata o dividi il task in sessioni più piccole\n`
      : '';

    return `Sei un AI planner esperto. Il tuo unico compito è suddividere l'obiettivo in subtask schedulati SENZA sovrapposizioni.${retryFeedback}

═══════════════════════════════════════════════════════════════════
📋 OBIETTIVO
═══════════════════════════════════════════════════════════════════
Titolo: "${goal.title}"
Descrizione: ${goal.description || 'Nessuna descrizione fornita'}${fileContext}
Scadenza: ${deadline.toISOString()}
Priorità: ${goal.priority}

═══════════════════════════════════════════════════════════════════
⏰ FINESTRA TEMPORALE
═══════════════════════════════════════════════════════════════════
INIZIO: ${now.toISOString()}
FINE: ${deadline.toISOString()}
Giorni disponibili: ${totalDays}
Ore lavorative totali: ${totalWorkHours}h
Ore già occupate: ${Math.round(occupiedHours)}h
Ore disponibili: ${Math.round(availableHours)}h (${Math.round(availableHours * 60)} minuti)

═══════════════════════════════════════════════════════════════════
� SLOT TEMPORALI OCCUPATI (NON USARE MAI)
═══════════════════════════════════════════════════════════════════
${eventsAnalysis}

═══════════════════════════════════════════════════════════════════
📝 ISTRUZIONI OBBLIGATORIE
═══════════════════════════════════════════════════════════════════

1. ANALIZZA L'OBIETTIVO
   - Leggi attentamente titolo, descrizione e contenuto del file allegato (se presente)
   - Identifica le attività necessarie per raggiungere l'obiettivo
   - ⚠️⚠️⚠️ REGOLA CRUCIALE - FREQUENZA ESPLICITA:
     
     SE l'utente scrive numeri specifici come:
     - "1 evento a settimana" / "1 volta a settimana" / "1 allenamento/settimana" → Crea ESATTAMENTE 1 evento/settimana (NON 2, NON 3!)
     - "2 eventi a settimana" / "2 volte a settimana" → Crea ESATTAMENTE 2 eventi/settimana
     - "3 allenamenti a settimana" → Crea ESATTAMENTE 3 eventi/settimana
     - "4 volte a settimana" → Crea ESATTAMENTE 4 eventi/settimana
     
     ⚠️ IMPORTANTE: Il numero è ESATTO, non un minimo!
     - "1/settimana" = 1 evento, non "1-2" o "almeno 1"
     - "2/settimana" = 2 eventi, non "2-3"
     
     → Rispetta ESATTAMENTE quella frequenza, non interpretarla liberamente
     → NON riempire forzatamente tutti i giorni disponibili
   - Determina se ci sono pattern ricorrenti (es: allenamento 3x/settimana, studio quotidiano)

2. FREQUENZA E DISTRIBUZIONE SETTIMANALE (REGOLA CRITICA)
   
   ⚠️⚠️⚠️ REGOLA AUREA - RISPETTA IL NUMERO ESATTO:
   
   ESEMPI CONCRETI (da rispettare LETTERALMENTE):
   - "1 evento a settimana" → byDay: ["MO"] (1 solo giorno, es: Lunedì)
   - "2 eventi a settimana" → byDay: ["MO", "TH"] (2 soli giorni, es: Lun, Gio)
   - "3 volte a settimana" → byDay: ["MO", "WE", "FR"] (3 soli giorni)
   - "4 allenamenti a settimana" → byDay: ["MO", "WE", "FR", "SA"] (4 soli giorni)
   - "7 volte a settimana" o "quotidiano" → byDay: ["MO","TU","WE","TH","FR","SA","SU"] (tutti i giorni)
   
   ⚠️ SE L'UTENTE DICE "1/settimana":
   - Crea UN SOLO evento ricorrente settimanale
   - byDay deve avere UN SOLO giorno
   - Esempio: byDay: ["WE"] (solo Mercoledì)
   - NON creare: byDay: ["MO", "WE"] → Questo è SBAGLIATO per "1/settimana"!
   
   ⚠️ SE L'UTENTE DICE "2/settimana":
   - Crea UN evento ricorrente con byDay che ha DUE giorni
   - Esempio: byDay: ["TU", "FR"] (Martedì e Venerdì)
   - NON creare 3 o più giorni!
   
   PRINCIPIO BASE:
   - NON riempire ogni singolo giorno solo perché è disponibile
   - La tendenza DEVE essere quella di rispettare le indicazioni dell'utente, NON massimizzare l'uso del tempo
   - Se l'utente vuole più eventi, li richiederà esplicitamente
   
   AGGIUNGI EVENTI EXTRA NELLO STESSO GIORNO SOLO SE:
   - L'utente lo richiede esplicitamente
   - Il calendario è così pieno che non c'è altra scelta
   - Sono attività complementari e brevi (max 60 min)
   
   DEFAULT: 1 evento principale per giorno, distribuito secondo la frequenza ESATTA richiesta

3. RAGGRUPPA INTELLIGENTEMENTE
   - Se un'attività si ripete → USA 1 EVENTO RICORRENTE (non N eventi separati)
   - Durata ideale per evento: 60-180 minuti (sessioni produttive)
   - Raggruppa attività correlate in macro-blocchi
   - Esempi:
     ✅ "Allenamento Upper Body" ripetuto (4x/settimana se richiesto)
     ❌ 7 eventi separati quando l'utente ha chiesto 4/settimana

4. SCHEDULAZIONE SENZA SOVRAPPOSIZIONI (ALGORITMO RIGIDO)
   
   Per OGNI subtask che crei:
   
   STEP A - Calcola timestamp evento:
   - taskStart = timestamp ISO inizio task
   - taskEnd = timestamp ISO fine task (taskStart + durata in millisecondi)
   
   STEP B - Controlla TUTTI gli eventi esistenti:
   Per ogni evento nel calendario:
     - eventStart = timestamp ISO inizio evento
     - eventEnd = timestamp ISO fine evento
     - Buffer = 15 minuti (900000 millisecondi)
     - Zona proibita = [eventStart - Buffer, eventEnd + Buffer]
     
   STEP C - Verifica sovrapposizione:
   Formula: (taskStart < eventEnd + Buffer) AND (taskEnd > eventStart - Buffer)
   - Se TRUE → SOVRAPPOSIZIONE → Sposta task in altro orario
   - Se FALSE → OK, procedi
   
   STEP D - Trova slot libero:
   - Orario lavorativo: 09:00-18:00 (giorni feriali)
   - Weekend: solo se strettamente necessario
   - Preferenza: mattina (09:00-12:00) per task intensi
   - Mantieni pattern ricorrenti (stesso giorno/ora se possibile)
   - ⚠️ RISPETTA LA FREQUENZA: Se l'utente vuole 4/settimana, distribuisci su 4 giorni diversi (NON 7!)
   - ⚠️ NON sovrapporre più eventi nello stesso giorno se non necessario

5. FORMATO SUBTASK (JSON)
   
   Ogni subtask DEVE avere:
   - title: stringa breve (max 60 caratteri)
   - description: stringa dettagliata (cosa include questo blocco)
   - estimatedDuration: numero in minuti (60-180)
   - priority: "high" | "medium" | "low"
   - suggestedStart: timestamp ISO 8601 (es: "2025-11-03T09:00:00.000Z") - OBBLIGATORIO
   - suggestedEnd: timestamp ISO 8601 (es: "2025-11-03T10:30:00.000Z") - OBBLIGATORIO
   - location: stringa (es: "Palestra", "Casa", "Ufficio")
   - recurrence: oggetto (OPZIONALE, solo per eventi ripetuti)
   
   Struttura recurrence (solo se l'attività si ripete):
   {
     "frequency": "DAILY" | "WEEKLY" | "MONTHLY",
     "interval": 1, // ogni quanti giorni/settimane/mesi
     "byDay": ["MO", "WE"], // solo per WEEKLY - ⚠️ NUMERO GIORNI = FREQUENZA RICHIESTA!
     "until": "2025-12-31T23:59:59.000Z" // data fine ripetizione (usa deadline)
   }
   
   ⚠️⚠️⚠️ ESEMPI CORRETTI DI FREQUENZA (SEGUI QUESTI PATTERN):
   
   CASO 1: "1 allenamento a settimana" o "1 volta/settimana"
   ✅ CORRETTO:
   "recurrence": {
     "frequency": "WEEKLY",
     "byDay": ["WE"],  // ← UN SOLO GIORNO (es: Mercoledì)
     "until": "2025-12-31T23:59:59.000Z"
   }
   ❌ SBAGLIATO: byDay: ["MO", "WE"] ← Questo è 2/settimana, NON 1!
   
   CASO 2: "2 allenamenti a settimana" o "2 volte/settimana"
   ✅ CORRETTO:
   "recurrence": {
     "frequency": "WEEKLY",
     "byDay": ["TU", "FR"],  // ← DUE GIORNI (es: Martedì, Venerdì)
     "until": "2025-12-31T23:59:59.000Z"
   }
   ❌ SBAGLIATO: byDay: ["MO", "WE", "FR"] ← Questo è 3/settimana, NON 2!
   
   CASO 3: "4 allenamenti a settimana" o "4 volte/settimana"
   ✅ CORRETTO:
   "recurrence": {
     "frequency": "WEEKLY",
     "byDay": ["MO", "WE", "FR", "SA"],  // ← QUATTRO GIORNI
     "until": "2025-12-31T23:59:59.000Z"
   }
   
   CASO 4: "Ogni giorno" o "quotidiano" o "7 volte/settimana"
   ✅ CORRETTO:
   "recurrence": {
     "frequency": "DAILY",  // ← Usa DAILY per eventi giornalieri
     "until": "2025-12-31T23:59:59.000Z"
   }
   
   REGOLA CHIAVE: lunghezza array byDay = numero esatto richiesto dall'utente!

6. VINCOLI ASSOLUTI
   ⛔ VIETATO sovrapporre task con eventi esistenti
   ⛔ VIETATO usare orari fuori 09:00-18:00 (senza motivo)
   ⛔ VIETATO superare ${Math.round(availableHours * 60)} minuti totali
   ⛔ VIETATO ignorare la frequenza numerica esatta dell'utente
      Esempi VIETATI:
      - Utente dice "1/settimana" → TU crei 2 o 3 giorni ❌
      - Utente dice "2/settimana" → TU crei 4 giorni ❌
      - Utente dice "3/settimana" → TU crei 5 o 7 giorni ❌
   ⛔ OBBLIGATORIO fornire suggestedStart e suggestedEnd per OGNI task
   ⛔ OBBLIGATORIO verificare sovrapposizioni prima di generare il JSON

7. CONFLITTI E RACCOMANDAZIONI
   - conflicts: array di stringhe (segnala problemi: deadline troppo vicina, calendario pieno, ecc.)
   - recommendations: array di stringhe (suggerimenti strategici per l'utente)

═══════════════════════════════════════════════════════════════════
📤 FORMATO OUTPUT (JSON PURO)
═══════════════════════════════════════════════════════════════════

Rispondi SOLO con JSON valido. NON aggiungere testo, markdown o spiegazioni.

ESEMPIO 1 - "1 allenamento a settimana":
{
  "subtasks": [
    {
      "title": "Allenamento Full Body",
      "description": "Squat 4x8, Panca 4x8, Stacco 3x6, Trazioni 3x10",
      "estimatedDuration": 90,
      "priority": "high",
      "suggestedStart": "2025-11-04T09:00:00.000Z",
      "suggestedEnd": "2025-11-04T10:30:00.000Z",
      "location": "Palestra",
      "recurrence": {
        "frequency": "WEEKLY",
        "byDay": ["WE"],
        "until": "${deadline.toISOString()}"
      }
    }
  ],
  "conflicts": [],
  "recommendations": [
    "Allenamento programmato 1 volta a settimana (Mercoledì) come richiesto",
    "Un solo giorno di allenamento permette recupero ottimale"
  ]
}

ESEMPIO 2 - "4 allenamenti a settimana":
{
  "subtasks": [
    {
      "title": "Allenamento Upper Body",
      "description": "Panca piana 4x8, Shoulder press 3x10, Tricipiti 3x12, Alzate laterali 3x15",
      "estimatedDuration": 90,
      "priority": "high",
      "suggestedStart": "2025-11-04T09:00:00.000Z",
      "suggestedEnd": "2025-11-04T10:30:00.000Z",
      "location": "Palestra",
      "recurrence": {
        "frequency": "WEEKLY",
        "byDay": ["MO", "WE", "FR", "SA"],
        "until": "${deadline.toISOString()}"
      }
    }
  ],
  "conflicts": [],
  "recommendations": [
    "Allenamento programmato 4 volte a settimana come richiesto (Lun/Mer/Ven/Sab)",
    "Giorni di riposo: Mar, Gio, Dom per recupero muscolare ottimale"
  ]
}

⚠️⚠️⚠️ REGOLE FINALI - CONTROLLA PRIMA DI INVIARE:
1. Conta i giorni in byDay → DEVONO essere ESATTAMENTE quelli richiesti dall'utente
2. "1/settimana" → byDay con 1 elemento (es: ["WE"])
3. "2/settimana" → byDay con 2 elementi (es: ["MO", "TH"])
4. "3/settimana" → byDay con 3 elementi (es: ["MO", "WE", "FR"])
5. "4/settimana" → byDay con 4 elementi (es: ["MO", "WE", "FR", "SA"])
6. NON aggiungere giorni extra "per sicurezza" o "per ottimizzare"

NOTE FINALI:
- Se l'utente dice "1/settimana" → byDay ha ESATTAMENTE 1 giorno
- Se l'utente dice "2/settimana" → byDay ha ESATTAMENTE 2 giorni
- NON aggiungere giorni extra solo perché il calendario è libero
- La frequenza è un vincolo RIGIDO, non un suggerimento

═══════════════════════════════════════════════════════════════════
⚠️ VERIFICA FINALE PRE-INVIO
═══════════════════════════════════════════════════════════════════

Prima di inviare il JSON, PER OGNI subtask:

1. Converti suggestedStart in timestamp numerico
2. Converti suggestedEnd in timestamp numerico
3. Per ogni evento esistente:
   - Converti start/end in timestamp
   - Applica formula: (taskStart < eventEnd + 900000) AND (taskEnd > eventStart - 900000)
   - Se TRUE → HAI SBAGLIATO → Cambia orario task
4. Solo se TUTTI i task non si sovrappongono → Invia JSON
5. Se un solo task si sovrappone → Risposta INVALIDA

La tua risposta sarà automaticamente scartata se ci sono sovrapposizioni.
`;
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
          temperature: 0.7,
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

    const subtasks = taskPlan.subtasks as any as Subtask[];
    const createdEvents = [];
    const calendarEventsMap: Record<number, string> = {}; // Map subtask index to event ID

    // Create calendar events for each subtask
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      
      if (!subtask || !subtask.suggestedStart || !subtask.suggestedEnd) {
        console.warn(`Skipping subtask at index ${i} - no suggested time or undefined`);
        continue;
      }

      try {
        // Build recurrence rules if specified
        let recurrenceRules: string[] | undefined;
        if (subtask.recurrence) {
          const rrule = this.buildRRule(subtask.recurrence);
          if (rrule) {
            recurrenceRules = [rrule];
            console.log(`🔁 Creating recurring event: ${subtask.title} with rule: ${rrule}`);
          }
        }

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
      } catch (error) {
        console.error(`Failed to create event for subtask "${subtask.title}":`, error);
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

    return {
      success: true,
      createdEvents,
      message: `${createdEvents.length}/${subtasks.length} eventi creati sul calendario`,
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
