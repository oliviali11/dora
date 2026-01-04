import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { type CreateProjectData } from './projects';

interface ProjectModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (projectData: CreateProjectData) => void;
  isSubmitting?: boolean;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    context: '',
    research_questions: [''],
    keywords: ['']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedData: CreateProjectData = {
      name: formData.name,
      context: formData.context,
      research_questions: formData.research_questions.filter(q => q.trim() !== ''),
      keywords: formData.keywords.filter(k => k.trim() !== '')
    };

    onSubmitSuccess(cleanedData);

    // Reset form
    setFormData({
      name: '',
      context: '',
      research_questions: [''],
      keywords: ['']
    });
  };

  const addResearchQuestion = () => {
    setFormData({
      ...formData,
      research_questions: [...formData.research_questions, '']
    });
  };

  const updateResearchQuestion = (index: number, value: string) => {
    const updated = [...formData.research_questions];
    updated[index] = value;
    setFormData({ ...formData, research_questions: updated });
  };

  const removeResearchQuestion = (index: number) => {
    const updated = formData.research_questions.filter((_, i) => i !== index);
    setFormData({ ...formData, research_questions: updated });
  };

  const addKeyword = () => {
    setFormData({
      ...formData,
      keywords: [...formData.keywords, '']
    });
  };

  const updateKeyword = (index: number, value: string) => {
    const updated = [...formData.keywords];
    updated[index] = value;
    setFormData({ ...formData, keywords: updated });
  };

  const removeKeyword = (index: number) => {
    const updated = formData.keywords.filter((_, i) => i !== index);
    setFormData({ ...formData, keywords: updated });
  };

  return (
    <Dialog open={isOpen} onClose={onRequestClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <Dialog.Title className="text-2xl font-bold mb-4">
              Create New Project
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Healthcare AI Research"
                  disabled={isSubmitting}
                />
              </div>

              {/* Project Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Context *
                </label>
                <textarea
                  required
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your research project, goals, and objectives..."
                  disabled={isSubmitting}
                />
              </div>

              {/* Research Questions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Research Questions
                </label>
                {formData.research_questions.map((question, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => updateResearchQuestion(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., How can we preserve privacy in medical imaging?"
                      disabled={isSubmitting}
                    />
                    {formData.research_questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeResearchQuestion(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addResearchQuestion}
                  className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  + Add Research Question
                </button>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords
                </label>
                {formData.keywords.map((keyword, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => updateKeyword(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., federated learning, privacy"
                      disabled={isSubmitting}
                    />
                    {formData.keywords.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addKeyword}
                  className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  + Add Keyword
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onRequestClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ProjectModal;
