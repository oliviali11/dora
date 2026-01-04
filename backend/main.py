import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from models import (
    SearchRequest, RankRequest, RankResponse, PaperResult, SearchResponse,
    ProjectCreate, Project, AddPaperToProject,
    RAGRequest, RAGResponse, SummarizeResponse
)
from database import init_db, get_db, ProjectDB, ProjectPaperDB
from populate import populate_by_categories
from dotenv import load_dotenv
from qdrant import (
    ensure_collection, get_embedding, qdrant
)
import google.generativeai as genai
from datetime import datetime
import uuid

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="ArXiv Research Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

qdrant_client = qdrant

@app.on_event("startup")
async def startup_event():
    """Initialize database and Qdrant on startup"""
    init_db()
    ensure_collection()
    populate_by_categories()
    print("Server ready!")


@app.post("/projects", response_model=Project)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new research project"""
    db_project = ProjectDB(
        id=str(uuid.uuid4()),
        name=project.name,
        context=project.context,
        research_questions=project.research_questions,
        keywords=project.keywords,
        created_at=datetime.utcnow()
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return Project(
        id=db_project.id,
        name=db_project.name,
        context=db_project.context,
        research_questions=db_project.research_questions,
        keywords=db_project.keywords,
        created_at=db_project.created_at,
        paper_count=0
    )

@app.get("/projects", response_model=List[Project])
def list_projects(db: Session = Depends(get_db)):
    """Get all projects"""
    projects = db.query(ProjectDB).all()
    result = []
    for p in projects:
        paper_count = db.query(ProjectPaperDB).filter(ProjectPaperDB.project_id == p.id).count()
        result.append(Project(
            id=p.id,
            name=p.name,
            context=p.context,
            research_questions=p.research_questions,
            keywords=p.keywords,
            created_at=p.created_at,
            paper_count=paper_count
        ))
    return result

@app.get("/projects/{project_id}", response_model=Project)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Get a specific project"""
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    paper_count = db.query(ProjectPaperDB).filter(ProjectPaperDB.project_id == project_id).count()
    
    return Project(
        id=project.id,
        name=project.name,
        context=project.context,
        research_questions=project.research_questions,
        keywords=project.keywords,
        created_at=project.created_at,
        paper_count=paper_count
    )

@app.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete a project"""
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete all papers associated with this project
    db.query(ProjectPaperDB).filter(ProjectPaperDB.project_id == project_id).delete()
    
    # Delete the project
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

@app.get("/projects/{project_id}/papers", response_model=List[PaperResult])
def get_project_papers(project_id: str, db: Session = Depends(get_db)):
    """Get all papers saved to a project"""
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    papers = db.query(ProjectPaperDB).filter(ProjectPaperDB.project_id == project_id).all()
    
    result = []
    for p in papers:
        paper_data = p.paper_data
        result.append(PaperResult(
            id=paper_data["id"],
            title=paper_data["title"],
            abstract=paper_data["abstract"],
            url=paper_data["url"],
            authors=paper_data["authors"],
            vector_score=0.0,
            is_saved=True
        ))
    
    return result


@app.post("/papers/search", response_model=SearchResponse)
def search_papers(req: SearchRequest, db: Session = Depends(get_db)):
    """Vector search to find relevant papers from global collection"""
    try:
        query_vector = get_embedding(req.query)

        results = qdrant_client.query_points(
            collection_name="all_papers",
            query=query_vector,
            limit=req.top_k
        )

        # Get saved paper IDs for this project if provided
        saved_paper_ids = set()
        if req.project_id:
            saved_papers = db.query(ProjectPaperDB).filter(
                ProjectPaperDB.project_id == req.project_id
            ).all()
            saved_paper_ids = {p.paper_id for p in saved_papers}

        papers = []
        for point in results.points:
            paper_id = point.payload.get("id")
            papers.append(PaperResult(
                id=paper_id,
                title=point.payload.get("title"),
                abstract=point.payload.get("abstract"),
                url=point.payload.get("url"),
                authors=point.payload.get("authors", []),
                vector_score=point.score,
                is_saved=(paper_id in saved_paper_ids)
            ))

        return SearchResponse(all_papers=papers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/papers/search_and_rank", response_model=RankResponse)
def search_and_rank_papers(req: RankRequest, db: Session = Depends(get_db)):
    """Search and rank papers based on project context"""
    try:
        # Get project context
        project = db.query(ProjectDB).filter(ProjectDB.id == req.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get saved paper IDs
        saved_papers = db.query(ProjectPaperDB).filter(
            ProjectPaperDB.project_id == req.project_id
        ).all()
        saved_paper_ids = {p.paper_id for p in saved_papers}
        
        # Step 1: Vector search
        query_vector = get_embedding(req.query)
        
        results = qdrant_client.query_points(
            collection_name="all_papers",
            query=query_vector,
            limit=req.top_k
        )
        
        # Step 2: Convert to Pydantic models
        papers = []
        for point in results.points:
            paper_id = point.payload.get("id")
            paper = PaperResult(
                id=paper_id,
                title=point.payload.get("title"),
                abstract=point.payload.get("abstract"),
                url=point.payload.get("url"),
                authors=point.payload.get("authors", []),
                vector_score=point.score,
                is_saved=(paper_id in saved_paper_ids)
            )
            papers.append(paper)
        
        # Step 3: Re-rank with Gemini using project context
        papers_to_rerank = papers[:req.rerank_top_n]
        ranked_papers = []
        
        # Build context from project
        full_context = f"""
