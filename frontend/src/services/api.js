import { fetchWithToken } from './authService';

function cleanUrl(url) {
  return url && url.startsWith('/api') ? url.replace('/api', '') : url;
}

export const api = {
  get: async (url) => {
    const data = await fetchWithToken('GET', cleanUrl(url));
    return { data };
  },
  post: async (url, body) => {
    const data = await fetchWithToken('POST', cleanUrl(url), body);
    return { data };
  },
  put: async (url, body) => {
    const data = await fetchWithToken('PUT', cleanUrl(url), body);
    return { data };
  },
  delete: async (url) => {
    const data = await fetchWithToken('DELETE', cleanUrl(url));
    return { data };
  }
};

export default api;
