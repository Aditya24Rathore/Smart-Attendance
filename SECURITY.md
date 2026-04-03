# Security Guidelines

**🔒 CRITICAL: NEVER commit sensitive credentials to version control!**

## What Should NEVER be Committed

❌ `.env` file with real credentials  
❌ Database passwords or connection strings  
❌ API keys (Firebase, SendGrid, etc.)  
❌ JWT secrets or encryption keys  
❌ Admin passwords  
❌ Private keys of any kind  

## What SHOULD be Committed

✅ `.env.example` - Template with placeholder values only  
✅ `.gitignore` - Ensures sensitive files aren't committed  
✅ Documentation explaining what each variable does  
✅ Public configuration only  

## Setup Process

### 1. Development Environment

```bash
# Copy example file
cp backend/.env.example backend/.env

# Edit with YOUR local values
nano backend/.env
```

Your `.env` file:
```
MONGODB_URI=<copy your connection string from MongoDB Atlas>
JWT_SECRET=<generate a strong 32+ character random key>
QR_ENCRYPTION_KEY=<generate a 32-character hex key>
```
⚠️ **Never show actual connection strings or keys - these are examples only**

### 2. Production Environment

**Use Environment Variables (NOT .env files):**

- Deploy using Docker → Set env vars in container
- Deploy to cloud → Use platform's secret management:
  - Heroku: Config Vars
  - AWS: Secrets Manager
  - Google Cloud: Secret Manager
  - Azure: Key Vault
  - Railway: Environment Variables

**Example (Heroku):**
```bash
heroku config:set MONGODB_URI=<your_mongodb_connection_string>
heroku config:set JWT_SECRET=<your_jwt_secret>
heroku config:set ADMIN_PASSWORD=<your_admin_password>
```
Replace `<...>` with your actual values. Never share these with others.

## If You Accidentally Committed Credentials

### 🚨 IMMEDIATE ACTION REQUIRED:

1. **Change all exposed credentials immediately:**
   ```bash
   # MongoDB: Rotate password in MongoDB Atlas
   # Firebase: Regenerate API keys
   # JWT/Encryption: Generate new secrets
   ```

2. **Remove from Git history:**
   ```bash
   # Option A: Using BFG Repo-Cleaner (Recommended)
   brew install bfg  # or use pre-built jar file
   bfg --delete-files .env

   # Option B: Using git filter-branch
   git filter-branch --tree-filter 'rm -f .env' HEAD
   ```

3. **Force push to remove history:**
   ```bash
   git push origin --force-with-lease
   ```

4. **Verify credentials are rotated and working:**
   - Test database connection
   - Test API functionality
   - Monitor for unauthorized access

## Best Practices

### ✅ DO:

- Use strong, unique passwords (32+ characters)
- Rotate credentials regularly
- Use a password manager (1Password, Bitwarden, LastPass)
- Use different credentials for dev/staging/production
- Enable MongoDB IP whitelist
- Use Firebase security rules
- Enable 2FA on all accounts
- Document the setup process (without credentials)
- Use `.env.example` as a template

### ❌ DON'T:

- Share credentials via email/Slack/Teams
- Hardcode credentials in source code
- Use same credentials for all environments
- Commit `.env` files to git
- Use simple/predictable passwords
- Commit to public repositories with credentials
- Store credentials in comments
- Leave production credentials in local machines

## GitHub Security Alert Response

If GitHub detects exposed secrets:

1. **Check the alert:** GitHub → Settings → Security → Secret scanning
2. **Review what was exposed:** View details from the alert
3. **Rotate all affected credentials IMMEDIATELY**
4. **Remove from repository:** Use steps above (BFG or filter-branch)
5. **Update team:** Notify team about the incident
6. **Monitor logs:** Check for unauthorized access attempts

## Environment Variables Reference

### Development (backend/.env)
```
MONGODB_URI=mongodb://localhost:27017/smart_attendance
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=<generate_local_key>
QR_ENCRYPTION_KEY=<generate_local_key>
OTP_LENGTH=6
OTP_EXPIRY=10
```

### Production (Use platform's secret manager)
```
MONGODB_URI=<production_connection_string>
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=<production_secret_key>
QR_ENCRYPTION_KEY=<production_key>
FIREBASE_API_KEY=<your_firebase_key>
SMTP_HOST=smtp.gmail.com
```
⚠️ **Replace all `<...>` with your actual values. Never show these in logs or documentation.**

## Security Headers

The backend includes:
- ✅ Helmet.js - HTTP security headers
- ✅ Rate limiting - Prevent brute force attacks
- ✅ CORS - Restrict cross-origin requests
- ✅ HTTPS - Recommended for production
- ✅ JWT validation - Token-based auth

## Database Security

### MongoDB Atlas
- ✅ Enable authentication
- ✅ IP whitelist (limit to your servers)
- ✅ Use strong passwords
- ✅ Enable encryption at rest
- ✅ Enable backups
- ✅ Use VPC peering for cloud deployments

### Local MongoDB
- ✅ Enable auth (`--auth` flag)
- ✅ Use strong passwords
- ✅ Don't expose to internet (only localhost)
- ✅ Regular backups

## Security Checklist

Before each deployment:
- [ ] .env file is in .gitignore
- [ ] No credentials in code/comments
- [ ] No .env file in git history
- [ ] All secrets are unique and strong
- [ ] Credentials are rotated (if compromised)
- [ ] HTTPS is enabled
- [ ] Database has SSL/TLS enabled
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Admin password is changed from default
- [ ] Monitoring/alerting is set up
- [ ] Backup strategy is in place

## Incident Response

If security is compromised:

1. **Isolate:** Stop affected services
2. **Assess:** Determine scope of compromise
3. **Notify:** Alert your team immediately
4. **Remediate:** Rotate all credentials
5. **Remove:** Remove from Git history
6. **Review:** Check logs for unauthorized access
7. **Update:** Apply patches/fixes
8. **Restore:** Bring services back online with new credentials
9. **Monitor:** Watch for further suspicious activity
10. **Document:** Record incident for future reference

## Resources

- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [MongoDB Atlas: Security](https://docs.mongodb.com/manual/security/)
- [Helmet.js: Documentation](https://helmetjs.github.io/)

---

**Remember:** Security is everyone's responsibility. When in doubt, err on the side of caution and keep credentials private!

Last Updated: March 21, 2026
