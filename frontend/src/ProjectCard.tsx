import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Project } from './projects';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  isDeleting?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete, isDeleting = false }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {/* Color Bar */}
      <div className="h-2 bg-gradient-to-r from-green-500 to-yellow-500"></div>
      
      <div className="p-6">
        {/* Title and Menu */}
        <div className="flex justify-between items-start mb-3">
          <h3 
            onClick={handleClick}
            className="text-xl font-bold text-gray-900 cursor-pointer hover:text-green-600 flex-1 line-clamp-2"
          >
            {project.name}
          </h3>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
              disabled={isDeleting}
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    handleClick();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
                >
                  Open Project
                </button>
                <button
                  onClick={() => {
                    onDelete(project.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 rounded-b-lg"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Context */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {project.context}
        </p>

        {/* Research Questions */}
        {project.research_questions && project.research_questions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-1">Research Questions:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {project.research_questions.slice(0, 2).map((q, i) => (
                <li key={i} className="line-clamp-1">• {q}</li>
              ))}
              {project.research_questions.length > 2 && (
                <li className="text-gray-500">+ {project.research_questions.length - 2} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Keywords */}
        {project.keywords && project.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.keywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
            {project.keywords.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{project.keywords.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{project.paper_count} papers</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <button
            onClick={handleClick}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;