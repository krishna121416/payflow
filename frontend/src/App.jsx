import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { AccountsSection } from './components/AccountsSection';
import { TransactionForm } from './components/TransactionForm';
import { TransactionHistory } from './components/TransactionHistory';
import { ReconciliationPanel } from './components/ReconciliationPanel';

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [loadError, setLoadError] = useState(null);

  const reload = useCallback(() => {
    api
      .listAccounts()
      .then(setAccounts)
      .catch((err) => setLoadError(err.message));
    setRefreshSignal((n) => n + 1);
  }, []);

  useEffect(reload, [reload]);

  return (
    <div className="app">
      <header>
        <h1>PayFlow</h1>
        <p className="hint">A simplified double-entry payment gateway dashboard.</p>
      </header>

      {loadError && <p className="error-text">Failed to reach API: {loadError}</p>}

      <div className="grid">
        <AccountsSection accounts={accounts} onChanged={reload} />
        <TransactionForm accounts={accounts} onChanged={reload} />
        <TransactionHistory accounts={accounts} refreshSignal={refreshSignal} />
        <ReconciliationPanel refreshSignal={refreshSignal} />
      </div>
    </div>
  );
}
