/**
 * Script to run storage policies migration using PostgreSQL connection
 * 
 * This script requires:
 * 1. SUPABASE_DB_URL - Your Supabase database connection string
 *    Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
 *    Get it from: Supabase Dashboard > Settings > Database > Connection string > URI
 * 
 * Usage:
 *   1. Install dependencies: npm install pg dotenv
 *   2. Add SUPABASE_DB_URL to your .env file
 *   3. Run: node run-storage-policies.js
 */

const fs = require('fs');
const path = require('path');

// Try to load dotenv if available
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // dotenv not installed, continue without it
}

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

if (!SUPABASE_DB_URL) {
  console.error('❌ Error: SUPABASE_DB_URL not found in environment');
  console.error('\n📋 To get your connection string:');
  console.error('   1. Go to Supabase Dashboard > Settings > Database');
  console.error('   2. Find "Connection string" section');
  console.error('   3. Select "URI" tab');
  console.error('   4. Copy the connection string (starts with postgresql://)');
  console.error('   5. Add it to your .env file as: SUPABASE_DB_URL=postgresql://...');
  console.error('\n💡 Make sure to replace [YOUR-PASSWORD] with your actual database password!');
  process.exit(1);
}

// Read the SQL file
const sqlFilePath = path.join(__dirname, 'supabase', 'migrations', '20251113154501_setup_storage_policies.sql');

if (!fs.existsSync(sqlFilePath)) {
  console.error(`❌ Error: SQL file not found at ${sqlFilePath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFilePath, 'utf8');

console.log('📄 Read SQL file:', sqlFilePath);
console.log('🔗 Connecting to database...');
console.log('⏳ Executing migration...\n');

// Execute SQL using pg client
async function runMigration() {
  let client;
  
  try {
    // Try to use pg package
    const { Client } = require('pg');
    
    client = new Client({
      connectionString: SUPABASE_DB_URL,
    });
    
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Execute the SQL
    await client.query(sql);
    console.log('✅ Migration executed successfully!\n');
    
    // Verify policies were created
    console.log('🔍 Verifying policies...\n');
    const result = await client.query(`
      SELECT policyname, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
      ORDER BY policyname;
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} storage policies:\n`);
      result.rows.forEach(policy => {
        console.log(`   ✓ ${policy.policyname} (${policy.cmd})`);
      });
      console.log('\n🎉 All done! You can now upload files without RLS errors.');
    } else {
      console.log('⚠️  No policies found. Please check the migration output above.');
    }
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('pg')) {
      console.error('❌ Error: "pg" package not installed');
      console.error('\n📦 Install it with: npm install pg dotenv');
      console.error('   Then run this script again.');
    } else if (error.message.includes('password authentication failed')) {
      console.error('❌ Error: Database authentication failed');
      console.error('   Please check your SUPABASE_DB_URL connection string');
      console.error('   Make sure the password is correct and not URL-encoded incorrectly');
    } else if (error.message.includes('must be owner')) {
      console.error('❌ Error: Permission denied - must be owner of table objects');
      console.error('\n💡 This means your connection string is not using the owner role.');
      console.error('   Options:');
      console.error('   1. Use the "postgres" user connection string from Supabase Dashboard');
      console.error('   2. Or run the SQL directly in Supabase Dashboard > Database > SQL Editor');
      console.error('      (The dashboard SQL editor runs with owner privileges)');
    } else {
      console.error('❌ Error:', error.message);
      console.error('\n💡 Alternative: Run the SQL directly in Supabase Dashboard > Database > SQL Editor');
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

runMigration();
