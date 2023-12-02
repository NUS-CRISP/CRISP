const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001';

export const getApiUrl = (): string => {
  return `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api`;
};
