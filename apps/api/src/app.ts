import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { getEnv } from './config/index.js';
import { AppError } from './utils/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { problemRoutes } from './modules/problems/problem.routes.js';
import { submissionRoutes } from './modules/submissions/submission.routes.js';
import { contestRoutes } from './modules/contests/contest.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { discussionRoutes } from './modules/discussions/discussion.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    requestId: undefined,
    genReqId: () => crypto.randomUUID(),
  });

  // ─── Plugins ───────────────────────────────────────────────────────────────

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Disabled in dev; configure for production
  });

  await app.register(fastifyCors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(fastifyCookie, {
    secret: env.JWT_SECRET, // Used for signed cookies
  });

  await app.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request: FastifyRequest) => {
      return request.ip;
    },
  });

  // ─── Health Check ──────────────────────────────────────────────────────────

  app.get('/api/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
    return { success: true, data: { status: 'ok', timestamp: new Date().toISOString() } };
  });

  // ─── Routes ────────────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(problemRoutes, { prefix: '/api/problems' });
  await app.register(submissionRoutes, { prefix: '/api/submissions' });
  await app.register(contestRoutes, { prefix: '/api/contests' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(discussionRoutes, { prefix: '/api/discussions' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // ─── Error Handler ─────────────────────────────────────────────────────────

  app.setErrorHandler((error, request, reply) => {
    // AppError — expected application errors
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, error.message);
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && env.NODE_ENV === 'development' ? { details: error.details } : {}),
        },
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          ...(env.NODE_ENV === 'development' ? { details: error.validation } : {}),
        },
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }

    // Unexpected errors — log full details, return safe message
    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      },
    });
  });

  // ─── Not Found Handler ─────────────────────────────────────────────────────

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  return app;
}
