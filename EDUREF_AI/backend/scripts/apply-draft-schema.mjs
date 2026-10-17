import 'dotenv/config';
import fs from 'node:fs/promises';
import prisma from '../config/prisma.js';
// Apply only additive draft schema changes on an existing database without migration history.
// No reset, seed, baseline or modifications to business records.
try {
  const [row] = await prisma.$queryRaw`SELECT to_regclass('public."PetitionDraft"')::text AS name`;
  if (row.name) console.log('PetitionDraft already exists; no schema change performed.');
  else {
    const sql = await fs.readFile(new URL('../prisma/migrations/20261017000100_petition_drafts/migration.sql', import.meta.url), 'utf8');
    await prisma.$transaction(async tx => {
      for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    });
    console.log('Added PetitionDraft and its indexes. Existing tables and data were preserved.');
  }
  const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PetitionDraft' AND column_name = 'resolution'`;
  if (!columns.length) {
    await prisma.$executeRaw`ALTER TABLE "PetitionDraft" ADD COLUMN "resolution" JSONB`;
    console.log('Added nullable draft resolution for final policy decisions.');
  }
} catch (error) { console.error('Draft schema setup failed:', error.code || error.name); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
