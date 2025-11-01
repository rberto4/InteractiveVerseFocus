const API_BASE_URL = 'http://localhost:3000';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  status?: string;
}

export interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
  description?: string;
}

class CalendarService {
  private async getAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authState'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (!result.authState || !result.authState.token) {
          reject(new Error('No auth token found'));
        } else {
          resolve(result.authState.token);
        }
      });
    });
  }

  /**
   * Fetch calendar events
   */
  async getEvents(options?: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  }): Promise<CalendarEvent[]> {
    const token = await this.getAuthToken();
    
    const params = new URLSearchParams();
    if (options?.timeMin) {
      params.append('timeMin', options.timeMin.toISOString());
    }
    if (options?.timeMax) {
      params.append('timeMax', options.timeMax.toISOString());
    }
    if (options?.maxResults) {
      params.append('maxResults', options.maxResults.toString());
    }

    const url = `${API_BASE_URL}/calendar/events${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch events: ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
  }): Promise<CalendarEvent> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/calendar/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        location: event.location,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create event: ${error}`);
    }

    return response.json();
  }

  /**
   * Get user's calendar list
   */
  async getCalendars(): Promise<Calendar[]> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/calendar/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch calendars: ${error}`);
    }

    return response.json();
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, eventData: {
    summary?: string;
    description?: string;
    start?: Date;
    end?: Date;
    location?: string;
  }): Promise<CalendarEvent> {
    const token = await this.getAuthToken();
    
    const body: any = {};
    if (eventData.summary) body.summary = eventData.summary;
    if (eventData.description !== undefined) body.description = eventData.description;
    if (eventData.start) body.start = eventData.start.toISOString();
    if (eventData.end) body.end = eventData.end.toISOString();
    if (eventData.location !== undefined) body.location = eventData.location;
    
    const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update event: ${error}`);
    }

    return response.json();
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete event: ${error}`);
    }

    return response.json();
  }
}

export const calendarService = new CalendarService();
