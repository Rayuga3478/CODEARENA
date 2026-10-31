import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type AccessTokenPayload } from '../modules/auth/auth.service.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import type { UserRoleType } from '@cp/shared';

// Extend FastifyRequest to include the authenticated user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

/**
 * Authentication middleware — verifies JWT access token from Authorization header.
 * Attaches decoded user payload to request.user.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);

    if (!payload.sub) {
      throw new UnauthorizedError('Invalid token payload');
    }

    request.user = payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Optional authentication — attaches request.user when a valid Bearer token is
 * present, but never rejects the request. Used by public routes that can
 * personalize their response (e.g. solved status on the problem list).
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  try {
    const payload = await verifyAccessToken(authHeader.slice(7));
    if (payload.sub) request.user = payload;
  } catch {
    // Invalid/expired token on a public route — treat as anonymous.
  }
}

/**
 * Authorization middleware factory — checks that the authenticated user has
 * one of the required roles.
 */
export function authorize(...allowedRoles: UserRoleType[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRole = request.user.role as UserRoleType;

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError('You do not have permission to access this resource');
    }
  };
}
