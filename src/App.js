import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Tools from './pages/Tools';
import ProductUpdate from './pages/ProductUpdate';
import PulsaTransferUpdate from './pages/PulsaTransferUpdate';
import FreeFireUpdate from './pages/FreeFireUpdate';
import EMoneyUpdate from './pages/EMoneyUpdate';
import IsimpleProduksi from './pages/IsimpleProduksi';
import TriProduksi from './pages/TriProduksi';
import SettingsManager from './pages/SettingsManager';
import { BearerTokenProvider } from './contexts/BearerTokenContext';

function App() {
  return (
    <BearerTokenProvider>
      <Router>
        <Routes>
          {/* Login route - no header, no container */}
          <Route path="/login" element={<Login />} />

          {/* All other routes with header and container */}
          <Route path="*" element={
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  {/* Protected routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/tools" element={
                    <ProtectedRoute>
                      <Tools />
                    </ProtectedRoute>
                  } />
                  <Route path="/product-update" element={
                    <ProtectedRoute>
                      <ProductUpdate />
                    </ProtectedRoute>
                  } />
                  <Route path="/pulsa-transfer-update" element={
                    <ProtectedRoute>
                      <PulsaTransferUpdate />
                    </ProtectedRoute>
                  } />
                  <Route path="/freefire-update" element={
                    <ProtectedRoute>
                      <FreeFireUpdate />
                    </ProtectedRoute>
                  } />
                  <Route path="/emoney-update" element={
                    <ProtectedRoute>
                      <EMoneyUpdate />
                    </ProtectedRoute>
                  } />
                  <Route path="/isimple-produksi" element={
                    <ProtectedRoute>
                      <IsimpleProduksi />
                    </ProtectedRoute>
                  } />
                  <Route path="/tri-produksi" element={
                    <ProtectedRoute>
                      <TriProduksi />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <SettingsManager />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          } />
        </Routes>
      </Router>
    </BearerTokenProvider>
  );
}

export default App;