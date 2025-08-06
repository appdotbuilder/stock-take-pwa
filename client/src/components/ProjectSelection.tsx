
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Project } from '../../../server/src/schema';

interface ProjectSelectionProps {
  onProjectSelect: (projectId: number) => void;
}

export function ProjectSelection({ onProjectSelect }: ProjectSelectionProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const result = await trpc.getProjects.query();
      setProjects(result);
      setFilteredProjects(result);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const filtered = projects.filter((project: Project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4">Select Project</h2>
          <div className="h-12 bg-gray-200 rounded animate-pulse mb-4"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">📋 Select Project</h2>
      
      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="🔍 Search projects..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="h-12"
        />
      </div>

      {/* Projects list */}
      {filteredProjects.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="text-4xl mb-4 block">📂</span>
          <p className="text-gray-600 mb-2">
            {projects.length === 0 ? 'No projects available' : 'No projects match your search'}
          </p>
          {projects.length === 0 && (
            <p className="text-sm text-gray-500">
              Contact your administrator to create projects
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project: Project) => (
            <Card key={project.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Created: {project.created_at.toLocaleDateString()}
                  </p>
                </div>
                
                <Button
                  onClick={() => onProjectSelect(project.id)}
                  className="ml-4 bg-blue-600 hover:bg-blue-700"
                >
                  Start →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
