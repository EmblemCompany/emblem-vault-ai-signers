import 'dotenv/config';

// Provide a default no-op fetch if not set; tests will override as needed.
if (typeof (globalThis as any).fetch === 'undefined') {
  (globalThis as any).fetch = async () => {
    throw new Error('fetch not mocked in this test');
  };
}

