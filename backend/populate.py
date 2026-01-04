from qdrant import (
    fetch_arxiv_papers_by_category, 
    populate_qdrant
)

def populate_by_categories(papers_per_category: int = 100):
    """Populate with papers from all ArXiv categories"""
    
    # Major ArXiv categories
    categories = [
        "cs.AI",  
        "cs.LG", 
        "cs.CV",  
        "cs.CL",  
        "cs.NE",  
        "cs.RO",  
        "stat.ML",  
        "math.ST",  
        "physics.comp-ph",  
        "q-bio.QM",  
        "econ.EM",  
        "astro-ph",  
        "cond-mat",  
        "quant-ph", 
        "math.OC",  
        "cs.CR",  
        "cs.DC",  
        "cs.DB",  
    ]
    
    all_papers = []
    seen_ids = set()
    
    for category in categories:
        try:
            papers = fetch_arxiv_papers_by_category(category, max_results=papers_per_category)
            
            unique_papers = [p for p in papers if p['id'] not in seen_ids]
            for p in unique_papers:
                seen_ids.add(p['id'])
            
            all_papers.extend(unique_papers)
            print(f"  Added {len(unique_papers)} unique papers from {category} (total: {len(all_papers)})")
            
        except Exception as e:
            print(f"Error fetching {category}: {e}")
            continue
    

    print(f"\nPopulating Qdrant with {len(all_papers)} papers...")
    populate_qdrant(all_papers)
    
    return {
        "message": f"Successfully populated {len(all_papers)} unique papers",
        "categories_covered": len(categories),
        "total_papers": len(all_papers)
    }