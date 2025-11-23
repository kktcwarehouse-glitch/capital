const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tbekvfpetwhjsjscwvkl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZWt2ZnBldHdoanNqc2N3dmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDU3MDAsImV4cCI6MjA3ODYyMTcwMH0.7nKdq2MvAugKwV7htYqVk-7L2sBzipfCISY3R3Y-4D4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sample startups data
const sampleStartups = [
  {
    company_name: 'TechFlow AI',
    sector: 'AI/ML',
    location: 'San Francisco, CA',
    stage: 'Seed',
    funding_goal: 500000,
    description: 'AI-powered workflow automation platform helping businesses streamline their operations with intelligent process optimization.',
    website: 'https://techflow.ai',
    team_size: 8,
    founded_year: 2023
  },
  {
    company_name: 'HealthBridge',
    sector: 'HealthTech',
    location: 'Boston, MA',
    stage: 'Pre-seed',
    funding_goal: 250000,
    description: 'Connecting patients with healthcare providers through an innovative telemedicine platform with AI-driven diagnostics.',
    website: 'https://healthbridge.com',
    team_size: 5,
    founded_year: 2024
  },
  {
    company_name: 'EduSpark',
    sector: 'EdTech',
    location: 'Austin, TX',
    stage: 'Seed',
    funding_goal: 750000,
    description: 'Personalized learning platform using adaptive AI to create custom educational experiences for students of all ages.',
    website: 'https://eduspark.io',
    team_size: 12,
    founded_year: 2022
  },
  {
    company_name: 'GreenCharge',
    sector: 'FinTech',
    location: 'New York, NY',
    stage: 'Series A',
    funding_goal: 2000000,
    description: 'Sustainable investment platform helping users invest in green energy projects with transparent ESG metrics.',
    website: 'https://greencharge.app',
    team_size: 25,
    founded_year: 2021
  },
  {
    company_name: 'CloudCart',
    sector: 'E-commerce',
    location: 'Seattle, WA',
    stage: 'Seed',
    funding_goal: 1000000,
    description: 'Next-generation e-commerce platform with integrated inventory management and AI-powered marketing tools.',
    website: 'https://cloudcart.shop',
    team_size: 15,
    founded_year: 2023
  },
  {
    company_name: 'DataShield Pro',
    sector: 'SaaS',
    location: 'Denver, CO',
    stage: 'Pre-seed',
    funding_goal: 300000,
    description: 'Enterprise-grade data security and compliance platform for small and medium businesses.',
    website: 'https://datashield.pro',
    team_size: 6,
    founded_year: 2024
  },
  {
    company_name: 'CryptoLink',
    sector: 'Blockchain',
    location: 'Miami, FL',
    stage: 'Seed',
    funding_goal: 1500000,
    description: 'Decentralized payment gateway enabling seamless crypto transactions for online businesses.',
    website: 'https://cryptolink.io',
    team_size: 10,
    founded_year: 2022
  },
  {
    company_name: 'FitTrack Pro',
    sector: 'HealthTech',
    location: 'Los Angeles, CA',
    stage: 'Seed',
    funding_goal: 800000,
    description: 'Advanced fitness tracking with AI-powered coaching and personalized workout recommendations.',
    website: 'https://fittrackpro.com',
    team_size: 9,
    founded_year: 2023
  }
];

async function seedDatabase() {
  console.log('Starting database seeding...\n');
  
  try {
    // First, create dummy user profiles for each startup
    console.log('Step 1: Creating user profiles...');
    
    // Since we can't create auth users directly with anon key, 
    // we'll need to use the service role key or create them through signup
    // For now, let's create startup profiles without user_id (we'll need to adjust this)
    
    console.log('\nNote: This script requires admin access to create users.');
    console.log('Instead, you should:');
    console.log('1. Sign up as a startup user in the app');
    console.log('2. Complete the startup profile setup');
    console.log('3. Repeat for multiple startup accounts\n');
    console.log('Or, run this SQL in Supabase dashboard:\n');
    
    // Generate SQL for manual execution
    console.log('-- Run this SQL in Supabase SQL Editor:');
    console.log('-- First, you need to create auth users and profiles, then run:\n');
    
    sampleStartups.forEach((startup, index) => {
      const userId = `00000000-0000-0000-0000-0000000000${String(index + 1).padStart(2, '0')}`;
      console.log(`
-- User ${index + 1}
INSERT INTO profiles (id, email, role, created_at, updated_at)
VALUES ('${userId}', 'startup${index + 1}@example.com', 'startup', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO startup_profiles (user_id, company_name, sector, location, stage, funding_goal, description, website, team_size, founded_year)
VALUES (
  '${userId}',
  '${startup.company_name}',
  '${startup.sector}',
  '${startup.location}',
  '${startup.stage}',
  ${startup.funding_goal},
  '${startup.description}',
  '${startup.website}',
  ${startup.team_size},
  ${startup.founded_year}
) ON CONFLICT (user_id) DO NOTHING;
`);
    });
    
    console.log('\n✅ SQL script generated! Copy the above SQL and run it in Supabase SQL Editor.');
    console.log('\nAlternatively, you can use the Supabase Dashboard:');
    console.log('1. Go to Authentication -> Users');
    console.log('2. Create test users');
    console.log('3. Sign in with those users and create startup profiles');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

seedDatabase();
