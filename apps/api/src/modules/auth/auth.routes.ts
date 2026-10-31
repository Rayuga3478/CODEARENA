import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrisma } from '../../config/index.js';
import { successResponse } from '../../utils/response.js';
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas.js';
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateSecureToken,
  hashSecureToken,
  getRefreshCookieOptions,
} from './auth.service.js';
import { authenticate } from '../../middleware/auth.js';
import {
  getEmailService,
  buildVerificationEmail,
  buildPasswordResetEmail,
} from '../../services/email.service.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ─── Register ────────────────────────────────────────────────────────────

  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid registration data', parsed.error.flatten().fieldErrors);
    }

    const { handle, email, password } = parsed.data;
    const prisma = getPrisma();

    // Check for existing handle or email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ handle: handle.toLowerCase() }, { email: email.toLowerCase() }],
      },
      select: { handle: true, email: true },
    });

    if (existing) {
      if (existing.handle.toLowerCase() === handle.toLowerCase()) {
        throw new ConflictError('Handle is already taken');
      }
      throw new ConflictError('Email is already registered');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        handle: handle.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
      },
      select: { id: true, handle: true, email: true },
    });

    // Send verification email
    const verificationToken = generateSecureToken();
    const tokenHash = hashSecureToken(verificationToken);

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const emailService = getEmailService();
    const emailMsg = buildVerificationEmail(user.handle, verificationToken);
    emailMsg.to = user.email;
    await emailService.send(emailMsg);

    return reply.status(201).send(
      successResponse({
        message: 'Account created. Please check your email to verify your account.',
        user: { id: user.id, handle: user.handle, email: user.email },
      }),
    );
  });

  // ─── Verify Email ────────────────────────────────────────────────────────

  app.post('/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = verifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid verification data');
    }

    const prisma = getPrisma();
    const tokenHash = hashSecureToken(parsed.data.token);

    const verification = await prisma.emailVerification.findUnique({
      where: { token: tokenHash },
      include: { user: { select: { id: true, isVerified: true } } },
    });

    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired verification token');
    }

    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verification.userId },
        data: { isVerified: true },
      }),
    ]);

    return reply.send(successResponse({ message: 'Email verified successfully' }));
  });

  // ─── Login ───────────────────────────────────────────────────────────────

  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid login data', parsed.error.flatten().fieldErrors);
    }

    const { login, password } = parsed.data;
    const prisma = getPrisma();

    // Find user by handle or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { handle: login.toLowerCase() },
          { email: login.toLowerCase() },
        ],
      },
      select: {
        id: true,
        handle: true,
        email: true,
        passwordHash: true,
        role: true,
        isDisabled: true,
        rating: true,
        maxRating: true,
        avatar: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.isDisabled) {
      throw new UnauthorizedError('Account is disabled');
    }

    const passwordValid = await verifyPassword(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Create access token
    const accessToken = await createAccessToken({
      userId: user.id,
      role: user.role,
      handle: user.handle,
    });

    // Create refresh token and session
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: request.headers['user-agent'] ?? null,
        ipAddress: request.ip,
      },
    });

    // Set refresh token as HTTP-only cookie
    reply.setCookie('refresh_token', refreshToken, getRefreshCookieOptions());

    return reply.send(
      successResponse({
        accessToken,
        user: {
          id: user.id,
          handle: user.handle,
          email: user.email,
          role: user.role,
          rating: user.rating,
          maxRating: user.maxRating,
          avatar: user.avatar,
        },
      }),
    );
  });

  // ─── Refresh Token ───────────────────────────────────────────────────────

  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const prisma = getPrisma();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const session = await prisma.userSession.findFirst({
      where: {
        refreshTokenHash,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            role: true,
            isDisabled: true,
          },
        },
      },
    });

    if (!session || session.user.isDisabled) {
      // Clear invalid cookie
      reply.clearCookie('refresh_token', { path: '/api/auth' });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate refresh token (invalidate old, create new)
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Create new access token
    const accessToken = await createAccessToken({
      userId: session.user.id,
      role: session.user.role,
      handle: session.user.handle,
    });

    reply.setCookie('refresh_token', newRefreshToken, getRefreshCookieOptions());

    return reply.send(successResponse({ accessToken }));
  });

  // ─── Logout ──────────────────────────────────────────────────────────────

  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies['refresh_token'];

    if (refreshToken) {
      const prisma = getPrisma();
      const refreshTokenHash = hashRefreshToken(refreshToken);

      // Delete the session
      await prisma.userSession.deleteMany({
        where: { refreshTokenHash },
      });
    }

    reply.clearCookie('refresh_token', { path: '/api/auth' });

    return reply.send(successResponse({ message: 'Logged out successfully' }));
  });

  // ─── Get Current User ────────────────────────────────────────────────────

  app.get(
    '/me',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const prisma = getPrisma();

      const user = await prisma.user.findUnique({
        where: { id: request.user!.sub },
        select: {
          id: true,
          handle: true,
          email: true,
          role: true,
          rating: true,
          maxRating: true,
          avatar: true,
          bio: true,
          country: true,
          isVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      return reply.send(successResponse({ user }));
    },
  );

  // ─── Change Password ────────────────────────────────────────────────────

  app.post(
    '/change-password',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = changePasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid password data', parsed.error.flatten().fieldErrors);
      }

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { id: request.user!.sub },
        select: { id: true, passwordHash: true },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      const currentValid = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
      if (!currentValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      const newHash = await hashPassword(parsed.data.newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      // Invalidate all sessions except current
      const refreshToken = request.cookies['refresh_token'];
      if (refreshToken) {
        const currentTokenHash = hashRefreshToken(refreshToken);
        await prisma.userSession.deleteMany({
          where: {
            userId: user.id,
            refreshTokenHash: { not: currentTokenHash },
          },
        });
      }

      return reply.send(successResponse({ message: 'Password changed successfully' }));
    },
  );

  // ─── Forgot Password ────────────────────────────────────────────────────

  app.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid email');
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, handle: true, email: true },
    });

    // Always return success to prevent account enumeration
    if (!user) {
      return reply.send(
        successResponse({ message: 'If that email exists, a reset link has been sent.' }),
      );
    }

    const resetToken = generateSecureToken();
    const tokenHash = hashSecureToken(resetToken);

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const emailService = getEmailService();
    const emailMsg = buildPasswordResetEmail(user.handle, resetToken);
    emailMsg.to = user.email;
    await emailService.send(emailMsg);

    return reply.send(
      successResponse({ message: 'If that email exists, a reset link has been sent.' }),
    );
  });

  // ─── Reset Password ─────────────────────────────────────────────────────

  app.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid reset data', parsed.error.flatten().fieldErrors);
    }

    const prisma = getPrisma();
    const tokenHash = hashSecureToken(parsed.data.token);

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true } } },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const newHash = await hashPassword(parsed.data.newPassword);

    await prisma.$transaction([
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newHash },
      }),
      // Invalidate all sessions for security
      prisma.userSession.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    return reply.send(
      successResponse({ message: 'Password reset successfully. Please log in again.' }),
    );
  });
}