Project: {project.name}
Context: {project.context}
Research Questions: {', '.join(project.research_questions)}
Keywords: {', '.join(project.keywords)}
"""
        
        print(f"Re-ranking top {len(papers_to_rerank)} papers with Gemini...")
        
        for paper in papers_to_rerank:
            prompt = f"""Given this research project:
{full_context}

Rate how relevant this research paper is to the project on a scale of 0-100, where:
- 0 = Completely irrelevant
- 50 = Somewhat relevant
- 100 = Highly relevant and directly applicable

Paper Title: {paper.title}
Paper Abstract: {paper.abstract}

Respond with ONLY a number between 0-100, followed by a brief one-sentence explanation.
Format to respond with: SCORE|EXPLANATION, where SCORE is the numerical score
Example Response: 85|This paper directly addresses the privacy-preserving techniques needed for your healthcare AI project.
"""
            
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                if "|" in response_text:
                    score_str, explanation = response_text.split("|", 1)
                    paper.relevance_score = float(score_str.strip())
                    paper.relevance_explanation = explanation.strip()
                else:
                    paper.relevance_score = float(response_text.strip().split()[0])
                    paper.relevance_explanation = "No explanation provided"
                
                ranked_papers.append(paper)
                
            except Exception as e:
                print(f"Error ranking paper {paper.id}: {e}")
                paper.relevance_score = paper.vector_score * 100
                paper.relevance_explanation = "Auto-scored based on vector similarity"
                ranked_papers.append(paper)
        
        # Step 4: Add remaining papers
        remaining_papers = papers[req.rerank_top_n:]
        for paper in remaining_papers:
            paper.relevance_score = paper.vector_score * 100
            paper.relevance_explanation = "Not re-ranked (outside top N)"
            ranked_papers.append(paper)
        
        # Step 5: Sort by relevance
        ranked_papers.sort(key=lambda x: x.relevance_score or 0, reverse=True)
        
        return RankResponse(
            query=req.query,
            project_context=full_context,
            ranked_papers=ranked_papers,
            total_results=len(ranked_papers)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/papers")
def add_paper_to_project(project_id: str, req: AddPaperToProject, db: Session = Depends(get_db)):
    """Add a paper to a project"""
    # Verify project exists
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if already added
    existing = db.query(ProjectPaperDB).filter(
        ProjectPaperDB.project_id == project_id,
        ProjectPaperDB.paper_id == req.paper_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Paper already added to project")
    
    # Get paper data from Qdrant
    try:
        results = qdrant_client.scroll(
            collection_name="all_papers",
            scroll_filter={
                "must": [
                    {
                        "key": "id",
                        "match": {"value": req.paper_id}
                    }
                ]
            },
            limit=1
        )
        
        if not results[0]:
            raise HTTPException(status_code=404, detail="Paper not found in database")
        
        paper_point = results[0][0]
        paper_data = paper_point.payload
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching paper: {str(e)}")
    
    # Add to project
    db_paper = ProjectPaperDB(
        id=str(uuid.uuid4()),
        project_id=project_id,
        paper_id=req.paper_id,
        paper_data=paper_data,
        notes=req.notes
    )
    db.add(db_paper)
    db.commit()
    
    return {"message": "Paper added to project successfully", "paper_id": req.paper_id}

@app.delete("/projects/{project_id}/papers/{paper_id}")
def remove_paper_from_project(project_id: str, paper_id: str, db: Session = Depends(get_db)):
    """Remove a paper from a project"""
    paper = db.query(ProjectPaperDB).filter(
        ProjectPaperDB.project_id == project_id,
        ProjectPaperDB.paper_id == paper_id
    ).first()
    
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found in project")
    
    db.delete(paper)
    db.commit()
    
    return {"message": "Paper removed from project"}

@app.post("/papers/ask", response_model=RAGResponse)
async def ask_question_rag(req: RAGRequest, db: Session = Depends(get_db)):
    """
    Ask a question and get an AI-generated answer based on research papers.
    
    This uses Retrieval-Augmented Generation:
    1. Retrieves relevant papers from vector database
    2. Sends them to Gemini as context
    3. Generates a comprehensive answer
    """
    try:
        # Get project context if provided
        project_context = ""
        if req.project_id:
            project = db.query(ProjectDB).filter(ProjectDB.id == req.project_id).first()
            if project:
                project_context = f"""
