// src/hooks/useFetch.js
import { useEffect, useState, useCallback } from "react";

const API_BASE = "http://localhost:5000";

export default function useFetch(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
