
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  user: {
    id: number;
    email: string;
    role: 'ADMIN' | 'STOCK_TAKER';
  };
  onStartStockTaking: () => void;
  onOpenAdmin: () => void;
}

interface DashboardData {
  total_projects: number;
  active_sessions: number;
  total_parts: number;
  recent_records: number;
}

export function Dashboard({ user, onStartStockTaking, onOpenAdmin }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    total_projects: 0,
    active_sessions: 0,
    total_parts: 0,
    recent_records: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await trpc.getDashboardData.query({ userId: user.id });
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Welcome message */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome back! 👋
        </h2>
        <p className="text-gray-600">
          {user.role === 'ADMIN' ? 'Manage your inventory system' : 'Ready for stock taking'}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Projects</p>
              <p className="text-2xl font-bold text-blue-900">{dashboardData.total_projects}</p>
            </div>
            <span className="text-2xl">📋</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Active Sessions</p>
              <p className="text-2xl font-bold text-green-900">{dashboardData.active_sessions}</p>
            </div>
            <span className="text-2xl">⏱️</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Total Parts</p>
              <p className="text-2xl font-bold text-purple-900">{dashboardData.total_parts}</p>
            </div>
            <span className="text-2xl">📦</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Recent Records</p>
              <p className="text-2xl font-bold text-orange-900">{dashboardData.recent_records}</p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        
        <Button
          onClick={onStartStockTaking}
          className="w-full h-14 bg-green-600 hover:bg-green-700 text-left flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📱</span>
            <div>
              <div className="font-medium">Start Stock Taking</div>
              <div className="text-sm opacity-90">Scan or select items</div>
            </div>
          </div>
          <span>→</span>
        </Button>

        {user.role === 'ADMIN' && (
          <>
            <Button
              onClick={onOpenAdmin}
              variant="outline"
              className="w-full h-14 text-left flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⚙️</span>
                <div>
                  <div className="font-medium">Admin Panel</div>
                  <div className="text-sm text-gray-600">Manage users & data</div>
                </div>
              </div>
              <span>→</span>
            </Button>
          </>
        )}
      </div>

      {/* PWA install prompt (shows on mobile) */}
      <Card className="p-4 mt-6 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📲</span>
          <div>
            <p className="font-medium text-gray-900">Install App</p>
            <p className="text-sm text-gray-600">Add to home screen for quick access</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
