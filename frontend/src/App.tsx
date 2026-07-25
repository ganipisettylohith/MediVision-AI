import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
          <Navbar />
          <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Sidebar />
            <main className="flex-1 md:pl-6 w-full overflow-hidden">
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </main>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
