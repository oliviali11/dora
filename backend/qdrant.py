import arxiv
import hashlib
import uuid as uuid_lib
import os
from qdrant_client import QdrantClient
from dotenv import load_dotenv
from qdrant_client.models import VectorParams, Distance
from sentence_transformers import SentenceTransformer

load_dotenv()

# Initialize Qdrant client
qdrant = QdrantClient(url="http://localhost:6333")

# Initialize Sentence Transformer model 
embedding_model = SentenceTransformer('all-mpnet-base-v2')

def get_embedding(text):
    """Generate embeddings locally using Sentence Transformers"""
    return embedding_model.encode(text).tolist()

def arxiv_id_to_uuid(arxiv_id: str) -> str:
    """
    Convert ArXiv ID to a deterministic UUID.
    Same ArXiv ID always produces the same UUID.
    
    """
    # Create a hash of the ArXiv ID
    hash_bytes = hashlib.md5(arxiv_id.encode()).digest()
    # Convert to UUID 
    return str(uuid_lib.UUID(bytes=hash_bytes))

def fetch_arxiv_papers(query: str, max_results: int = 10):
    """Fetch papers from ArXiv"""
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance
    )

    papers = []
    print(f"Fetching {max_results} papers for query: {query}...")
    for result in search.results():
        papers.append({
            "id": result.get_short_id(),
            "title": result.title,
            "abstract": result.summary,
            "url": result.entry_id,
            "authors": [a.name for a in result.authors]
        })
    return papers

def fetch_arxiv_papers_by_category(category: str, max_results: int = 100):
    """Fetch papers from a specific ArXiv category"""
    search = arxiv.Search(
        query=f"cat:{category}",
        max_results=max_results,
        sort_by=arxiv.SortCriterion.SubmittedDate
    )

    papers = []
    print(f"Fetching {max_results} papers from category: {category}...")
    for result in search.results():
        papers.append({
            "id": result.get_short_id(),
            "title": result.title,
            "abstract": result.summary,
            "url": result.entry_id,
            "authors": [a.name for a in result.authors],
            "category": category
        })
    return papers

def ensure_collection():
    """Ensure the Qdrant collection exists"""
    collections = qdrant.get_collections().collections
    names = [c.name for c in collections]

    if "all_papers" not in names:
        qdrant.create_collection(
            collection_name="all_papers",
            vectors_config=VectorParams(
                size=768,  # all-mpnet-base-v2 produces 768-dimensional vectors
                distance=Distance.COSINE
            )
        )
        print("Created Qdrant collection: all_papers")
    else:
        print("Qdrant collection already exists")

def populate_qdrant(papers):
    """
    Populate Qdrant with papers (automatically handles duplicates).
    
    Converts ArXiv ID to a deterministic UUID, so:
    - Same ArXiv ID → Same UUID → Overwrites duplicate
    - Different ArXiv ID → Different UUID → New paper

    """
    points = []
    print(f"Generating embeddings for {len(papers)} papers...")
    for i, paper in enumerate(papers):
        if (i + 1) % 50 == 0:
            print(f"  Processed {i + 1}/{len(papers)} papers...")
        
        vector = get_embedding(paper["abstract"])
        
        # Convert ArXiv ID to valid UUID
        point_id = arxiv_id_to_uuid(paper["id"])
        
        points.append({
            "id": point_id,  
            "vector": vector,
            "payload": paper  
        })
    
    print("Uploading to Qdrant...")
    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i:i + batch_size]
        qdrant.upsert(collection_name="all_papers", points=batch)
        print(f"  Uploaded batch {i//batch_size + 1}/{(len(points)-1)//batch_size + 1}")
    
    print(f"Successfully processed {len(points)} papers (overwrote any duplicates)")
    return points

