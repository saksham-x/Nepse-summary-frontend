import { ApiError, CLIENT_ERROR } from './api-client';

export interface FriendlyError {
  title: string;
  description: string;
}

/** Maps backend/client error codes to text a user can act on. */
export function describeError(error: unknown): FriendlyError {
  if (!(error instanceof ApiError)) {
    return { title: 'Something went wrong', description: 'An unexpected error occurred in the app.' };
  }
  switch (error.code) {
    case CLIENT_ERROR.NETWORK_ERROR:
      return { title: 'API unreachable', description: 'Could not connect to nepse-api. Check that the backend is running (npm run dev in nepse-api).' };
    case CLIENT_ERROR.INVALID_RESPONSE:
      return { title: 'Unexpected response', description: `${error.message}. Check VITE_API_BASE_URL and the dev proxy target.` };
    case 'INSTRUMENT_NOT_FOUND':
      return { title: 'Unknown symbol', description: 'No listed instrument has this symbol.' };
    case 'QUOTE_NOT_AVAILABLE':
      return { title: 'No quote yet', description: 'No quote has been stored for this symbol. Run npm run sync in nepse-api.' };
    case 'UPSTREAM_UNAVAILABLE':
      return { title: 'NEPSE unavailable', description: 'The NEPSE data source could not be reached and no stored data exists yet.' };
    case 'UPSTREAM_TIMEOUT':
      return { title: 'NEPSE timed out', description: 'The NEPSE data source did not respond in time. Try again shortly.' };
    case 'REFRESH_FAILED':
      return { title: 'Refresh failed', description: 'NEPSE responded with data that could not be used.' };
    case 'DATABASE_ERROR':
      return { title: 'Database unavailable', description: 'The backend cannot reach its database right now.' };
    case 'RATE_LIMITED':
      return { title: 'Too many requests', description: 'Please wait a moment before trying again.' };
    case 'VALIDATION_ERROR':
      return {
        title: 'Invalid request',
        description: error.details?.issues?.map((i) => `${i.path}: ${i.message}`).join('; ') || error.message,
      };
    default:
      return { title: 'Request failed', description: error.message };
  }
}
