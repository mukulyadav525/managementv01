# 🚀 Complete Setup Guide - Society Management System

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Local Development Setup](#local-development-setup)
4. [Database Initialization](#database-initialization)
5. [Testing the Application](#testing-the-application)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- ✅ **npm** (comes with Node.js) or **yarn**
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **GitHub Account**
- ✅ **Code Editor** (VS Code recommended)
- ✅ **Firebase CLI** (we'll install this)

---

## Supabase Project Setup

### Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Enter project name: `society-management`
4. Set a strong database password
5. Choose a region closest to your users
6. Click **"Create new project"**

### Step 2: Get API Keys

1. From the project dashboard, click **"Settings"** (gear icon)
2. Click **"API"**
3. Copy the **Project URL** and the **`anon` public API key**

### Step 3: Local Development Setup

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Open `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Step 4: Database Setup (SQL Editor)

Instead of manual collection creation, use the SQL scripts provided in `supabase/migrations/`. 

1. Go to the **SQL Editor** in the Supabase sidebar.
2. Click **"New Query"**.
3. Paste and run the scripts from the migrations folder in order to set up:
   - Users table & RLS
   - Societies & Flats
   - Complaints, Payments, Visitors
   - Storage Buckets & Policies

---

## Database Initialization

### Option 1: Manual Setup (Recommended for Learning)

1. Go to Firebase Console > Firestore Database
2. Click **"Start collection"**

#### Create Society

```
Collection ID: societies
Document ID: society_1

Fields:
name: "Sunshine Apartments"
address: {
  street: "123 Main Street",
  area: "Downtown",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001"
}
totalFlats: 120
totalBuildings: 4
contactEmail: "admin@sunshine.com"
contactPhone: "+91 9876543210"
amenities: ["Gym", "Swimming Pool", "Clubhouse", "Parking"]
settings: {
  maintenanceDay: 5,
  latePaymentPenalty: 50,
  visitorApprovalRequired: true
}
createdAt: [Click "Current timestamp"]
updatedAt: [Click "Current timestamp"]
```

#### Create Admin User

1. First, register via the app at `/login` > Register
2. Or use Supabase Dashboard > Authentication > Users
   - Email: admin@sunshine.com
   - Password: Admin@123

3. After user creation, add user document:

```
Collection: users
Document ID: [Use the UID from Authentication]

Fields:
uid: "[Same as document ID]"
email: "admin@sunshine.com"
name: "Admin User"
phone: "+91 9876543210"
role: "admin"
societyId: "society_1"
flatIds: []
status: "active"
createdAt: [Current timestamp]
updatedAt: [Current timestamp]
```

#### Create Sample Flats

```
Collection: societies/society_1/flats
Document ID: flat_a101

Fields:
buildingId: "A"
flatNumber: "A-101"
floor: 1
bhkType: "2BHK"
area: 1200
ownerId: ""
currentTenantId: ""
occupancyStatus: "vacant"
parkingSlots: ["A-P1"]
createdAt: [Current timestamp]
updatedAt: [Current timestamp]
```

Create more flats by duplicating and changing values.

### Option 2: Seed Script (Advanced)

Create `scripts/seed.js`:

```javascript
// Use Supabase client for scripting
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
  // Add seed data here
  await db.collection('societies').doc('society_1').set({
    name: 'Sunshine Apartments',
    // ... rest of fields
  });
}

seed().then(() => {
  console.log('Database seeded!');
  process.exit(0);
});
```

---

## Testing the Application

### Step 1: Start Development Server

```bash
npm run dev
```

The app will run on `http://localhost:3000`

### Step 2: Test Login

1. Go to `http://localhost:3000/login`
2. Use credentials:
   - Email: admin@sunshine.com
   - Password: Admin@123

### Step 3: Test Features

✅ **Dashboard**: Should show stats
✅ **Visitors**: Add a visitor entry
✅ **Payments**: View payment records
✅ **Complaints**: Create a complaint

### Common Test Scenarios

1. **Add Visitor**:
   - Go to Visitors page
   - Click "Add Visitor"
   - Fill form and submit

2. **Make Payment**:
   - Go to Payments page
   - Click "Pay Now" on pending payment
   - Complete payment flow

3. **Raise Complaint**:
   - Go to Complaints page
   - Click "New Complaint"
   - Fill form with images
   - Submit

---

## Deployment

### Step 1: Build for Production

```bash
npm run build
```

This creates optimized files in `dist/` folder.

### Step 2: Test Production Build Locally

```bash
npm run preview
```

### Step 3: Deployment

Deploy your application to Vercel or Netlify.

### Step 4: Custom Domain (Optional)

1. Go to your hosting provider's dashboard.
2. Follow their "Custom Domain" setup.
3. Follow verification steps
4. Add DNS records to your domain provider

---

## Troubleshooting

### Issue: API Config Error

**Error**: "Invalid API key" or connection failure

**Solution**: 
- Verify Supabase config in `.env` or Vercel Environment Variables.
- Ensure all values are correct.
- Check for extra spaces or quotes.

### Issue: Permission Denied

**Error**: "Missing or insufficient permissions"

**Solution**:
- Run the migration scripts in the SQL Editor.
- Check user document has correct `societyId`.
- Verify user role is set correctly.

### Issue: Images Not Uploading

**Error**: Storage upload fails

**Solution**:
- Ensure storage buckets are created in Supabase.
- Check RLS policies for storage buckets.
- Verify file size is under 5MB

### Issue: Build Fails

**Error**: TypeScript errors

**Solution**:
```bash
# Clear cache
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Try build again
npm run build
```

### Issue: Development Server Not Starting

**Solution**:
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process or use different port
# Edit vite.config.ts to change port
```

---

## Next Steps

After successful setup:

1. ✅ Create more user accounts with different roles
2. ✅ Add more flats and buildings
3. ✅ Test all modules thoroughly
4. ✅ Customize branding and colors
5. ✅ Set up automated backups
6. ✅ Configure email notifications
7. ✅ Integrate payment gateway
8. ✅ Add more features as needed

---

## Support & Resources

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 📚 [React Documentation](https://react.dev)
- 📚 [Tailwind CSS Docs](https://tailwindcss.com/docs)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Community Forum](https://your-forum-link)

---

**Need Help?** Contact: support@societymanager.com

---

## Checklist

Use this checklist to track your setup:

- [ ] Node.js installed
- [ ] Database backups configured
- [ ] Deployed to Vercel/Netlify

🎉 **Congratulations!** Your Society Management System is ready!
