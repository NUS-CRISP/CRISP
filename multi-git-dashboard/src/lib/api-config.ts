const domain = process.env.NEXT_PUBLIC_DOMAIN || 'localhost';
const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001';
const apiPath = 'api';

const apiBaseUrl = `https://${domain}:${backendPort}/${apiPath}`;

export default apiBaseUrl;
