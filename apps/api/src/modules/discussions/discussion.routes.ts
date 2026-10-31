import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPrisma } from '../../config/index.js';
import { successResponse } from '../../utils/response.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { authenticate } from '../../middleware/auth.js';

const createDiscussionSchema = z.object({
  problemId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  content: z.string().min(10),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  parentId: z.string().uuid().optional(),
});

export async function discussionRoutes(app: FastifyInstance): Promise<void> {
  // List discussions
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = Number((request.query as any).page ?? '1');
    const limit = Math.min(Number((request.query as any).limit ?? '20'), 50);
    const problemId = (request.query as any).problemId as string | undefined;
    const skip = (page - 1) * limit;
    const prisma = getPrisma();

    const where: any = {};
    if (problemId) where.problemId = problemId;

    const [discussions, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          author: { select: { handle: true, rating: true } },
          problem: { select: { slug: true, title: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.discussion.count({ where }),
    ]);

    return reply.send(
      successResponse({
        data: discussions.map((d) => ({
          ...d,
          commentCount: d._count.comments,
        })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      }),
    );
  });

  // Get discussion detail with comments
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const prisma = getPrisma();

    const discussion = await prisma.discussion.findUnique({
      where: { id: request.params.id },
      include: {
        author: { select: { handle: true, rating: true, avatar: true } },
        problem: { select: { slug: true, title: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { handle: true, rating: true } },
          },
        },
      },
    });

    if (!discussion) throw new NotFoundError('Discussion');

    return reply.send(successResponse({ discussion }));
  });

  // Create discussion (authenticated)
  app.post(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createDiscussionSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid discussion data', parsed.error.flatten().fieldErrors);
      }

      const prisma = getPrisma();
      const discussion = await prisma.discussion.create({
        data: {
          ...parsed.data,
          authorId: request.user!.sub,
        },
        include: {
          author: { select: { handle: true } },
        },
      });

      return reply.status(201).send(successResponse({ discussion }));
    },
  );

  // Add comment to discussion
  app.post(
    '/:id/comments',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const parsed = createCommentSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid comment data', parsed.error.flatten().fieldErrors);
      }

      const prisma = getPrisma();
      const discussion = await prisma.discussion.findUnique({
        where: { id: request.params.id },
        select: { id: true },
      });

      if (!discussion) throw new NotFoundError('Discussion');

      const comment = await prisma.comment.create({
        data: {
          content: parsed.data.content,
          parentId: parsed.data.parentId ?? null,
          discussionId: discussion.id,
          authorId: request.user!.sub,
        },
        include: {
          author: { select: { handle: true, rating: true } },
        },
      });

      return reply.status(201).send(successResponse({ comment }));
    },
  );
}
