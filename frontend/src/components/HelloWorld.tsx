import { useState, useEffect } from 'react';
import { fetchHelloWorld } from '../services/api';
import type { HelloWorldResponse } from '../types/api';

const HelloWorld = () => {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMessage = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: HelloWorldResponse = await fetchHelloWorld();
        setMessage(data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch message');
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>{message}</h1>
    </div>
  );
};

export default HelloWorld;

