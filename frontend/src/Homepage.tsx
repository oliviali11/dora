import React, { useState } from 'react';
import './index.css'
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FaPlus } from 'react-icons/fa';
import ProjectModal from './ProjectModal';
import { projectsApi, type CreateProjectData } from './projects';

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectData) => projectsApi.createProject(data),
    onSuccess: (newProject) => {
      setIsModalOpen(false);
      navigate(`/projects/${newProject.id}`);
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    },
  });

  const handleSubmitSuccess = (projectData: CreateProjectData) => {
    createProjectMutation.mutate(projectData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl">
        <h1 className="text-6xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-yellow-400">
          dora - discovery optimized research assistant
        </h1>
        <p className="text-2xl text-gray-700 mb-2">
          Your intelligent explorer research assistant
        </p>
        <p className="text-lg text-gray-600 mb-12">
          Discover, organize, and analyze research papers with AI-powered insights
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={createProjectMutation.isPending}
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPlus className="h-6 w-6" />
            <span className="text-lg font-semibold">
              {createProjectMutation.isPending ? 'Creating...' : 'Create New Project'}
            </span>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all border-2 border-green-600"
          >
            <span className="text-lg font-semibold">View All Projects</span>
          </button>
        </div>

        {createProjectMutation.isError && (
          <p className="mt-4 text-red-600">
            Failed to create project. Please try again.
          </p>
        )}
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        onSubmitSuccess={handleSubmitSuccess}
        isSubmitting={createProjectMutation.isPending}
      />
    </div>
  );
};

export default HomePage;
