// Small fetch helpers shared by the Platform Management pages.

export async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf-token', { credentials: 'include' });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Unable to verify request.');
  }

  return result.data.csrfToken;
}

export async function apiRequest(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Something went wrong. Please try again.');
  }

  return result.data;
}

// Most recent Monday that has already started, as YYYY-MM-DD (local date).
export function lastMonday(from = new Date()) {
  const date = new Date(from);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);

  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isMonday(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 1;
}
