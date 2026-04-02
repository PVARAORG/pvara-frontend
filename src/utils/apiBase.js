export function getApiOrigin() {
  const configuredOrigin = (process.env.REACT_APP_API_URL || '').trim().replace(/\/$/, '');
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  return '';
}

export function getApiBaseUrl() {
  const origin = getApiOrigin();
  return origin ? `${origin}/api` : '/api';
}
