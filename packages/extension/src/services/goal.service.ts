const API_BASE_URL = 'http://localhost:3000';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'cancelled';
  attachedFileName?: string;
  attachedFileType?: string;
  extractedContent?: string;
  allowRecurrence?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  deadline: Date;
  priority?: 'low' | 'medium' | 'high';
  allowRecurrence?: boolean;
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  deadline?: Date;
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'completed' | 'cancelled';
  allowRecurrence?: boolean;
}

class GoalService {
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

  async create(data: CreateGoalData): Promise<Goal> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        deadline: data.deadline.toISOString(),
        priority: data.priority || 'medium',
        allowRecurrence: data.allowRecurrence ?? true, // Include allowRecurrence field
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create goal: ${error}`);
    }

    return response.json();
  }

  async getAll(status?: string): Promise<Goal[]> {
    const token = await this.getAuthToken();
    
    const url = status 
      ? `${API_BASE_URL}/goals?status=${status}`
      : `${API_BASE_URL}/goals`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch goals: ${error}`);
    }

    return response.json();
  }

  async getOne(id: string): Promise<Goal> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch goal: ${error}`);
    }

    return response.json();
  }

  async update(id: string, data: UpdateGoalData): Promise<void> {
    const token = await this.getAuthToken();
    
    const body: any = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.deadline !== undefined) body.deadline = data.deadline.toISOString();
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.status !== undefined) body.status = data.status;
    
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update goal: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete goal: ${error}`);
    }
  }

  async createWithFile(data: CreateGoalData, file: File): Promise<Goal> {
    const token = await this.getAuthToken();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('deadline', data.deadline.toISOString());
    formData.append('priority', data.priority || 'medium');
    formData.append('allowRecurrence', String(data.allowRecurrence ?? true)); // Include allowRecurrence field

    const response = await fetch(`${API_BASE_URL}/goals/with-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create goal with file: ${error}`);
    }

    return response.json();
  }
}

export const goalService = new GoalService();
