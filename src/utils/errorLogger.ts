import { supabase } from '@/integrations/supabase/client';

// Generate a unique correlation ID for error tracking
export const generateCorrelationId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${randomPart}`.toUpperCase();
};

export type ErrorType = 
  | 'signup_error'
  | 'login_error'
  | 'password_reset_error'
  | 'profile_error'
  | 'device_ban_check_error'
  | 'referral_error'
  | 'general_auth_error';

interface LogErrorParams {
  correlationId: string;
  errorType: ErrorType;
  errorMessage: string;
  errorDetails?: Record<string, unknown>;
  userId?: string;
  deviceFingerprint?: string;
}

// Log error to database (non-blocking)
export const logError = async ({
  correlationId,
  errorType,
  errorMessage,
  errorDetails,
  userId,
  deviceFingerprint,
}: LogErrorParams): Promise<void> => {
  try {
    // Use type assertion for new table not yet in generated types
    const insertData = {
      correlation_id: correlationId,
      error_type: errorType,
      error_message: errorMessage,
      error_details: errorDetails || null,
      user_id: userId || null,
      device_fingerprint: deviceFingerprint || null,
      user_agent: navigator.userAgent,
    };
    
    await (supabase.from('error_logs') as any).insert(insertData);
  } catch {
    // Silent fail - don't break the app if logging fails
  }
};

// Format error message with correlation ID for user display
export const formatErrorWithCorrelation = (
  message: string,
  correlationId: string
): string => {
  return `${message} (Ref: ${correlationId})`;
};

// Password validation rules
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  
  // Minimum length
  if (password.length < 8) {
    errors.push('At least 8 characters required');
  }
  
  // Maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push('Password too long (max 128 characters)');
  }
  
  // Must contain lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter');
  }
  
  // Must contain uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter');
  }
  
  // Must contain number
  if (!/[0-9]/.test(password)) {
    errors.push('Include at least one number');
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /^12345/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /111111/,
    /000000/,
  ];
  
  if (weakPatterns.some(pattern => pattern.test(password))) {
    errors.push('Avoid common password patterns');
  }
  
  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 8;
  const isStrong = password.length >= 12;
  
  const criteriaCount = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;
  
  if (criteriaCount >= 5 && isStrong) {
    strength = 'strong';
  } else if (criteriaCount >= 4) {
    strength = 'medium';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};