Project Context:
- Project: {project.name}
- Focus: {project.context}
- Research Questions: {', '.join(project.research_questions)}
- Keywords: {', '.join(project.keywords)}
"""
        
        # Find relevant papers using vector search
        print(f"Searching for papers relevant to: {req.question}")
        query_vector = get_embedding(req.question)
        
        results = qdrant_client.query_points(
            collection_name="all_papers",
            query=query_vector,
            limit=req.num_papers
        )
        
        if not results.points:
            raise HTTPException(status_code=404, detail="No relevant papers found")
        
        # Extract paper content and build context
        paper_contexts = []
        sources = []
        
        for i, point in enumerate(results.points):
            paper = point.payload
            sources.append(PaperResult(
                id=paper["id"],
                title=paper["title"],
                abstract=paper["abstract"],
                url=paper["url"],
                authors=paper["authors"],
                vector_score=point.score
            ))
            
            # Build context from papers
            paper_contexts.append(f"""
                Paper {i+1}:
                Title: {paper['title']}
                Authors: {', '.join(paper['authors'][:3])}{"..." if len(paper['authors']) > 3 else ""}
                ArXiv ID: {paper['id']}
                Abstract: {paper['abstract']}
            """)
        
        # Step 3: Augmented Generation - Send papers to LLM as context
        context = "\n" + "="*80 + "\n".join(paper_contexts)
        
        prompt = f"""You are an expert research assistant helping with academic research. Answer the following question based on the provided research papers.

{project_context}

Question: {req.question}

Research Papers Available:
{context}

Instructions:
- Provide a comprehensive, well-structured answer based on the papers above
- Cite specific papers when making claims (e.g., "According to Smith et al. (Paper 1)...")
- Synthesize information across multiple papers when relevant
- If the papers don't fully answer the question, acknowledge this and answer what you can
- Be specific and technical, but also clear
- Highlight key findings, methodologies, or insights
- If there are conflicting viewpoints in the papers, mention them

Answer:"""
        
        # Generate answer using Gemini
        print("Generating answer with Gemini...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return RAGResponse(
            question=req.question,
            answer=response.text,
            sources=sources,
            project_context=project_context if project_context else None
        )
        
    except Exception as e:
        print(f"Error in RAG endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projects/{project_id}/summarize_saved", response_model=SummarizeResponse)
async def summarize_project_papers(project_id: str, focus: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Summarize all papers saved to a specific project.
    Useful for getting an overview of your research collection.
    """
    try:
        # Get project
        project = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get saved papers
        saved_papers = db.query(ProjectPaperDB).filter(
            ProjectPaperDB.project_id == project_id
        ).all()
        
        if not saved_papers:
            raise HTTPException(status_code=404, detail="No papers saved to this project")
        
        # Build paper contexts
        papers = []
        paper_contexts = []
        
        for saved_paper in saved_papers:
            paper = saved_paper.paper_data
            papers.append(PaperResult(
                id=paper["id"],
                title=paper["title"],
                abstract=paper["abstract"],
                url=paper["url"],
                authors=paper["authors"],
                vector_score=0.0,
                is_saved=True
            ))
            
            paper_contexts.append(f"""
Paper: {paper['title']}
Authors: {', '.join(paper['authors'][:3])}{"..." if len(paper['authors']) > 3 else ""}
ArXiv ID: {paper['id']}
Abstract: {paper['abstract']}
Notes: {saved_paper.notes if saved_paper.notes else 'None'}
""")
        
        # Build prompt with project context
        context = "\n" + "="*80 + "\n".join(paper_contexts)
        
        focus_instruction = ""
        if focus:
            focus_instruction = f"\nPay special attention to: {focus}"
        
        prompt = f"""You are a research assistant. Provide a comprehensive summary of papers collected for this research project.

Project: {project.name}
Project Context: {project.context}
Research Questions: {', '.join(project.research_questions)}

Papers in Collection ({len(papers)} papers):
{context}
{focus_instruction}

Instructions:
- Provide an overview of how these papers relate to the project goals
- Highlight main themes and findings across the papers
- Identify which papers address which research questions
- Note methodologies and approaches that could be useful
- Suggest any gaps in the current collection
- Keep it structured and actionable

Summary:"""
        
        # Generate summary
        print(f"Summarizing {len(papers)} papers for project {project.name}...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return SummarizeResponse(
            summary=response.text,
            papers_summarized=papers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in project summarize endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def read_root():
    return {
        "message": "ArXiv Research Assistant API",
        "endpoints": {
            "projects": "/projects",
            "search": "/papers/search",
            "smart_search": "/papers/search_and_rank",
            "ask_question": "/papers/ask",
            "summarize_saved": "/projects/{project_id}/summarize_saved",
            "admin": "/admin/populate_by_categories"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        # Check Qdrant connection
        collections = qdrant_client.get_collections()
        collection_exists = any(c.name == "all_papers" for c in collections.collections)
        
        if collection_exists:
            collection_info = qdrant_client.get_collection("all_papers")
            paper_count = collection_info.points_count
        else:
            paper_count = 0
        
        return {
            "status": "healthy",
            "qdrant_connected": True,
            "papers_in_database": paper_count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }