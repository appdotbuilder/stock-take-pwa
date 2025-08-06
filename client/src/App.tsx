
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';

// Components
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { ProjectSelection } from '@/components/ProjectSelection';
import { StockTaking } from '@/components/StockTaking';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Navigation types
type View = 'login' | 'dashboard' | 'projects' | 'stock-taking' | 'admin';

interface AuthUser {
  id: number;
  email: string;
  role: 'ADMIN' | 'STOCK_TAKER';
}

function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing auth on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('stocktaking_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setCurrentView('dashboard');
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('stocktaking_user');
      }
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await trpc.login.mutate({ email, password });
      const authUser: AuthUser = {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role as 'ADMIN' | 'STOCK_TAKER'
      };
      
      setUser(authUser);
      localStorage.setItem('stocktaking_user', JSON.stringify(authUser));
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setSelectedProject(null);
    localStorage.removeItem('stocktaking_user');
    setCurrentView('login');
  }, []);

  const handleProjectSelect = useCallback((projectId: number) => {
    setSelectedProject(projectId);
    setCurrentView('stock-taking');
  }, []);

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">📦 Stock Taking</h1>
            <p className="text-gray-600">Inventory Management System</p>
          </div>
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first header */}
      <header className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📦</span>
            <h1 className="font-semibold text-gray-900">Stock Taking</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {user?.role === 'ADMIN' && currentView !== 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('admin')}
                className="text-xs"
              >
                ⚙️ Admin
              </Button>
            )}
            
            {currentView !== 'dashboard' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('dashboard')}
                className="text-xs"
              >
                🏠 Home
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs"
            >
              🚪 Logout
            </Button>
          </div>
        </div>
        
        {/* User info */}
        <div className="mt-2 text-sm text-gray-600">
          👤 {user?.email} • {user?.role}
        </div>
      </header>

      {/* Main content */}
      <main className="pb-4">
        {currentView === 'dashboard' && (
          <Dashboard
            user={user!}
            onStartStockTaking={() => setCurrentView('projects')}
            onOpenAdmin={() => setCurrentView('admin')}
          />
        )}
        
        {currentView === 'projects' && (
          <ProjectSelection onProjectSelect={handleProjectSelect} />
        )}
        
        {currentView === 'stock-taking' && selectedProject && (
          <StockTaking
            projectId={selectedProject}
            userId={user!.id}
            onBack={() => setCurrentView('projects')}
          />
        )}
        
        {currentView === 'admin' && user?.role === 'ADMIN' && (
          <AdminPanel onBack={() => setCurrentView('dashboard')} />
        )}
      </main>
    </div>
  );
}

export default App;
