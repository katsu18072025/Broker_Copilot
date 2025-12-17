// backend/scripts/debugSync.js
// Simple diagnostic script to find the issue

console.log('🔍 Starting diagnostic...\n');

// Test 1: Basic console output
console.log('✅ Test 1: Console.log works');

// Test 2: Check Node version
console.log(`✅ Test 2: Node version: ${process.version}`);

// Test 3: Check current directory
console.log(`✅ Test 3: Current directory: ${process.cwd()}`);

// Test 4: Check if file exists
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`✅ Test 4: Script location: ${__dirname}`);

// Test 5: Check for CSV file
const csvPath = path.join(process.cwd(), 'data', 'renewals.csv');
console.log(`\n📄 Looking for CSV at: ${csvPath}`);

if (fs.existsSync(csvPath)) {
  console.log('✅ Test 5: CSV file found!');
  const stats = fs.statSync(csvPath);
  console.log(`   File size: ${stats.size} bytes`);
} else {
  console.log('❌ Test 5: CSV file NOT found!');
  console.log('\n💡 Solutions:');
  console.log('   1. Create the data directory: mkdir data');
  console.log('   2. Save your CSV as: data/renewals.csv');
  console.log('   3. Or provide custom path: node scripts/syncCalendarEvents.js preview ./path/to/your.csv');
}

// Test 6: Check if google connector exists
try {
  const connectorPath = path.join(process.cwd(), 'src', 'connectors', 'google.js');
  if (fs.existsSync(connectorPath)) {
    console.log('✅ Test 6: Google connector file exists');
  } else {
    console.log('❌ Test 6: Google connector file NOT found at:', connectorPath);
  }
} catch (error) {
  console.log('❌ Test 6: Error checking connector:', error.message);
}

// Test 7: Try importing google connector
console.log('\n🔗 Test 7: Attempting to import google connector...');
try {
  const { googleConnector } = await import('../src/connectors/google.js');
  console.log('✅ Test 7: Google connector imported successfully');
} catch (error) {
  console.log('❌ Test 7: Failed to import google connector');
  console.log(`   Error: ${error.message}`);
  console.log(`   Stack: ${error.stack}`);
}

// Test 8: Try importing csv-parse
console.log('\n📦 Test 8: Checking csv-parse module...');
try {
  const { parse } = await import('csv-parse/sync');
  console.log('✅ Test 8: csv-parse module loaded');
} catch (error) {
  console.log('❌ Test 8: csv-parse module NOT found');
  console.log('   Run: npm install csv-parse');
}

// Test 9: Check .env file
console.log('\n🔐 Test 9: Checking environment variables...');
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ Test 9: .env file exists');
} else {
  console.log('⚠️  Test 9: .env file not found (might be okay)');
}

// Test 10: Try running a simple calendar sync test
console.log('\n🧪 Test 10: Running minimal sync test...');
try {
  // Create a test CSV in memory
  const testCSV = `Client,Placement Status,Placement Expiry Date,Coverage,Carrier Group,Total Premium,Placement Specialist
Test Client,Quote,31/12/25,General Liability,Test Carrier,100000,Test Specialist`;

  const testPath = path.join(process.cwd(), 'test-data.csv');
  fs.writeFileSync(testPath, testCSV);
  console.log('✅ Test 10a: Created test CSV');

  // Try parsing it
  const { parse } = await import('csv-parse/sync');
  const content = fs.readFileSync(testPath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });
  console.log(`✅ Test 10b: Parsed ${records.length} test record(s)`);
  console.log(`   Sample record:`, records[0]);

  // Cleanup
  fs.unlinkSync(testPath);
  console.log('✅ Test 10c: Test CSV cleaned up');

} catch (error) {
  console.log('❌ Test 10: Minimal test failed');
  console.log(`   Error: ${error.message}`);
}

console.log('\n' + '='.repeat(50));
console.log('🏁 DIAGNOSTIC COMPLETE');
console.log('='.repeat(50));
console.log('\nIf any tests failed above, fix those issues first.');
console.log('Then try running: node scripts/syncCalendarEvents.js preview\n');