import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import AppLayout from './components/Layout/AppLayout';
import BudgetPage from './pages/BudgetPage/BudgetPage';
import OperationsPage from './pages/OperationsPage/OperationsPage';
import AnalyticsPage from './pages/AnalyticsPage/AnalyticsPage';
import FinancesPage from './pages/FinancesPage/FinancesPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import WhatIfPage from './pages/WhatIfPage/WhatIfPage';
import ImportPage from './pages/ImportPage/ImportPage';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<BudgetPage />} />
            <Route path="/operations" element={<OperationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/finances" element={<FinancesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/whatif" element={<WhatIfPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
