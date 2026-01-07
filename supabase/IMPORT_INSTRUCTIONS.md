# How to Import CSV Data into Supabase

## Products CSV Import

I've created `products.csv` with all 13 products from your menu.

### Step-by-Step Import Instructions:

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://msgsyauarenjcxajjnmq.supabase.co
   - Login to your Supabase account

2. **Open Table Editor**
   - Click on **"Table Editor"** in the left sidebar
   - Select the **"products"** table

3. **Import CSV**
   - Look for the **"Insert"** button at the top
   - Click the **dropdown arrow** next to "Insert"
   - Select **"Import data from CSV"** or **"Import CSV"**

4. **Upload File**
   - Click **"Choose File"** or **"Upload"**
   - Select `supabase/products.csv` from this folder
   - Click **"Import"** or **"Upload"**

5. **Map Columns** (if prompted)
   - Supabase should auto-detect the columns
   - Make sure columns map correctly:
     - `name` → name
     - `category` → category
     - `description` → description
     - `image_url` → image_url
     - `variants` → variants (JSON)
     - `tag` → tag
     - `rating` → rating
     - `active` → active

6. **Import Settings**
   - Make sure **"Skip header row"** is checked (first row is column names)
   - The `variants` column should be recognized as JSON/JSONB
   - Click **"Import"**

7. **Verify Import**
   - After import, you should see 13 products in the table
   - Check a few products to make sure data imported correctly
   - Verify that `variants` column shows JSON data

### Alternative: Manual Import via SQL

If CSV import doesn't work, you can also use SQL:

1. Go to **SQL Editor** in Supabase
2. Copy the INSERT statements from the SQL file (if needed)
3. Or manually insert products one by one using the Table Editor's Insert button

### Troubleshooting

**If variants column shows as text instead of JSON:**
- The variants are stored as JSONB in the database
- Supabase should handle the JSON conversion automatically
- If not, you may need to manually fix the format in the Table Editor

**If import fails:**
- Check that all required fields are present
- Make sure `variants` JSON format is correct (escaped quotes)
- Try importing one row at a time to identify the issue

### After Import

Once products are imported:
1. Refresh your website: http://localhost:8000/shop.html
2. Products should now appear on the shop page!
3. You can test adding items to cart and checkout

## Other Tables

Currently, only products need initial data. Other tables (orders, addresses, profiles) will be populated automatically as users interact with the website:
- **profiles** - Created automatically when users sign up
- **addresses** - Added by users in their profile
- **orders** - Created when customers place orders
- **order_items** - Created with each order

No need to import data for these tables!
