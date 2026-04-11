// src/hooks/useActivities.js
'use client';

import { useState, useEffect, useCallback } from 'react';

export function useActivities(refreshInterval = 5000) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch('/api/activities?limit=20');
      const data = await response.json();

      if (data.success) {
        setActivities(data.data || []);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();

    // Set up polling for real-time updates
    const interval = setInterval(fetchActivities, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchActivities, refreshInterval]);

  return { activities, loading, error, refresh: fetchActivities };
}