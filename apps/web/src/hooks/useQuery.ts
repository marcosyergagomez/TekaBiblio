import { useEffect, useRef, useState, type DependencyList } from 'react';
import { i18n } from '../i18n';
import { isAbortError, readApiError } from '../lib/api-error';

type QueryStatus = 'loading' | 'error' | 'ready';

export function useQuery<T>(queryFn: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [status, setStatus] = useState<QueryStatus>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const queryRef = useRef(queryFn);
  queryRef.current = queryFn;
  const serialized = JSON.stringify(deps);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus('loading');
    setError(null);

    queryRef
      .current(controller.signal)
      .then((next) => {
        if (!active) {
          return;
        }

        setData(next);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (!active || isAbortError(caught)) {
          return;
        }

        setError(readApiError(caught) ?? i18n.t('common.errorGeneric'));
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [serialized, attempt]);

  return {
    status,
    data,
    error,
    reload: () => setAttempt((value) => value + 1),
  };
}
