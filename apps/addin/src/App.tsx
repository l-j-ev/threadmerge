import { useEffect, useState } from 'react';
import { getSSOToken } from './lib/auth';
import { api } from './lib/api';

export default function App() {
  const [status, setStatus] = useState<string>('Initialising...');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setStatus('Authenticating...');
        const token = await getSSOToken();
        setStatus('Loading user...');
        const data = await api.me(token);
        setUser(data.user);
        setStatus('Ready');
      } catch (err: any) {
        console.error('Init error:', err);
        setError(err.message || 'Unknown error');
        setStatus('Failed');
      }
    }
    init();
  }, []);

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-brand-700">ThreadMerge</h1>
        <p className="text-sm text-gray-500">Merge email threads with controlled disclosure</p>
      </header>

      <div className="text-sm">
        <div className="mb-2">
          <span className="font-medium">Status:</span> {status}
        </div>
        {user && (
          <div className="mb-2">
            <span className="font-medium">Signed in as:</span> {user.email}
          </div>
        )}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
            <div className="font-semibold mb-1">Error</div>
            <div className="text-xs">{error}</div>
          </div>
        )}
      </div>

      {user && (
        <div className="mt-6 p-3 bg-brand-50 border border-brand-100 rounded text-brand-700 text-sm">
          Stage 3 complete. UI for picking threads, customisation, and sending will be built out in Stages 5 and 6.
        </div>
      )}
    </div>
  );
}
