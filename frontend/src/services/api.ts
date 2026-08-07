import { fetchWithToken } from './authService.js';

function cleanUrl(url: string): string {
  return url.startsWith('/api') ? url.replace('/api', '') : url;
}

export const api = {
  get: async (url: string) => {
    const data = await fetchWithToken('GET', cleanUrl(url));
    return { data };
  },
  post: async (url: string, body?: any) => {
    const data = await fetchWithToken('POST', cleanUrl(url), body);
    return { data };
  },
  put: async (url: string, body?: any) => {
    const data = await fetchWithToken('PUT', cleanUrl(url), body);
    return { data };
  },
  delete: async (url: string) => {
    const data = await fetchWithToken('DELETE', cleanUrl(url));
    return { data };
  }
};

export default api;
