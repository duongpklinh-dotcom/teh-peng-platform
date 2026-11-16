// Profiles (roles) an admin can choose when creating an account.
// Values must match the role values used in server/models/User.js.
export const PROFILES = [
  ['customer', 'Customer'],
  ['interior_designer', 'Interior Designer'],
  ['platform_management', 'Platform Management'],
  ['user_admin', 'User Administrator']
];

export const PROFILE_LABELS = Object.fromEntries(PROFILES);

export function statusLabel(status) {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Same two-step pattern as the other pages: get a CSRF token, then call the API.
export async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf-token', {
    credentials: 'include'
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Unable to verify request.');
  }

  return result.data.csrfToken;
}
