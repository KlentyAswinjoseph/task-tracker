import axios, { AxiosResponse } from "axios";
import {
  DashboardResponse,
  TaskDashboardResponse,
  User,
  Task,
  TaskAnalytics,
  ApiResponse,
  SyncRequest,
  Squad,
  SquadCreateRequest,
  SquadUpdateRequest,
  SquadMemberRequest,
  SquadMemberRoleRequest,
} from "../types/types";

// New Backend API (port 8080) - Complete Migration
const API_BASE_URL = "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(
      `🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`
    );
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("API Response Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface FilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  assignee?: string;
}

export class ApiService {
  // Dashboard API (New Backend)
  static async getDashboardSummary(
    filters: FilterParams = {}
  ): Promise<DashboardResponse> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.status) params.append("status", filters.status);

    const response: AxiosResponse<DashboardResponse> = await api.get(
      `/dashboard/summary?${params.toString()}`
    );
    console.log("Dashboard API Response:", response.data);
    return response.data;
  }

  // Git Sync API (New Backend)
  static async syncRepository(
    syncRequest: SyncRequest,
    onProgress: (data: any) => void,
    onComplete: (data: any) => void
  ): Promise<void> {
    const response = await fetch("api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(syncRequest),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Sync failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.type === "progress") {
              onProgress(data);
            } else if (data.type === "complete") {
              onComplete(data);
              return;
            }
          } catch (e) {
            console.warn("Failed to parse sync data:", line);
          }
        }
      }
    }
  }

  // Sync Status API
  static async getSyncStatus(): Promise<any> {
    const response = await api.get("/sync/status");
    return response.data;
  }

  // Users API
  static async getUsers(filters: FilterParams = {}): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const response: AxiosResponse<User[]> = await api.get(
      `/users?${params.toString()}`
    );
    return response.data;
  }

  // Task Dashboard API
  static async getTaskDashboard(
    filters: FilterParams = {}
  ): Promise<TaskDashboardResponse> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.status) params.append("status", filters.status);

    const response: AxiosResponse<TaskDashboardResponse> = await api.get(
      `/tasks/dashboard?${params.toString()}`
    );
    return response.data;
  }

  // Tasks API
  static async getTasks(
    filters: FilterParams = {}
  ): Promise<{ tasks: Task[] }> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.status) params.append("status", filters.status);
    if (filters.assignee) params.append("assignee", filters.assignee);

    const response: AxiosResponse<{ tasks: Task[] }> = await api.get(
      `/tasks?${params.toString()}`
    );
    return response.data;
  }

  // Task Details API
  static async getTask(taskId: string): Promise<any> {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  }

  // Task Analytics API
  static async getTaskAnalytics(taskId: string): Promise<TaskAnalytics> {
    const response: AxiosResponse<TaskAnalytics> = await api.get(
      `/tasks/${taskId}/analytics`
    );
    return response.data;
  }

  // Health Check API
  static async healthCheck(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    const response = await api.get("/health");
    return response.data;
  }

  // Squad Management APIs
  static async getSquads(): Promise<Squad[]> {
    const response: AxiosResponse<Squad[]> = await api.get("/squads");
    return response.data;
  }

  static async getSquad(squadId: string): Promise<Squad> {
    const response: AxiosResponse<Squad> = await api.get(`/squads/${squadId}`);
    return response.data;
  }

  static async createSquad(squadData: SquadCreateRequest): Promise<Squad> {
    const response: AxiosResponse<Squad> = await api.post("/squads", squadData);
    return response.data;
  }

  static async updateSquad(squadId: string, squadData: SquadUpdateRequest): Promise<Squad> {
    const response: AxiosResponse<Squad> = await api.put(`/squads/${squadId}`, squadData);
    return response.data;
  }

  static async deleteSquad(squadId: string): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/squads/${squadId}`);
    return response.data;
  }

  static async addMembersToSquad(squadId: string, memberData: SquadMemberRequest): Promise<Squad> {
    const response: AxiosResponse<Squad> = await api.post(`/squads/${squadId}/members`, memberData);
    return response.data;
  }

  static async removeMemberFromSquad(squadId: string, userId: string): Promise<Squad> {
    const response: AxiosResponse<Squad> = await api.delete(`/squads/${squadId}/members/${userId}`);
    return response.data;
  }

  static async updateMemberRole(squadId: string, userId: string, roleData: SquadMemberRoleRequest): Promise<Squad> {
    const response: AxiosResponse<Squad> = await api.put(`/squads/${squadId}/members/${userId}`, roleData);
    return response.data;
  }

  static async getAvailableUsers(squadId: string): Promise<User[]> {
    const response: AxiosResponse<User[]> = await api.get(`/squads/${squadId}/available-users`);
    return response.data;
  }

  static async getAllUsers(): Promise<User[]> {
    const response: AxiosResponse<User[]> = await api.get("/squads/users/all");
    return response.data;
  }

  // User Sync API
  static async syncUsers(
    organization: string,
    onProgress: (data: any) => void,
    onComplete: (data: any) => void
  ): Promise<void> {
    const response = await fetch("api/sync/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`User sync failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.type === "progress") {
              onProgress(data);
            } else if (data.type === "complete") {
              onComplete(data);
              return;
            }
          } catch (e) {
            console.warn("Failed to parse user sync data:", line);
          }
        }
      }
    }
  }
}
