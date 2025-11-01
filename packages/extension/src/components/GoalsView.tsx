import { useState, useEffect } from 'react';
import { goalService, Goal, CreateGoalData } from '../services/goal.service';
import { taskPlanService } from '../services/taskPlan.service';
import { calendarService } from '../services/calendar.service';
import { TaskPlanResponse, Subtask } from '../types/taskPlan';

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [taskPlans, setTaskPlans] = useState<Record<string, TaskPlanResponse>>({});
  const [schedulingPlan, setSchedulingPlan] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{ planId: string; taskIndex: number } | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Subtask>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingGoalDescription, setEditingGoalDescription] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState<string>('');

  const [formData, setFormData] = useState<CreateGoalData>({
    title: '',
    description: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
    priority: 'medium',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  // Load task plans when goals are loaded
  useEffect(() => {
    if (goals.length > 0) {
      goals.forEach(goal => {
        loadTaskPlan(goal.id);
      });
    }
  }, [goals]);

  const loadGoals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedGoals = await goalService.getAll('active');
      setGoals(fetchedGoals);
    } catch (err) {
      console.error('Failed to load goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Il titolo è obbligatorio');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // If file is selected, use the with-file endpoint
      if (selectedFile) {
        await goalService.createWithFile(formData, selectedFile);
      } else {
        await goalService.create(formData);
      }
      
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: 'medium',
      });
      setSelectedFile(null);
      await loadGoals();
    } catch (err) {
      console.error('Failed to create goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Formato file non supportato. Usa PDF, Word (.docx), o file di testo.');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('Il file è troppo grande. Massimo 10MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleComplete = async (goalId: string) => {
    try {
      await goalService.update(goalId, { status: 'completed' });
      await loadGoals();
    } catch (err) {
      console.error('Failed to complete goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete goal');
    }
  };

  const handleGenerateAI = async (goalId: string) => {
    setGeneratingAI(goalId);
    setError(null);

    try {
      const plan = await taskPlanService.generatePlan(goalId);
      setTaskPlans({ ...taskPlans, [goalId]: plan });
    } catch (err) {
      console.error('Failed to generate AI plan:', err);
      setError(err instanceof Error ? err.message : 'Errore nella generazione AI');
    } finally {
      setGeneratingAI(null);
    }
  };

  const loadTaskPlan = async (goalId: string) => {
    try {
      const plan = await taskPlanService.getPlanForGoal(goalId);
      if (plan) {
        setTaskPlans(prev => ({ ...prev, [goalId]: plan }));
      }
    } catch (err) {
      console.error('Failed to load task plan:', err);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const handleScheduleToCalendar = async (planId: string) => {
    setSchedulingPlan(planId);
    setError(null);

    try {
      const result = await taskPlanService.scheduleToCalendar(planId);
      alert(`✅ ${result.message}\n\nGli eventi sono stati aggiunti al tuo Google Calendar!`);
      
      // Refresh task plans to get updated status
      const goalId = Object.keys(taskPlans).find(gId => taskPlans[gId]?.id === planId);
      if (goalId) {
        const updatedPlan = await taskPlanService.getPlanForGoal(goalId);
        if (updatedPlan) {
          setTaskPlans(prev => ({ ...prev, [goalId]: updatedPlan }));
        }
      }
    } catch (err) {
      console.error('Failed to schedule to calendar:', err);
      setError(err instanceof Error ? err.message : 'Errore nello scheduling sul calendario');
    } finally {
      setSchedulingPlan(null);
    }
  };

  const handleDeleteTask = async (planId: string, taskIndex: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo task e il relativo evento dal calendario?')) {
      return;
    }

    try {
      await taskPlanService.deleteTask(planId, taskIndex);
      alert('✅ Evento eliminato con successo dal calendario!');
      
      // Refresh the task plan
      const goalId = Object.keys(taskPlans).find(gId => taskPlans[gId]?.id === planId);
      if (goalId) {
        await loadTaskPlan(goalId);
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione dell\'evento');
    }
  };

  const handleEditTask = (planId: string, taskIndex: number) => {
    const plan = Object.values(taskPlans).find(p => p.id === planId);
    if (!plan || !plan.subtasks[taskIndex]) return;

    const task = plan.subtasks[taskIndex];
    setEditingTask({ planId, taskIndex });
    setEditFormData({
      title: task.title,
      description: task.description,
      estimatedDuration: task.estimatedDuration,
      priority: task.priority,
      location: task.location,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;

    const plan = Object.values(taskPlans).find(p => p.id === editingTask.planId);
    if (!plan || !plan.calendarEvents || !plan.subtasks[editingTask.taskIndex]) return;

    const eventId = plan.calendarEvents[editingTask.taskIndex];
    if (!eventId) {
      alert('Evento non trovato nel calendario');
      return;
    }

    const task = plan.subtasks[editingTask.taskIndex];
    if (!task) return;

    try {
      // Calculate new end time if duration changed
      let newStart = task.suggestedStart ? new Date(task.suggestedStart) : undefined;
      let newEnd = task.suggestedEnd ? new Date(task.suggestedEnd) : undefined;

      if (editFormData.estimatedDuration && task.suggestedStart) {
        newStart = new Date(task.suggestedStart);
        newEnd = new Date(newStart.getTime() + editFormData.estimatedDuration * 60 * 1000);
      }

      await calendarService.updateEvent(eventId, {
        summary: editFormData.title,
        description: editFormData.description,
        start: newStart,
        end: newEnd,
        location: editFormData.location,
      });

      alert('✅ Evento aggiornato con successo!');
      
      setEditingTask(null);
      setEditFormData({});
      
      // Refresh the task plan
      const goalId = Object.keys(taskPlans).find(gId => taskPlans[gId]?.id === editingTask.planId);
      if (goalId) {
        await loadTaskPlan(goalId);
      }
    } catch (err) {
      console.error('Failed to update event:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento dell\'evento');
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditFormData({});
  };

  const handleDeleteAllEvents = async (goalId: string, planId: string) => {
    if (!confirm('⚠️ Sei sicuro di voler eliminare TUTTI gli eventi dal calendario per questo obiettivo?\n\nQuesta azione NON può essere annullata.')) {
      return;
    }

    try {
      const result = await taskPlanService.deleteAllEvents(planId);
      alert(`✅ ${result.message}\n\n${result.count} eventi eliminati dal calendario.`);
      
      // Refresh the task plan
      await loadTaskPlan(goalId);
    } catch (err) {
      console.error('Failed to delete all events:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione degli eventi');
    }
  };

  const handleRegeneratePlan = async (goalId: string) => {
    if (!confirm('🔄 Vuoi rigenerare il piano con l\'AI?\n\nQuesto eliminerà il piano attuale e tutti gli eventi già creati sul calendario.')) {
      return;
    }

    setGeneratingAI(goalId);
    setError(null);

    try {
      const newPlan = await taskPlanService.regeneratePlan(goalId);
      setTaskPlans({ ...taskPlans, [goalId]: newPlan });
      alert(`✅ Piano rigenerato con successo!\n\n${(newPlan as any).deletedEventsCount || 0} eventi precedenti eliminati.`);
    } catch (err) {
      console.error('Failed to regenerate plan:', err);
      setError(err instanceof Error ? err.message : 'Errore nella rigenerazione del piano');
    } finally {
      setGeneratingAI(null);
    }
  };

  const handleEditDescription = (goalId: string, currentDescription: string) => {
    setEditingGoalDescription(goalId);
    setTempDescription(currentDescription || '');
  };

  const handleSaveDescription = async (goalId: string) => {
    try {
      await goalService.update(goalId, { description: tempDescription });
      await loadGoals();
      setEditingGoalDescription(null);
      setTempDescription('');
    } catch (err) {
      console.error('Failed to update description:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento della descrizione');
    }
  };

  const handleCancelDescriptionEdit = () => {
    setEditingGoalDescription(null);
    setTempDescription('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all mb-4 font-semibold"
        >
          + Nuovo Obiettivo
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
          <h3 className="font-semibold mb-3">Crea Nuovo Obiettivo</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Es: Completare il progetto X"
              required
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
              placeholder="Descrivi il tuo obiettivo..."
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📎 Allega File (Opzionale)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-3 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-sm text-gray-600 hover:text-indigo-600"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl mb-1">📄</div>
                    <div>Clicca per caricare PDF, Word o TXT</div>
                    <div className="text-xs text-gray-400 mt-1">
                      L'AI userà il contenuto per generare task più precisi
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scadenza
            </label>
            <input
              type="date"
              value={formData.deadline.toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, deadline: new Date(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priorità
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="low">Bassa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creazione...' : 'Crea Obiettivo'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-gray-600 mb-2">Nessun obiettivo attivo</p>
          <p className="text-sm text-gray-500">
            Crea il tuo primo obiettivo per iniziare!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const plan = taskPlans[goal.id];
            const isGenerating = generatingAI === goal.id;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(goal.priority)}`}>
                    {goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Media' : 'Bassa'}
                  </span>
                </div>

                {/* Editable Description */}
                {editingGoalDescription === goal.id ? (
                  <div className="mb-2 space-y-2">
                    <textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder="Descrizione obiettivo..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveDescription(goal.id)}
                        className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                      >
                        ✓ Salva
                      </button>
                      <button
                        onClick={handleCancelDescriptionEdit}
                        className="text-xs border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 group">
                    {goal.description ? (
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-gray-600 flex-1">{goal.description}</p>
                        <button
                          onClick={() => handleEditDescription(goal.id, goal.description || '')}
                          className="text-xs text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✏️ Modifica
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditDescription(goal.id, '')}
                        className="text-sm text-gray-400 hover:text-indigo-600 italic"
                      >
                        + Aggiungi descrizione
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>📅 Scadenza: {formatDate(goal.deadline)}</span>
                  <button
                    onClick={() => handleComplete(goal.id)}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    ✓ Completa
                  </button>
                </div>

                {/* AI Task Generation */}
                {!plan && !isGenerating && (
                  <button
                    onClick={() => handleGenerateAI(goal.id)}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:from-purple-600 hover:to-indigo-600 flex items-center justify-center gap-2"
                  >
                    <span>🤖</span> Genera Task con AI
                  </button>
                )}

                {isGenerating && (
                  <div className="flex items-center justify-center py-3 text-sm text-gray-600">
                    <svg className="animate-spin h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analisi AI in corso...
                  </div>
                )}

                {/* AI Generated Tasks */}
                {plan && (
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <span>🤖</span> Task Generati dall'AI
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          plan.status === 'approved' ? 'bg-green-100 text-green-700' :
                          plan.status === 'draft' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {plan.status === 'approved' ? 'Approvato' : plan.status === 'draft' ? 'Bozza' : plan.status}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => handleRegeneratePlan(goal.id)}
                        disabled={isGenerating}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-1.5 rounded text-xs font-medium hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <span>🔄</span> Rigenera
                      </button>
                      
                      {plan.status === 'committed' && (
                        <button
                          onClick={() => handleDeleteAllEvents(goal.id, plan.id)}
                          className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white px-2 py-1.5 rounded text-xs font-medium hover:from-red-600 hover:to-rose-600 flex items-center justify-center gap-1"
                        >
                          <span>🗑️</span> Elimina Eventi
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      {plan.subtasks.map((task, idx) => {
                        const isEditing = editingTask?.planId === plan.id && editingTask?.taskIndex === idx;
                        const hasCalendarEvent = plan.status === 'committed' && plan.calendarEvents?.[idx];

                        return (
                          <div key={idx} className="bg-gray-50 rounded p-2 text-sm">
                            {isEditing ? (
                              // Edit mode
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editFormData.title || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Titolo"
                                />
                                <textarea
                                  value={editFormData.description || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  placeholder="Descrizione"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={editFormData.estimatedDuration || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, estimatedDuration: parseInt(e.target.value) })}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                                    placeholder="Durata (min)"
                                  />
                                  <select
                                    value={editFormData.priority || 'medium'}
                                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                                  >
                                    <option value="low">Bassa</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={editFormData.location || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                    placeholder="Luogo"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                  >
                                    Annulla
                                  </button>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                  >
                                    Salva
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <>
                                <div className="flex items-start justify-between">
                                  <span className="font-medium text-gray-800">{idx + 1}. {task.title}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <span>⏱️</span>
                                      {formatDuration(task.estimatedDuration)}
                                    </span>
                                    {hasCalendarEvent && (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => handleEditTask(plan.id, idx)}
                                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                          title="Modifica evento"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTask(plan.id, idx)}
                                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                                          title="Elimina evento"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                                )}
                                {task.location && (
                                  <p className="text-xs text-gray-500 mt-1">📍 {task.location}</p>
                                )}
                                {task.suggestedStart && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    🕐 {new Date(task.suggestedStart).toLocaleString('it-IT', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {plan.conflicts && plan.conflicts.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2 text-xs">
                        <div className="font-medium text-yellow-800 mb-1">⚠️ Conflitti rilevati:</div>
                        <ul className="list-disc list-inside text-yellow-700">
                          {plan.conflicts.map((conflict, idx) => (
                            <li key={idx}>{conflict}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plan.recommendations && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-xs">
                        <div className="font-medium text-blue-800 mb-1">💡 Raccomandazioni:</div>
                        <p className="text-blue-700">{plan.recommendations}</p>
                      </div>
                    )}

                    {/* Schedule to Calendar Button */}
                    {plan.status === 'draft' && (
                      <button
                        onClick={() => handleScheduleToCalendar(plan.id)}
                        disabled={schedulingPlan === plan.id}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {schedulingPlan === plan.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Creazione eventi...
                          </>
                        ) : (
                          <>
                            <span>📅</span> Pianifica sul Calendario
                          </>
                        )}
                      </button>
                    )}

                    {plan.status === 'committed' && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-center">
                        <span className="text-green-700 font-medium">✅ Eventi già creati sul calendario!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
