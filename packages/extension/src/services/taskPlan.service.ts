import { TaskPlanResponse } from '../types/taskPlan';

const API_BASE_URL = 'http://localhost:3000';

class TaskPlanService {
  private async getAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['authState'], (result) => {
        if (result.authState?.token) {
          resolve(result.authState.token);
        } else {
          reject(new Error('No authentication token found'));
        }
      });
    });
  }

  async generatePlan(goalId: string): Promise<TaskPlanResponse> {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/task-plans/generate/${goalId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to generate task plan: ${response.statusText}`);
    }

    return response.json();
  }

  async getPlanForGoal(goalId: string): Promise<TaskPlanResponse | null> {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/task-plans/goal/${goalId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get task plan: ${response.statusText}`);
    }

    return response.json();
  }

  async updatePlanStatus(
    planId: string,
    status: 'draft' | 'approved' | 'committed' | 'rejected'
  ): Promise<void> {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/task-plans/${planId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update plan status: ${response.statusText}`);
    }
  }

  async scheduleToCalendar(planId: string): Promise<{ success: boolean; createdEvents: any[]; message: string }> {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/task-plans/${planId}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to schedule tasks: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteTask(planId: string, taskIndex: number): Promise<{ success: boolean; message: string }> {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/task-plans/${planId}/task/${taskIndex}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete task: ${error}`);
    }

    return response.json();
  }

  async deleteAllEvents(planId: string): Promise<{ success: boolean; message: string; count: number }> {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/task-plans/${planId}/events`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete events: ${error}`);
    }

    return response.json();
  }

  async regeneratePlan(goalId: string): Promise<TaskPlanResponse> {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/task-plans/regenerate/${goalId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to regenerate plan: ${error}`);
    }

    return response.json();
  }
}

export const taskPlanService = new TaskPlanService();
