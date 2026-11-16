import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DniDetailPage from './pages/DniDetailPage';
import FallosPorCampoPage from './pages/FallosPorCampoPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // Or a loading spinner

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  // La paginación y los filtros guardan su estado en la dirección. Sin transiciones la dirección cambia al momento.
  // Con ellas, las casillas y los desplegables volvían un instante a su valor anterior al tocarlos
  return (
    <BrowserRouter useTransitions={false}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dni/:id" element={<DniDetailPage />} />
            <Route path="/fallos" element={<FallosPorCampoPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
