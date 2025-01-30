import { Langfuse } from 'langfuse';

// Log Langfuse configuration
console.log('Initializing frontend Langfuse with:', {
  baseUrl: import.meta.env.VITE_LANGFUSE_HOST,
  hasSecretKey: !!import.meta.env.VITE_LANGFUSE_SECRET_KEY,
  hasPublicKey: !!import.meta.env.VITE_LANGFUSE_PUBLIC_KEY,
  flushAt: import.meta.env.DEV ? 1 : 25,
  flushInterval: import.meta.env.DEV ? 100 : 5000,
});

// Initialize the Langfuse client
const langfuse = new Langfuse({
  publicKey: import.meta.env.VITE_LANGFUSE_PUBLIC_KEY,
  secretKey: import.meta.env.VITE_LANGFUSE_SECRET_KEY,
  baseUrl: import.meta.env.VITE_LANGFUSE_HOST,
  // Flush immediately in development for easier debugging
  flushAt: import.meta.env.DEV ? 1 : 25,
  // Flush every 5 seconds in production
  flushInterval: import.meta.env.DEV ? 100 : 5000,
});

export default langfuse; 
