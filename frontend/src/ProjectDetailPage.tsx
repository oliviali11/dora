import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown'
import { FaTrash, FaAngleLeft, FaBook, FaSearch, FaLightbulb } from 'react-icons/fa'; 
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type RankRequest, type RAGRequest, type PaperResult } from './projects';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'papers' | 'search' | 'rag'>('papers');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState<{ 
    question: string; 
    answer: string; 
    sources: PaperResult[] 
  } | null>(null);
  
  const [summary, setSummary] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getProject(projectId!),
    enabled: !!projectId,
  });

  const { data: papers = [], isLoading: papersLoading } = useQuery({
    queryKey: ['project-papers', projectId],
    queryFn: () => projectsApi.getProjectPapers(projectId!),
    enabled: !!projectId,
  });
  
  const searchMutation = useMutation({
    mutationFn: (request: RankRequest) => projectsApi.searchAndRankPapers(request),
  });

  const ragMutation = useMutation({
    mutationFn: (request: RAGRequest) => projectsApi.askQuestion(request),
    onSuccess: (data) => {
      setRagAnswer(data);
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: () => projectsApi.summarizeSavedPapers(projectId!),
    onSuccess: (data) => {
      setSummary(data.summary);
      setShowSummary(true);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectsApi.deleteProject(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    },
  });

  const addPaperMutation = useMutation({
    mutationFn: (paperId: string) => 
      projectsApi.addPaperToProject(projectId!, { paper_id: paperId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-papers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      alert('Paper added to project!');
    },
  });

  const removePaperMutation = useMutation({
    mutationFn: (paperId: string) => 
      projectsApi.removePaperFromProject(projectId!, paperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-papers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
  
  const handleSearch = () => {
    if (!searchQuery.trim() || !projectId) return;
    
    searchMutation.mutate({
      project_id: projectId,
      query: searchQuery,
      top_k: 10,
      rerank_top_n: 10,
    });
  };

  const handleAskQuestion = () => {
    if (!ragQuestion.trim()) return;
    
    ragMutation.mutate({
      question: ragQuestion,
      project_id: projectId,
      num_papers: 5,
    });
  };

  const handleSummarize = () => {
    summarizeMutation.mutate();
  };

  const handleDeleteProject = () => {
    if (confirm(`Are you sure you want to delete "${project?.name}"? This will remove all saved papers from this project.`)) {
      deleteProjectMutation.mutate();
    }
  };
  
  if (projectLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">Project not found</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-green-600 text-gray rounded-lg hover:bg-green-700"
        >
          Back to Projects
        </button>
      </div>
    );
  }
  
return (
  <div className="min-h-screen bg-gray-50">
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      
      {/* ==================== HEADER ==================== */}
      <div className="bg-white shadow-md rounded-lg mb-6">
        <div className="px-8 py-6">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3"
          >
            <FaAngleLeft />
            Back
          </button>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600 mt-2">{papers.length} saved papers</p>
            </div>
            
            <button
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
              className="text-gray-400 hover:text-red-600 transition-colors"
            >
              <FaTrash />
            </button>
          </div>
        </div>

        {/* ==================== TABS ==================== */}
        <div className="px-8 pb-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('papers')}
                className={`${
                  activeTab === 'papers'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
              >
                <FaBook />
                <span>Saved Papers</span>
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`${
                  activeTab === 'search'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
              >
                <FaSearch />
                <span>Search</span>
              </button>
              <button
                onClick={() => setActiveTab('rag')}
                className={`${
                  activeTab === 'rag'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
              >
                <FaLightbulb />
                <span>Ask AI</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* ==================== CONTENT ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ==================== SIDEBAR ==================== */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Project Details</h2>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Context</h3>
                <p className="text-sm text-gray-600">{project.context}</p>
              </div>

              {project.research_questions.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Research Questions</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {project.research_questions.map((q, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-green-600">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {project.keywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {papers.length > 0 && (
              <div>
                <button
                  onClick={handleSummarize}
                  disabled={summarizeMutation.isPending}
                  className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  {summarizeMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Summarize All Papers
                    </>
                  )}
                </button>

                {/* Summary Modal */}
                {showSummary && summary && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-bold">Summary of All Papers</h3>
                        <button
                          onClick={() => setShowSummary(false)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="prose max-w-none">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="lg:col-span-2">
          
          {/* TAB 1: SAVED PAPERS */}
          {activeTab === 'papers' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Saved Papers ({papers.length})</h2>
              
              {papersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : papers.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 mb-4">No papers saved yet</p>
                  <button 
                    onClick={() => setActiveTab('search')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Search for Papers
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {papers.map((paper) => (
                    <div
                      key={paper.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-green-600 flex-1">
                          <a 
                            href={paper.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline"
                          >
                            {paper.title}
                          </a>
                        </h3>
                        <button
                          onClick={() => removePaperMutation.mutate(paper.id)}
                          disabled={removePaperMutation.isPending}
                          className="ml-4 p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
                          title="Remove from project"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ' et al.'}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {paper.abstract}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH & RANK */}
          {activeTab === 'search' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Search & Rank Papers</h2>
              <p className="text-gray-600 mb-6">
                Search for papers and get AI-powered relevance ranking based on your project context
              </p>

              {/* Search Input */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g., privacy-preserving machine learning"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={searchMutation.isPending}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searchMutation.isPending || !searchQuery.trim()}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {searchMutation.isPending ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-600">Searching and ranking papers...</p>
                </div>
              )}

              {searchMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-600">Error searching papers. Please try again.</p>
                </div>
              )}

              {searchMutation.isSuccess && searchMutation.data && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-600">
                      Found {searchMutation.data.total_results} papers
                    </p>
                  </div>

                  {searchMutation.data.ranked_papers.map((paper) => (
                    <div
                      key={paper.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-semibold text-green-600">
                              <a 
                                href={paper.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline"
                              >
                                {paper.title}
                              </a>
                            </h3>
                            
                            {/* VECTOR SIMILARITY SCORE */}
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              {Math.round(paper.vector_score * 100)}% match
                            </span>
                            
                            {/* PROJECT RELEVANCE SCORE */}
                            {paper.relevance_score !== null && paper.relevance_score !== undefined && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                {Math.round(paper.relevance_score)}% project fit
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {paper.authors.slice(0, 3).join(', ')}
                            {paper.authors.length > 3 && ' et al.'}
                          </p>
                          
                          {paper.relevance_explanation && (
                            <p className="text-sm text-yellow-700 mb-2 italic">
                              💡 {paper.relevance_explanation}
                            </p>
                          )}
                          
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {paper.abstract}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => addPaperMutation.mutate(paper.id)}
                          disabled={addPaperMutation.isPending || paper.is_saved}
                          className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                        >
                          {paper.is_saved ? 'Saved ✓' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!searchMutation.isPending && !searchMutation.data && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>Enter a search query to find relevant papers</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAG (ASK AI) */}
          {activeTab === 'rag' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Ask AI About Papers</h2>
              <p className="text-gray-600 mb-6">
                Ask questions and get AI-generated answers based on research papers in the database
              </p>

              {/* Question Input */}
              <div className="mb-6">
                <textarea
                  value={ragQuestion}
                  onChange={(e) => setRagQuestion(e.target.value)}
                  placeholder="e.g., What are the best techniques for privacy-preserving machine learning in healthcare?"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={ragMutation.isPending}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={ragMutation.isPending || !ragQuestion.trim()}
                  className="mt-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium w-full sm:w-auto transition-colors"
                >
                  {ragMutation.isPending ? 'Thinking...' : 'Ask Question'}
                </button>
              </div>

              {/* Loading */}
              {ragMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-600">Generating answer from research papers...</p>
                </div>
              )}

              {/* Error */}
              {ragMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-600">Error generating answer. Please try again.</p>
                </div>
              )}

              {/* Answer */}
              {ragAnswer && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-3">Question:</h3>
                    <p className="text-green-800">{ragAnswer.question}</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-3">AI Answer:</h3>
                    <div className="prose prose-green max-w-none">
                      <ReactMarkdown>{ragAnswer.answer}</ReactMarkdown>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Source Papers:</h3>
                    <div className="space-y-3">
                      {ragAnswer.sources.map((paper, idx) => (
                        <div
                          key={paper.id}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                        >
                          <div className="flex items-start gap-3">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium flex-shrink-0">
                              Paper {idx + 1}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-medium text-green-600 mb-1">
                                <a 
                                  href={paper.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="hover:underline"
                                >
                                  {paper.title}
                                </a>
                              </h4>
                              <p className="text-sm text-gray-600">
                                {paper.authors.slice(0, 3).join(', ')}
                                {paper.authors.length > 3 && ' et al.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!ragMutation.isPending && !ragAnswer && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Ask a question to get AI-powered insights from research papers</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default ProjectDetailPage;