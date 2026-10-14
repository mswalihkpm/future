import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function scanAllTables() {
  const tables: any = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);

  console.log(`Scanning ${tables.length} tables in public schema for any photo or image fields...`);

  for (const t of tables) {
    const tableName = t.table_name;
    const cols: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${tableName}';
    `);

    for (const c of cols) {
      const colName = c.column_name;
      const dataType = c.data_type;

      if (
        colName.toLowerCase().includes('photo') ||
        colName.toLowerCase().includes('image') ||
        colName.toLowerCase().includes('avatar') ||
        colName.toLowerCase().includes('picture') ||
        colName.toLowerCase().includes('file') ||
        colName.toLowerCase().includes('attachment')
      ) {
        const countRes: any = await prisma.$queryRawUnsafe(
          `SELECT count(*) as total, count("${colName}") as non_null FROM "${tableName}";`
        );
        console.log(`Table "${tableName}", Column "${colName}" (${dataType}): Total rows: ${countRes[0].total}, Non-null: ${countRes[0].non_null}`);
      }
    }
  }
}

scanAllTables().finally(() => prisma.$disconnect());
