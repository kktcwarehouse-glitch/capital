# Troubleshooting Featured Companies Not Applying

## Common Issues and Solutions

### 1. Database Migration Not Run
**Problem:** The `is_featured` column doesn't exist in the database.

**Solution:** Run the migration in Supabase:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/migrations/20251127000000_add_admin_support.sql`
3. Run the SQL script

**Or use Supabase CLI:**
```bash
supabase migration up
```

### 2. Check if Column Exists
Run this SQL in Supabase to verify:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'startup_profiles' 
AND column_name = 'is_featured';
```

### 3. Check Current Featured Status
Run this SQL to see which companies are featured:
```sql
SELECT id, company_name, is_featured 
FROM startup_profiles 
ORDER BY created_at DESC;
```

### 4. Manual Update (For Testing)
If the toggle isn't working, you can manually set featured status:
```sql
-- Make a company featured
UPDATE startup_profiles 
SET is_featured = true 
WHERE id = 'YOUR_STARTUP_ID';

-- Remove featured status
UPDATE startup_profiles 
SET is_featured = false 
WHERE id = 'YOUR_STARTUP_ID';
```

### 5. Check Console Logs
The app now logs detailed information:
- When you toggle featured: Check browser/React Native console
- Look for: "Updating startup..." and "Successfully updated..."
- If you see errors, they will show the exact problem

### 6. Verify RLS Policies
Make sure admin users can update the `is_featured` field. The migration should have added this, but verify:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'startup_profiles' 
AND policyname LIKE '%admin%';
```

### 7. Refresh the App
After running the migration:
1. Close and restart the app
2. Log out and log back in
3. Try toggling featured status again

## Testing Steps

1. **Check Migration Status:**
   - Verify `is_featured` column exists
   - Verify admin policies are in place

2. **Test in Admin Dashboard:**
   - Click the star icon to toggle featured
   - Check console for success/error messages
   - Verify the star icon changes (filled = featured, empty = not featured)

3. **Verify on Investor Page:**
   - Go to Discover/Investor page
   - Featured companies should have:
     - Gold border (2px)
     - Gold shadow/glow
     - "Featured" badge with star icon

4. **Check Database:**
   - Query the database to confirm `is_featured = true`
   - Refresh the app to see if it displays

## Still Not Working?

If none of the above works:
1. Check the browser/React Native console for error messages
2. Verify you're logged in as an admin user
3. Check Supabase logs for any RLS policy violations
4. Ensure the migration completed successfully without errors

