import fs from 'fs';
import path from 'path';
import { parseRawContent, processRawRows, importVocabularyToDatabase } from '../lib/import';

async function seed() {
  console.log('Seeding vocabulary store with sample words...');
  const samplePath = path.join(process.cwd(), 'sample-data', 'vocabulary.csv');
  const csvContent = fs.readFileSync(samplePath, 'utf-8');
  const rawRows = parseRawContent(csvContent, 'csv');
  const { validItems } = processRawRows(rawRows);
  const { insertedCount, existingDuplicatesCount } = await importVocabularyToDatabase(validItems);

  console.log(`Seeding complete: ${insertedCount} words inserted, ${existingDuplicatesCount} existing/duplicate words skipped.`);
}

seed().catch((e) => {
  console.error('Seeding error:', e);
  process.exit(1);
});
