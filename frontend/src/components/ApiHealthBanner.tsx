import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '../lib/api';

function describeError(error: any) {
  if (error?.response) {
    return `API responded ${error.response.status}: ${error.response.data?.message || error.response.statusText || 'Unknown response error'}`;
  }
  if (error?.request) {
    return `No response from ${API_BASE_URL}/health. ${error.message || 'Request failed'}`;
  }
  return error?.message || 'Unknown API health check error';
}

export function ApiHealthBanner() {
  const [message, setMessage] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    api.get('/health').catch((error) => setMessage(describeError(error)));
  }, []);

  if (!message || hidden) return null;

  return (
    <div className="fixed left-4 right-4 top-4 z-[60] mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-rose-200 bg-white p-4 text-sm font-semibold text-rose-700 shadow-xl dark:border-rose-500/30 dark:bg-slate-950">
      <AlertTriangle size={18} />
      <span className="flex-1">{message}</span>
      <button aria-label="Dismiss API status" onClick={() => setHidden(true)}>
        <X size={18} />
      </button>
    </div>
  );
}
