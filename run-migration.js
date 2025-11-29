// Script to run the migration for adding new startup profile fields
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250120000000_add_startup_additional_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration...');
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.toLowerCase().includes('begin') || statement.toLowerCase().includes('commit')) {
        continue; // Skip transaction markers
      }
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: queryError } = await supabase.from('startup_profiles').select('id').limit(1);
        if (queryError && queryError.message.includes('exec_sql')) {
          console.log('Note: RPC function not available. Please run the migration manually in Supabase SQL Editor.');
          console.log('\nMigration SQL:');
          console.log(migrationSQL);
          return;
        }
        throw error;
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nPlease run the migration manually in Supabase SQL Editor:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL from: supabase/migrations/20250120000000_add_startup_additional_fields.sql');
    console.log('4. Execute the SQL');
  }
}

runMigration();



