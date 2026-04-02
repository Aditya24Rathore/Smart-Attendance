# MongoDB Atlas Connection Verification

## 🔍 CHECK YOUR MONGODB NETWORK ACCESS

This is the most common reason for connection failures.

### Step 1: Go to MongoDB Atlas Network Access
1. Login to https://cloud.mongodb.com
2. From left sidebar, click **Network Access** (or **Security** → **Network Access**)
3. You should see a list of IP addresses/ranges

### Step 2: Check IP Whitelist
Look for entries like:
- `0.0.0.0/0` → ✅ **Allows ALL IP addresses** (good for testing)
- Your specific IP → ✅ **Good but limiting**
- A range like `192.168.0.0/16` → ⚠️ May not include Render

### Step 3: For Render Deployment
Since Render uses dynamic IPs, you should have:
- **`0.0.0.0/0`** (Allow access from anywhere)
- OR add Render's IPs manually (complex, not recommended)

### Step 4: If You Don't See 0.0.0.0/0
1. Click **+ ADD IP ADDRESS** button
2. Click **ALLOW ACCESS FROM ANYWHERE**
3. Confirm - this adds `0.0.0.0/0` rule

---

## 🔐 Security Note
Using `0.0.0.0/0` is OK for development/testing with strong credentials. For production, use:
- VPC Peering
- Or add specific IP ranges

---

## Test Connection Locally
Once you verify network access, test with your local backend:

```bash
cd backend
npm start
```

You should see:
```
✓ MongoDB Connected Successfully
```

If you see this locally, then the issue is Render's MONGODB_URI variable.

---

## Common MongoDB Connection Issues

| Issue | Solution |
|-------|----------|
| SyntaxError | Check MONGODB_URI format (should have `@` separator) |
| Connection timeout | Check Network Access IP whitelist |
| Authentication failed | Check username/password in URI |
| Database not found | Add `/smart_attendance` to URI path |
| Connection refused | Cluster might be paused |

---

## Your Connection String Should Be:
```
mongodb+srv://rathoreaditya262_db_user:Aditya24Mongo@cluster0.3hx30wj.mongodb.net/smart_attendance?retryWrites=true&w=majority&appName=Cluster0
```

Breaking it down:
- `mongodb+srv://` - Protocol
- `rathoreaditya262_db_user:Aditya24Mongo` - Username:Password
- `@` - Separator
- `cluster0.3hx30wj.mongodb.net` - Host
- `/smart_attendance` - Database name
- `?retryWrites=true&w=majority&appName=Cluster0` - Options
