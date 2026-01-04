from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Settings(BaseSettings):
    frontend_url: str
    gemini_api_key: str
    database_url: str = "sqlite:///./projects.db"

    model_config = SettingsConfigDict(env_file=".env")

# Project Models
class ProjectCreate(BaseModel):
    name: str = Field(..., description="Project name")
    context: str = Field(..., description="Project context/description")
    research_questions: List[str] = Field(default=[], description="Research questions")
    keywords: List[str] = Field(default=[], description="Key topics/keywords")

class Project(BaseModel):
    id: str
    name: str
    context: str
    research_questions: List[str]
    keywords: List[str]
    created_at: datetime
    paper_count: int = 0

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    context: Optional[str] = None
    research_questions: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

# Paper Models
class PaperResult(BaseModel):
    id: str
    title: str
    abstract: str
    url: str
    authors: List[str]
    vector_score: float
    relevance_score: Optional[float] = None
    relevance_explanation: Optional[str] = None
    is_saved: bool = False

class AddPaperToProject(BaseModel):
    paper_id: str
    notes: Optional[str] = None

# Search Models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query for papers")
    top_k: int = Field(default=10, ge=1, le=100, description="Number of papers to retrieve")
    project_id: Optional[str] = None

class RankRequest(BaseModel):
    project_id: str = Field(..., description="Project ID for context")
    query: str = Field(..., description="Search query for papers")
    top_k: int = Field(default=10, ge=1, le=100, description="Number of papers to retrieve")
    rerank_top_n: int = Field(default=5, ge=1, le=20, description="Number of top results to re-rank")

class SearchResponse(BaseModel):
    all_papers: List[PaperResult]

class RankResponse(BaseModel):
    query: str
    project_context: str
    ranked_papers: List[PaperResult]
    total_results: int

# RAG Models
class RAGRequest(BaseModel):
    question: str = Field(..., description="Research question to answer")
    project_id: Optional[str] = Field(None, description="Optional project context")
    num_papers: int = Field(default=5, ge=1, le=10, description="Number of papers to use for answer")

class RAGResponse(BaseModel):
    question: str
    answer: str
    sources: List[PaperResult]
    project_context: Optional[str] = None

# Summarize Models
class SummarizeResponse(BaseModel):
    summary: str
    papers_summarized: List[PaperResult]

class EvaluateRequest(BaseModel):
    project_context: str
    paper: dict