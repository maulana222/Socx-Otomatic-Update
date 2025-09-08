import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ProductUpdate from './pages/ProductUpdate';
import PulsaTransferUpdate from './pages/PulsaTransferUpdate';
import { BearerTokenProvider } from './contexts/BearerTokenContext';

function App() {
  return (
    <BearerTokenProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/product-update" element={<ProductUpdate />} />
              <Route path="/pulsa-transfer-update" element={<PulsaTransferUpdate />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </BearerTokenProvider>
  );
}

export default App;
