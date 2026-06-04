import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Monitor RU` : 'Monitor RU';
    return () => { document.title = 'Monitor RU'; };
  }, [title]);
}
