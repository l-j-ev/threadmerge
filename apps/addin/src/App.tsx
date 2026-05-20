import { useEffect, useState } from 'react';
import { getAuthToken } from './lib/auth';
import { api } from './lib/api';

export default function App() {
  const [status, setStatus] = useState<string>('Initialising...');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

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
    setStatus('Click sign in to begin');
    setNeedsSignIn(true);
  }, []);

  async function listConversations() {
    try {
      setDebugMessage('Fetching conversations...');
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('Conversations:', data);
      setDebugMessage(
        `Got ${Array.isArray(data) ? data.length : 0} conversations. ` +
          `Check console (F12) for full data.`
      );
    } catch (err: any) {
      setDebugMessage(`Error: ${err.message}`);
    }
  }

  async function testMerge() {
    try {
      setDebugMessage('Building merge preview...');
      const token = await getAuthToken();

      // 1. Get conversations
      const convRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const convs = await convRes.json();
      if (!Array.isArray(convs) || convs.length < 2) {
        setDebugMessage(`Need at least 2 conversations; have ${convs.length || 0}`);
        return;
      }

      const threadA = convs[0];
      const threadB = convs[1];

      // 2. Get messages from both
      const [msgsA, msgsB] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_API_BASE}/api/conversations/${encodeURIComponent(
            threadA.conversationId
          )}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then((r) => r.json()),
        fetch(
          `${import.meta.env.VITE_API_BASE}/api/conversations/${encodeURIComponent(
            threadB.conversationId
          )}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then((r) => r.json()),
      ]);

      const allMessageIds = [...msgsA, ...msgsB].map((m: any) => m.id);

      // 3. Preview the merge
      const previewRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/merge/preview`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadAId: threadA.conversationId,
          threadBId: threadB.conversationId,
          includedMessageIds: allMessageIds,
          messageOrder: [],
          redactions: [],
        }),
      });

      const preview = await previewRes.json();
      console.log('=== MERGE PREVIEW ===');
      console.log('Thread A:', threadA.subject);
      console.log('Thread B:', threadB.subject);
      console.log('Recipients:', preview.recipients);
      console.log('Internal:', preview.internalRecipients);
      console.log('External:', preview.externalRecipients);
      console.log('Warnings:', preview.warnings);
      console.log('Body length:', preview.mergedBody?.length);
      console.log('Body preview:', preview.mergedBody?.substring(0, 500));
      console.log('=====================');

      setDebugMessage(
        `Merge built: ${msgsA.length + msgsB.length} msgs, ` +
          `${preview.recipients?.length || 0} recipients, ` +
          `${preview.warnings?.length || 0} warnings. See console.`
      );
    } catch (err: any) {
      console.error('Merge test error:', err);
      setDebugMessage(`Error: ${err.message}`);
    }
  }

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
        <div className="mt-6 space-y-3">
          <div className="p-3 bg-brand-50 border border-brand-100 rounded text-brand-700 text-sm">
            Stage 3 complete. Stage 4 verification below.
          </div>

          <div className="border border-gray-200 rounded p-3 text-xs">
            <div className="font-semibold text-gray-700 mb-2">Backend tests</div>
            <div className="space-y-2">
              <button
                onClick={listConversations}
                className="block w-full px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                List my conversations
              </button>
              <button
                onClick={testMerge}
                className="block w-full px-3 py-1.5 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                Build a test merge preview
              </button>
            </div>
            {debugMessage && (
              <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                {debugMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}