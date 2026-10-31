import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../config/index.js';
import { successResponse } from '../../utils/response.js';
import { authenticate, authorize } from '../../middleware/auth.js';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // All admin routes require ADMIN role
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('ADMIN'));

  // Dashboard stats
  app.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const prisma = getPrisma();

    const [userCount, problemCount, submissionCount, contestCount] = await Promise.all([
      prisma.user.count(),
      prisma.problem.count(),
      prisma.submission.count(),
      prisma.contest.count(),
    ]);

    const recentSubmissions = await prisma.submission.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        verdict: true,
        createdAt: true,
        user: { select: { handle: true } },
        problem: { select: { title: true, slug: true } },
      },
    });

    return reply.send(
      successResponse({
        stats: { userCount, problemCount, submissionCount, contestCount },
        recentSubmissions,
      }),
    );
  });

  // List all users
  app.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = Number((request.query as any).page ?? '1');
    const limit = Math.min(Number((request.query as any).limit ?? '50'), 100);
    const skip = (page - 1) * limit;
    const prisma = getPrisma();

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          handle: true,
          email: true,
          role: true,
          rating: true,
          isVerified: true,
          isDisabled: true,
          createdAt: true,
          _count: { select: { submissions: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return reply.send(
      successResponse({
        data: users,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      }),
    );
  });

  // Disable/enable user
  app.patch('/users/:id/disable', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const prisma = getPrisma();
    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: { isDisabled: true },
      select: { id: true, handle: true, isDisabled: true },
    });
    return reply.send(successResponse({ user }));
  });

  app.patch('/users/:id/enable', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const prisma = getPrisma();
    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: { isDisabled: false },
      select: { id: true, handle: true, isDisabled: true },
    });
    return reply.send(successResponse({ user }));
  });

  // Create announcement
  app.post('/announcements', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      title: z.string().min(3),
      content: z.string().min(10),
      isPinned: z.boolean().default(false),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION', message: 'Invalid data' } });
    }

    const prisma = getPrisma();
    const announcement = await prisma.announcement.create({
      data: {
        ...parsed.data,
        authorId: request.user!.sub,
      },
    });

    return reply.status(201).send(successResponse({ announcement }));
  });
}
