import { useState, useEffect } from 'react';
import { calendarService, CalendarEvent } from '../services/calendar.service';

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get events for the next 7 days
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      const fetchedEvents = await calendarService.getEvents({
        timeMin: now,
        timeMax: nextWeek,
        maxResults: 10,
      });

      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('it-IT', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm mb-3">{error}</p>
        <button
          onClick={loadEvents}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          Riprova
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-gray-600 mb-2">Nessun evento nei prossimi 7 giorni</p>
        <p className="text-sm text-gray-500">
          I tuoi eventi del calendario appariranno qui
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Prossimi eventi (7 giorni)
        </h3>
        <button
          onClick={loadEvents}
          className="text-xs text-indigo-600 hover:text-indigo-700"
          title="Aggiorna"
        >
          🔄 Aggiorna
        </button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-indigo-500 mr-3"></div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {event.summary}
                </h4>
                
                {event.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <span className="mr-3">
                    🕐 {formatEventTime(event.start.dateTime)}
                  </span>
                  {event.location && (
                    <span className="truncate">📍 {event.location}</span>
                  )}
                </div>

                {event.status && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                    event.status === 'confirmed' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {event.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
