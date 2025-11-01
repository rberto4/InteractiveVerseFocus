import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { CalendarView } from '../components/CalendarView';
import { GoalsView } from '../components/GoalsView';

function App() {
  const { isAuthenticated, user, loading, error, login, logout, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'goals' | 'calendar'>('dashboard');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setActiveTab('dashboard');
  };

  return (
    <div className="w-[400px] h-[600px] bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">InteractiveVerseFocus</h1>
          {isAuthenticated && user && (
            <button
              onClick={handleLogout}
              className="text-sm opacity-90 hover:opacity-100 underline"
              title="Logout"
            >
              Logout
            </button>
          )}
        </div>
        {user && (
          <div className="flex items-center mt-2">
            {user.picture && (
              <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full mr-2" />
            )}
            <p className="text-sm opacity-90">{user.email}</p>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {!isAuthenticated ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                IF
              </div>
              <h2 className="text-2xl font-semibold mb-2">Welcome!</h2>
              <p className="text-gray-600 mb-6">
                Connect your calendar to start planning your goals with AI
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <button
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect Google Calendar'
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <nav className="flex space-x-2 mb-4 border-b">
              {['dashboard', 'goals', 'calendar'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`px-4 py-2 capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold'
                      : 'text-gray-600 hover:text-indigo-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === 'dashboard' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-gray-600">
                      🎯 Your goal planning dashboard coming soon...
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      OAuth authentication is now working! Next steps: goal input and AI integration.
                    </p>
                  </div>
                </div>
              )}
              {activeTab === 'goals' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Obiettivi</h2>
                  <GoalsView />
                </div>
              )}
              {activeTab === 'calendar' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Calendar</h2>
                  <CalendarView />
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
