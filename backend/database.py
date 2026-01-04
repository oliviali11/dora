from sqlalchemy import create_engine, Column, String, DateTime, Integer, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

Base = declarative_base()

class ProjectDB(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    context = Column(Text, nullable=False)
    research_questions = Column(JSON, default=[])
    keywords = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)

class ProjectPaperDB(Base):
    __tablename__ = "project_papers"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, nullable=False)
    paper_id = Column(String, nullable=False) 
    paper_data = Column(JSON, nullable=False)  
    notes = Column(Text)
    added_at = Column(DateTime, default=datetime.utcnow)

# Database setup
engine = create_engine("sqlite:///./projects.db")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()