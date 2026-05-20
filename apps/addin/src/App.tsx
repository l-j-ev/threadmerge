import { useEffect, useState } from 'react';
import { getAuthToken } from './lib/auth';
import { api } from './lib/api';

export default function App() {
  const [status, setStatus] = useState<string>('Initialising...');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function authenticate() {
    try {
      setError(null);
      setStatus('Signing in...');
      const token = await getAuthToken();
      setStatus('Loading user...');
      const data = await api.me(token);
      setUser(data.user);
      setStatus('Ready');
      setNeedsSignIn(false);
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Unknown error');
      setStatus('Failed');
      setNeedsSignIn(true);
    }
  }

  useEffect(() => {
  // Don't auto-trigger auth on mount.
  // Dialog API doesn't work reliably during the initial mount lifecycle.
  // User clicks "Sign in" button to start the flow.
  setStatus('Click sign in to begin');
  setNeedsSignIn(true);
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
        {needsSignIn && (
          <button
            onClick={authenticate}
            className="mt-3 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 text-sm"
          >
            Sign in with Microsoft
          </button>
        )}
      </div>

      {user && (
        <div className="mt-6 p-3 bg-brand-50 border border-brand-100 rounded text-brand-700 text-sm">
          Stage 3 complete. Merge UI coming in Stages 5 and 6.
        </div>
      )}
    </div>
  );
}