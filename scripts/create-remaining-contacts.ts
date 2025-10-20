import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Read the second CSV file
const csvPath = path.join(process.cwd(), 'attached_assets', 'apollo-contacts-export (1)_1760918345566.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

console.log(`Total contacts in second CSV: ${records.length}`);

// Skip first 2 (Edith and Melissa who already received emails)
const remainingContacts = records.slice(2);

console.log(`Remaining contacts to send: ${remainingContacts.length}`);

// Create a new CSV with remaining contacts
const header = Object.keys(records[0]).join(',');
const rows = remainingContacts.map((record: any) => {
  return Object.values(record).map((value: any) => {
    // Escape quotes and wrap in quotes if contains comma
    const stringValue = String(value || '');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }).join(',');
});

const newCsvContent = [header, ...rows].join('\n');

// Write to new file
const outputPath = path.join(process.cwd(), 'attached_assets', 'remaining-contacts.csv');
fs.writeFileSync(outputPath, newCsvContent, 'utf-8');

console.log(`\n✅ Created: ${outputPath}`);
console.log(`\nRemaining contacts (${remainingContacts.length}):`);

remainingContacts.forEach((record: any, i: number) => {
  console.log(`  ${i + 1}. ${record['First Name']} <${record['Email']}>`);
});
