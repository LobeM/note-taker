import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL only auto-cleans when Vitest globals are on; they aren't here.
afterEach(cleanup);
