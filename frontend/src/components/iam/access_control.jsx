import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { validateAccess } from '@/config/permissions';

/**
 * AccessControl component evaluates the current user's IAM policies against a required action.
 * Usage:
 * <AccessControl required="DMS_UPLOAD:Create">
 *   <Button>Upload Document</Button>
 * </AccessControl>
 */
export function AccessControl({ required, children, fallback = null }) {
  const { iamPolicies } = useAuth();
  
  if (!required) return <>{children}</>;

  const lastColonIdx = required.lastIndexOf(':');
  let resource = required;
  let action = 'View'; // Default action if none specified

  if (lastColonIdx !== -1) {
    resource = required.substring(0, lastColonIdx);
    action = required.substring(lastColonIdx + 1);
  }

  const hasAccess = validateAccess(iamPolicies, resource, action);

  if (hasAccess) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
