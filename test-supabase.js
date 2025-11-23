const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbekvfpetwhjsjscwvkl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZWt2ZnBldHdoanNqc2N3dmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDU3MDAsImV4cCI6MjA3ODYyMTcwMH0.7nKdq2MvAugKwV7htYqVk-7L2sBzipfCISY3R3Y-4D4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  try {
    // Test 1: Check startup_profiles table
    console.log('1. Checking startup_profiles table...');
    const { data: startups, error: startupsError } = await supabase
      .from('startup_profiles')
      .select('*')
      .limit(5);
    
    if (startupsError) {
      console.error('Error fetching startups:', startupsError.message);
    } else {
      console.log(`✅ Found ${startups?.length || 0} startups`);
      if (startups && startups.length > 0) {
        console.log('Sample startup:', JSON.stringify(startups[0], null, 2));
      }
    }
    
    // Test 2: Check profiles table
    console.log('\n2. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} profiles`);
    }
    
    // Test 3: Check auth users
    console.log('\n3. Checking authentication status...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session ? 'Logged in' : 'Not logged in');
    
  } catch (error) {
    console.error('Connection test failed:', error);
  }
}

testConnection();
