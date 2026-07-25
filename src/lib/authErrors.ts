/**
 * Generic auth error mapper to prevent information leakage.
 * This prevents attackers from enumerating valid accounts or
 * learning about system internals through error messages.
 */
export const getGenericAuthError = (error: unknown, context: 'login' | 'signup'): string => {
  // Log detailed error for debugging (server-side in production)
  console.error('Auth error:', error);
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

  // Failures that have nothing to do with the credentials the user supplied.
  // These are checked before the generic branches below because collapsing
  // them into a credential message actively misleads: a disabled OAuth
  // provider reported as "Invalid email or password" sent people to reset a
  // password that was never wrong, for a button they could not have made work.
  // Naming the real cause leaks nothing — it is a property of the server's
  // configuration, not of whether any particular account exists.
  if (
    errorMessage.includes('provider is not enabled') ||
    errorMessage.includes('unsupported provider')
  ) {
    return 'That sign-in method is not available right now. Please use your email and password.';
  }
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'Too many attempts. Please try again later.';
  }
  if (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('networkerror') ||
    errorMessage.includes('network request failed')
  ) {
    return 'Could not reach the server. Check your connection and try again.';
  }

  if (context === 'login') {
    // Never confirm whether email exists
    return 'Invalid email or password';
  }

  if (context === 'signup') {
    if (errorMessage.includes('already registered') || errorMessage.includes('user_already_exists') || errorMessage.includes('already exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    return 'Unable to create account. Please try again or contact support.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};
