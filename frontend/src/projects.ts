const API_BASE_URL = "http://localhost:8000";

export interface CreateProjectData {
  name: string;
  context: string;
  research_questions: string[];
  keywords: string[];
}

export interface Project {
  id: string;
  name: string;
  context: string;
  research_questions: string[];
  keywords: string[];
  created_at: string;
  paper_count: number;
}

export interface PaperResult {
  id: string;
  title: string;
  abstract: string;
  url: string;
  authors: string[];
  vector_score: number;
  relevance_score?: number;
  relevance_explanation?: string;
  is_saved: boolean;
}

export interface SearchRequest {
  query: string;
  top_k?: number;
  project_id?: string;
}

export interface RankRequest {
  project_id: string;
  query: string;
  top_k: number;
  rerank_top_n: number;
}

export interface RAGRequest {
  question: string;
  project_id?: string;
  num_papers?: number;
}

export interface RAGResponse {
  question: string;
  answer: string;
  sources: PaperResult[];
  project_context?: string;
}

export interface AddPaperToProject {
  paper_id: string;
  notes?: string;
}

export interface SummarizeResponse {
  summary: string;
  papers_summarized: PaperResult[];
}

export const projectsApi = {
  // ==================== PROJECTS ====================
  getProjects: async (): Promise<Project[]> => {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  getProject: async (id: string): Promise<Project> => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`);
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  createProject: async (data: CreateProjectData): Promise<Project> => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },

  deleteProject: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete project');
  },

  // ==================== PAPERS ====================
  getProjectPapers: async (projectId: string): Promise<PaperResult[]> => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/papers`);
    if (!response.ok) throw new Error('Failed to fetch papers');
    return response.json();
  },

  searchPapers: async (request: SearchRequest): Promise<{ all_papers: PaperResult[] }> => {
    const response = await fetch(`${API_BASE_URL}/papers/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to search papers');
    return response.json();
  },

  // THIS IS THE SEARCH AND RANK ENDPOINT
  searchAndRankPapers: async (request: RankRequest): Promise<{
    query: string;
    project_context: string;
    ranked_papers: PaperResult[];
    total_results: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/papers/search_and_rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to rank papers');
    return response.json();
  },

  addPaperToProject: async (projectId: string, data: AddPaperToProject): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/papers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add paper');
  },

  removePaperFromProject: async (projectId: string, paperId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/papers/${paperId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove paper');
  },

  // ==================== RAG ENDPOINT ====================
  askQuestion: async (request: RAGRequest): Promise<RAGResponse> => {
    const response = await fetch(`${API_BASE_URL}/papers/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to get answer');
    return response.json();
  },

  // ==================== SUMMARIZE ENDPOINT ====================
  summarizeSavedPapers: async (projectId: string, focus?: string): Promise<SummarizeResponse> => {
    const url = focus 
      ? `${API_BASE_URL}/projects/${projectId}/summarize_saved?focus=${encodeURIComponent(focus)}`
      : `${API_BASE_URL}/projects/${projectId}/summarize_saved`;
    
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to summarize papers');
    return response.json();
  },
};