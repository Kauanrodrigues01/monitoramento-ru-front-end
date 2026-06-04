import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import { Layout } from './components/Layout';
import { AdminProvider } from './context/AdminContext';
import { ToastProvider } from './context/ToastContext';

const Dashboard        = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const RestaurantDetail = lazy(() => import('./pages/RestaurantDetail').then(m => ({ default: m.RestaurantDetail })));
const SchedulesPage    = lazy(() => import('./pages/SchedulesPage').then(m => ({ default: m.SchedulesPage })));
const AdminPanel       = lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const NotFound         = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function PageFallback() {
  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: 2 }}>
      CARREGANDO...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <ToastProvider>
          <Layout>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/restaurants/:id" element={<RestaurantDetail />} />
                <Route path="/schedules" element={<SchedulesPage />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
          <ToastContainer />
        </ToastProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}
