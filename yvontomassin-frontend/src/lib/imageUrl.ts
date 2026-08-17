const IMG_BASE =
  process.env.NEXT_PUBLIC_IMG_BASE ??
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ??
  '';
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (IMG_BASE ? `${IMG_BASE.replace(/\/+$/, '')}/api` : '');

function isS3Url(value: string) {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === 's3.amazonaws.com' ||
      /^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(hostname) ||
      /\.s3\.amazonaws\.com$/.test(hostname) ||
      /\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(hostname)
    );
  } catch {
    return false;
  }
}

export function getImageUrl(path?: string | null) {
  if (!path) return null;

  if (path.startsWith('https://') && isS3Url(path) && API_BASE) {
    return `${API_BASE.replace(/\/+$/, '')}/images?url=${encodeURIComponent(path)}`;
  }

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  return `${IMG_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
