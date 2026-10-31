import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { getEnv } from './env.js';

let _prisma: PrismaClient | null = null;
let _pool: pg.Pool | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    const env = getEnv();

    _pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
    });

    const adapter = new PrismaPg(_pool);

    _prisma = new PrismaClient({ adapter });
  }
  return _prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
