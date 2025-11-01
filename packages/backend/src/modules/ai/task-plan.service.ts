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
    const existingEvents = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        start: {
          gte: now,
          lte: goal.deadline,
        },
      },
      orderBy: { start: 'asc' },
    });

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

    // Build AI prompt
    const prompt = this.buildPrompt(goal, existingEvents, totalDays);

    // Try generating plan with automatic overlap detection and retry
    let taskPlan: TaskPlanResponse | undefined;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🤖 AI generation attempt ${attempts}/${maxAttempts}`);

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

      if (attempts === maxAttempts) {
        // Add overlaps to conflicts section
        currentPlan.conflicts = [
          ...(currentPlan.conflicts || []),
          ...overlaps.map(o => `SOVRAPPOSIZIONE: ${o}`),
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
    
    // Analisi dettagliata degli eventi esistenti
    const eventsAnalysis = existingEvents.length > 0
      ? existingEvents
          .map((e) => {
            const start = new Date(e.start);
            const end = new Date(e.end);
            const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
            
            return `📅 Evento: "${e.title}"
   ⏰ Orario: ${start.toLocaleString('it-IT', { 
     weekday: 'short', 
     day: 'numeric', 
     month: 'short', 
     hour: '2-digit', 
     minute: '2-digit' 
   })} → ${end.toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit' })} (${duration} min)
   📍 Luogo: ${e.location || 'Non specificato'}
   📝 Descrizione: ${e.description || 'Nessuna descrizione'}
   🔗 Contesto: ${e.attendees?.length > 0 ? `${e.attendees.length} partecipanti` : 'Evento personale'}`;
          })
          .join('\n\n')
      : '📭 Nessun evento esistente nel calendario fino alla scadenza';

    // Preparazione informazioni contestuali dal file allegato
    const fileContext = goal.extractedContent 
      ? `\n\n📎 INFORMAZIONI ESTRATTE DAL FILE ALLEGATO "${goal.attachedFileName}":\n${goal.extractedContent}\n\n⚠️ IMPORTANTE: Usa queste informazioni per:\n- Identificare dettagli specifici (date, argomenti, requisiti)\n- Contestualizzare meglio l'obiettivo\n- Creare task più precisi e pertinenti\n- Adattare la pianificazione in base al contenuto del documento`
      : '';

    return `Sei un assistente AI esperto in pianificazione strategica e gestione del tempo. 

📋 OBIETTIVO DA RAGGIUNGERE:
Titolo: "${goal.title}"
Descrizione: ${goal.description || 'Nessuna descrizione fornita'}${fileContext}
Scadenza: ${deadline.toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
Priorità: ${goal.priority}

⏰ ANALISI TEMPORALE:
- Data/Ora attuale: ${now.toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
- Giorni disponibili: ${totalDays} giorni
- Ore lavorative totali: ${totalWorkHours} ore (${workHoursPerDay}h/giorno)
- Ore occupate da eventi: ${Math.round(occupiedHours)} ore
- ⭐ Ore EFFETTIVAMENTE disponibili: ${Math.round(availableHours)} ore (${Math.round(availableHours * 60)} minuti)

📅 EVENTI GIÀ SCHEDULATI NEL CALENDARIO:
${eventsAnalysis}

🎯 COMPITO - ANALISI INTELLIGENTE:

0. **⚠️⚠️⚠️ REGOLA AUREA - RAGGRUPPAMENTO INTELLIGENTE:**
   - **OBIETTIVO PRIMARIO**: Identificare PATTERN e RIPETIZIONI
   - Se un'attività si ripete (es: allenamento 3x settimana) → RIPETI lo stesso evento
   - **Durata ideale per evento: 90-180 minuti** (sessioni concentrate e produttive)
   - Raggruppa elementi correlati in SESSIONI COMPLETE
   - ✅ CORRETTO: "Allenamento Upper Body" ripetuto 12 volte (3x/sett per 4 settimane)
   - ❌ SBAGLIATO: 36 eventi separati (1 per ogni esercizio ogni volta)

**ANALIZZA IL CONTENUTO DEL FILE ALLEGATO (SE PRESENTE):**${goal.extractedContent ? `
   - ⚠️ CRITICO: Hai ricevuto informazioni estratte da un file (PDF/Word/Testo)
   - Questo contenuto contiene dettagli FONDAMENTALI per pianificare correttamente
   
   **LOGICA DI RAGGRUPPAMENTO ULTRA-AGGRESSIVA:**
   
   📋 **SCHEDA ALLENAMENTO** → Identifica PATTERN di ripetizione:
   - ❌ SBAGLIATO: 1 evento per ogni esercizio (Panca, Squat, Stacchi...)
   - ❌ SBAGLIATO: Eventi con nomi diversi ogni volta
   - ✅ CORRETTO: "Allenamento Push/Pull/Legs" ripetuti nel tempo (es: Push Lun/Gio, Pull Mar/Ven, Legs Mer/Sab)
   - ✅ CORRETTO: Se scheda prevede 3 allenamenti/settimana per 4 settimane → 12 eventi TOTALI (stesso nome, orari diversi)
   
   📚 **CORSO/STUDIO** → Sessioni di studio ripetute:
   - ❌ SBAGLIATO: 1 evento per ogni capitolo/pagina
   - ✅ CORRETTO: "Sessione Studio Matematica" ripetuta 3x settimana (2 ore ogni volta)
   - ✅ CORRETTO: "Ripasso serale" ripetuto ogni giorno (1 ora)
   
   📋 **PROGETTO/TASK** → Fasi che possono richiedere più sessioni:
   - ❌ SBAGLIATO: 1 evento per ogni micro-attività
   - ✅ CORRETTO: "Sviluppo Feature X" ripetuto su 3 giorni (sessioni da 3 ore)
   - ✅ CORRETTO: "Review e Testing" ripetuto ogni 2 giorni
   
   **PRINCIPIO BASE:**
   - Se un'attività si ripete IDENTICA → USA LO STESSO TITOLO, ripetilo nel calendario
   - Esempi: "Allenamento Upper Body" il Lun 9:00, Mer 9:00, Ven 9:00
   - Se 5 attività diverse si fanno insieme → 1 EVENTO con descrizione dettagliata
   - DESCRIZIONE dettagliata per spiegare cosa include ogni sessione
   
   **DURATA SESSIONI:**
   - Sessione corta: 60-90 min (ripasso, revisione)
   - Sessione standard: 90-120 min (studio, allenamento)
   - Sessione lunga: 120-180 min (progetto complesso)
   - ⚠️ EVITA eventi sotto i 60 minuti - raggruppali!` : `
   - Nessun file allegato, usa solo descrizione e titolo dell'obiettivo
   - **COMUNQUE**: Crea MASSIMO 3-5 eventi totali, raggruppa tutto il possibile`}

1. **ANALIZZA GLI EVENTI ESISTENTI:**
   - ⚠️ CRITICO: Identifica TUTTI gli slot temporali OCCUPATI dagli eventi esistenti
   - Per ogni evento, considera l'orario ESATTO di inizio e fine
   - Marca come NON DISPONIBILI tutti gli orari durante eventi esistenti
   - Considera location, descrizioni e contesto per capire se sono rilevanti all'obiettivo
   - Rileva pattern temporali (es: meeting ricorrenti, blocchi di tempo occupati)

2. **CREA EVENTO FINALE SE NECESSARIO:**
   - ⚠️ IMPORTANTE: Se l'obiettivo rappresenta un EVENTO SPECIFICO (es: "Esame", "Presentazione", "Consegna progetto", "Meeting importante"):
     * CREA un task speciale alla data di scadenza esatta
     * Titolo: usa il titolo dell'obiettivo (es: "Esame Analisi 1")
     * Durata stimata dell'evento (es: 180 min per un esame, 60 min per una presentazione)
     * Priorità: SEMPRE "high"
     * Location: se pertinente (es: "Università", "Ufficio", "Online")
   - Se invece è un obiettivo continuativo (es: "Imparare Python", "Migliorare fitness"), NON creare evento finale

3. **GENERA TASK PREPARATORI:**
   - ⚠️⚠️⚠️ **IDENTIFICA PATTERN DI RIPETIZIONE** (es: allenamento 3x/settimana)
   - **USA EVENTI RICORRENTI** invece di creare eventi multipli separati
   - Scomponi l'obiettivo in **MACRO-BLOCCHI** non micro-task
   - Ogni evento deve essere una **SESSIONE DI LAVORO COMPLETA**
   - Per OGNI subtask specifica:
     * Titolo breve ma descrittivo (max 60 caratteri)
     * Descrizione DETTAGLIATA (max 200 caratteri) - elenca TUTTO quello che include
     * Durata realistica in minuti: 60-180 min (sessioni produttive)
     * Priorità (high/medium/low)
     * **suggestedStart**: data/ora specifica in formato ISO 8601 (prima occorrenza)
     * **suggestedEnd**: data/ora fine calcolata (start + duration)
     * **location**: luogo se necessario (max 20 caratteri) o "Online"
     * **recurrence** (OPZIONALE): oggetto per eventi ricorrenti
   
   **QUANDO USARE RICORRENZA (recurrence):**
   - ✅ Allenamento 3x/settimana → 1 evento ricorrente (NON 12 eventi separati)
   - ✅ Studio quotidiano → 1 evento ricorrente giornaliero
   - ✅ Meeting settimanale → 1 evento ricorrente settimanale
   - ❌ Eventi unici o irregolari → NON usare ricorrenza
   
   **STRUTTURA recurrence - IMPORTANTE:**
   - frequency: "DAILY" oppure "WEEKLY" oppure "MONTHLY"
   - interval: numero (opzionale, default 1) - ogni quanti giorni/settimane/mesi
   - until: stringa ISO date - data di scadenza obiettivo
   - byDay: array di stringhe (solo WEEKLY) - es: ["MO", "WE", "FR"] per Lun/Mer/Ven
   
   **ESEMPI:**
   Allenamento Lun/Mer/Ven fino a deadline:
   "recurrence": { "frequency": "WEEKLY", "byDay": ["MO", "WE", "FR"], "until": "data-deadline" }
   
   Studio giornaliero fino a deadline:
   "recurrence": { "frequency": "DAILY", "until": "data-deadline" }

4. **SCHEDULING INTELLIGENTE - ALGORITMO ANTI-SOVRAPPOSIZIONE:**
   ⚠️⚠️⚠️ VINCOLO ASSOLUTO: I task DEVONO essere schedulati in slot COMPLETAMENTE LIBERI
   
   **PRINCIPIO GUIDA: RICONOSCI E RIPETI PATTERN**
   - Se un'attività si ripete (es: allenamento 3x settimana) → schedulala con PATTERN regolare
   - Esempio: Lun 9:00, Mer 9:00, Ven 9:00 (stesso orario, giorni alternati)
   - Mantieni COERENZA negli orari per attività ripetute
   - Distribuisci eventi simili uniformemente nel tempo disponibile
   
   **ALGORITMO OBBLIGATORIO PER OGNI TASK:**
   
   STEP 1 - Crea lista completa slot occupati:
   Per ogni evento esistente nel calendario, segna l'intervallo [start - 15min, end + 15min] come OCCUPATO
   Esempio: Se evento è 10:00-11:00, marca 09:45-11:15 come occupato
   
   STEP 2 - Per ogni giorno tra oggi e deadline:
   - Inizio giornata lavorativa: 09:00
   - Fine giornata lavorativa: 18:00
   - Rimuovi tutti gli slot occupati da questo range
   - Il risultato sono gli slot LIBERI di quel giorno
   - **PREFERENZA**: Slot mattina (9:00-12:00) per sessioni lunghe e concentrate
   
   STEP 3 - Scheduling task con pattern:
   - Identifica se il task si ripete (es: allenamento ricorrente)
   - Se SI ripete: trova slot RICORRENTE (stesso giorno settimana, stesso orario)
   - Se NO: trova slot ottimale per singola sessione
   - Assegna suggestedStart = inizio dello slot libero
   - Assegna suggestedEnd = suggestedStart + durata task (in minuti)
   - ⚠️ VERIFICA FINALE: l'intervallo [suggestedStart, suggestedEnd] NON deve intersecare NESSUN evento esistente
   - Se c'è intersezione → ERRORE, cerca slot alternativo mantenendo il pattern
   
   STEP 4 - Verifica intersezione (CRITICO):
   Un task con [taskStart, taskEnd] si sovrappone con evento [eventStart, eventEnd] SE:
   - taskStart < eventEnd AND taskEnd > eventStart
   Se questa condizione è VERA → SOVRAPPOSIZIONE → CAMBIA ORARIO
   
   **ESEMPIO PRATICO:**
   Evento esistente: Martedì 09:00-12:00
   Slot occupato con buffer: Martedì 08:45-12:15
   
   Task da schedulare: 90 minuti
   ❌ SBAGLIATO: Martedì 11:00-12:30 (si sovrappone!)
   ✅ CORRETTO: Martedì 12:30-14:00 (dopo il buffer)
   ✅ CORRETTO: Martedì 14:00-15:30 (ben distanziato)
   
   **PRIORITÀ ORARIE:**
   - Studio intenso / Esercizi → mattina (9:00-12:00)
   - Ripasso / Revisione → pomeriggio (14:00-17:00)
   - Task creativi → mattina o primo pomeriggio
   
   **WEEKEND:**
   - Usa weekend SOLO se necessario
   - Preferisci sempre giorni feriali (Lun-Ven)

5. **IDENTIFICA CONFLITTI:**
   - Segnala nella sezione "conflicts" se:
     * Eventi esistenti riducono drasticamente il tempo disponibile
     * La deadline è troppo vicina per completare tutti i task
     * Ci sono giorni completamente occupati
     * Hai trovato difficoltà a evitare sovrapposizioni

⚠️ VINCOLI CRITICI:
- Somma durate task ≤ ${Math.round(availableHours * 60)} minuti disponibili
- ⚠️⚠️⚠️ OBBLIGATORIO: TUTTI i task DEVONO avere suggestedStart e suggestedEnd in formato ISO 8601
- Le date devono essere tra ${now.toISOString()} e ${deadline.toISOString()}
- ⚠️⚠️⚠️ ASSOLUTO: I task NON devono MAI sovrapporsi con eventi esistenti (controlla orario inizio/fine)
- Rispetta gli orari lavorativi (9:00-18:00 nei giorni feriali)
- Lascia 15 minuti di buffer prima/dopo ogni evento esistente

💡 FORMATO OUTPUT OBBLIGATORIO:
Rispondi SOLO con JSON valido. NON aggiungere testo prima o dopo. NON usare markdown.
IMPORTANTE: 
- Usa virgolette doppie (") per le stringhe
- Evita caratteri speciali o apici nelle descrizioni
- Termina correttamente tutte le stringhe
- Non usare newline (\\n) nelle stringhe
- ⚠️ suggestedStart e suggestedEnd sono OBBLIGATORI per ogni task
- ⚠️ Verifica che suggestedStart NON si sovrapponga con eventi esistenti
- ⚠️⚠️⚠️ USA recurrence per attività ripetute - NON creare eventi multipli separati

Esempio formato corretto (nota: USA recurrence invece di eventi duplicati):
{
  "subtasks": [
    {
      "title": "Allenamento Upper Body",
      "description": "Panca piana 4x8, Shoulder press 3x10, Tricipiti corda 3x12, Alzate laterali 3x15",
      "estimatedDuration": 90,
      "priority": "high",
      "suggestedStart": "${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('.')[0]}.000Z",
      "suggestedEnd": "${new Date(now.getTime() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString().split('.')[0]}.000Z",
      "location": "Palestra",
      "recurrence": {
        "frequency": "WEEKLY",
        "byDay": ["MO", "WE", "FR"],
        "until": "${deadline.toISOString().split('.')[0]}.000Z"
      }
    },
    {
      "title": "Sessione Studio Teoria",
      "description": "Capitoli 3-5, sintesi appunti, esercizi di verifica",
      "estimatedDuration": 120,
      "priority": "high",
      "suggestedStart": "${new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('.')[0]}.000Z",
      "suggestedEnd": "${new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString().split('.')[0]}.000Z",
      "location": "Biblioteca",
      "recurrence": {
        "frequency": "DAILY",
        "until": "${deadline.toISOString().split('.')[0]}.000Z"
      }
    },
    {
      "title": "Ripasso e Simulazione Esame",
      "description": "Ripasso generale di tutti argomenti e simulazione esame completo",
      "estimatedDuration": 180,
      "priority": "high",
      "suggestedStart": "${new Date(deadline.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('.')[0]}.000Z",
      "suggestedEnd": "${new Date(deadline.getTime() - 2 * 24 * 60 * 60 * 1000 + 180 * 60 * 1000).toISOString().split('.')[0]}.000Z",
      "location": "Casa"
    }
  ],
  "conflicts": [],
  "recommendations": ["Allenamento ricorrente Lun/Mer/Ven crea automaticamente tutte le sessioni", "Studio giornaliero fino a deadline garantisce preparazione costante"]
}

🚨 REMINDER FINALE - CONTROLLO OBBLIGATORIO:
Prima di generare la risposta, per OGNI subtask che hai schedulato:
1. Converti suggestedStart e suggestedEnd in timestamp
2. Per OGNI evento esistente nel calendario:
   - Converti event.start e event.end in timestamp
   - Calcola se c'è sovrapposizione: (taskStart < eventEnd) AND (taskEnd > eventStart)
   - Se TRUE → SOVRAPPOSIZIONE RILEVATA → CAMBIA suggestedStart del task
3. Ripeti fino a che TUTTI i task NON hanno sovrapposizioni
4. Solo allora genera il JSON finale

⚠️ Se un task si sovrappone con un evento esistente, la risposta è SBAGLIATA e verrà scartata.
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
      console.log('🤖 Calling OpenRouter API with model: deepseek/deepseek-chat-v3.1:free');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'InteractiveVerseFocus',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat-v3.1:free',
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
