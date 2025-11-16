import { PrismaClient } from '@/lib/generated/prisma/client';

const prismaClientSingleton = () => {
  const client = new PrismaClient();
  console.warn('PRISMA CLIENT INSTANTIATED');
  return client;
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };