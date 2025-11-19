import type { HelloWorldResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetches the Hello World message from the Django API
 * @returns Promise resolving to the HelloWorldResponse
 * @throws Error if the API request fails
 */
export async function fetchHelloWorld(): Promise<HelloWorldResponse> {
  const response = await fetch(`${API_BASE_URL}/api/hello/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data: HelloWorldResponse = await response.json();
  return data;
}

