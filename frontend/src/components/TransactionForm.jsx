import { useState } from 'react';
import { api } from '../api';

export function TransactionForm({ accounts, onChanged }) {
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const transaction = await api.createTransaction({
        idempotency_key: idempotencyKey,
        amount: Number(amount),
        source_account_id: sourceId,
        destination_account_id: destinationId,
      });
      setResult(transaction);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>Create Transaction</h2>
      <form className="stacked-form" onSubmit={handleSubmit}>
        <label>
          Idempotency key
          <input
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            placeholder="e.g. payment-123"
            required
          />
        </label>
        <label>
          Amount
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Source account
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} required>
            <option value="" disabled>Select source</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.owner_name} ({a.balance})</option>
            ))}
          </select>
        </label>
        <label>
          Destination account
          <select value={destinationId} onChange={(e) => setDestinationId(e.target.value)} required>
            <option value="" disabled>Select destination</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.owner_name} ({a.balance})</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={submitting}>Send Payment</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <p className="success-text">
          Transaction {result.status}: {result.id} (amount {result.amount})
        </p>
      )}
    </section>
  );
}
