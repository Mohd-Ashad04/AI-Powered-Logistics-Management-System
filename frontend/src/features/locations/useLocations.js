import { useState, useEffect } from 'react';
import { searchLocationsSync } from './locationApi';

export function useLocationSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    
    // 300ms debounce
    const delayDebounce = setTimeout(() => {
      try {
        const data = searchLocationsSync(query);
        if (isMounted) {
          setResults(data);
        }
      } catch (err) {
        if (isMounted) console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [query]);

  return {
    query,
    setQuery,
    results,
    isLoading
  };
}
