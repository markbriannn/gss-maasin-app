# PayMongo Live Mode - Production Payment Integration

## Status: ✅ LIVE MODE ENABLED

Your GSS Maasin app is now configured to accept **REAL PAYMENTS** through PayMongo.

---

## What Changed

### API Keys Updated (Test → Live)

**Mobile App (`.env`):**
```env
# OLD (Test Mode)
PAYMONGO_PUBLIC_KEY=pk_test_XXXXXXXXXXXXXXXXXXXX

# NEW (Live Mode)
PAYMONGO_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXXXXXX
```

**Web App (`web/.env.local`):**
```env
# OLD (Test Mode)
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_XXXXXXXXXXXXXXXXXXXX

# NEW (Live Mode)
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXXXXXX
```

**Backend (`backend/.env`):**
```env
# OLD (Test Mode)
PAYMONGO_PUBLIC_KEY=pk_test_XXXXXXXXXXXXXXXXXXXX
PAYMONGO_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXX

# NEW (Live Mode)
PAYMONGO_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXXXXXX
PAYMONGO_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXX
```

---

## ⚠️ IMPORTANT: What This Means

### Real Money Transactions
- 💰 All payments will charge **REAL MONEY** from customers
- 💳 GCash and Maya payments will deduct from actual accounts
- 🏦 Money will be deposited to your registered bank account
- 📊 Transaction fees will be charged (2.9% + ₱15 per transaction)

### Settlement Schedule
- Payments are settled to your bank account **T+3 business days**
- Example: Payment on Monday → Money in bank by Thursday
- Weekends and holidays don't count as business days

### Transaction Fees (Deducted Automatically)
- **GCash**: 2.9% + ₱15 per transaction
- **Maya**: 2.9% + ₱15 per transaction
- **Cards**: 3.5% + ₱15 per transaction (if enabled)

### Example Calculation
```
Client pays: ₱1,000
PayMongo fee: (₱1,000 × 2.9%) + ₱15 = ₱44
You receive: ₱956
```

---

## 🚨 Critical Reminders

### Before Deploying to Production

1. **Test with Small Amounts First**
   - Use your own GCash/Maya account
   - Make test transactions of ₱10-50
   - Verify the full payment flow works
   - Check if money arrives in your bank account

2. **Update Your Backend on Render**
   - Go to https://dashboard.render.com
   - Find your backend service
   - Update environment variables with live keys from PayMongo dashboard
   - Restart the service

3. **Rebuild Mobile App**
   - The `.env` file is bundled during build
   - You need to rebuild the app with new keys
   - For Android: `cd android && ./gradlew clean && cd .. && npx react-native run-android`
   - For iOS: `cd ios && pod install && cd .. && npx react-native run-ios`

4. **Redeploy Web App on Vercel**
   - Go to https://vercel.com/dashboard
   - Find your project
   - Go to Settings → Environment Variables
   - Update with your live public key from PayMongo dashboard
   - Redeploy the app

---

## Testing Checklist

### Before Going Live
- [ ] Test payment with your own GCash account (₱10-50)
- [ ] Test payment with your own Maya account (₱10-50)
- [ ] Verify payment success page works
- [ ] Verify payment failed page works
- [ ] Check if booking is created correctly
- [ ] Verify SMS/Email notifications are sent
- [ ] Test refund process (if applicable)
- [ ] Check if money arrives in your bank account (T+3 days)

### After Going Live
- [ ] Monitor first few transactions closely
- [ ] Check PayMongo dashboard for transaction status
- [ ] Verify settlements are arriving on schedule
- [ ] Have customer support ready for payment issues
- [ ] Keep test keys for development/debugging

---

## Monitoring & Support

### PayMongo Dashboard
- **URL**: https://dashboard.paymongo.com
- **Check**: Transactions, settlements, disputes, refunds
- **Reports**: Download transaction reports for accounting

### Transaction Statuses
- **Pending**: Payment initiated, waiting for customer
- **Paid**: Payment successful, money secured
- **Failed**: Payment failed, no charge
- **Refunded**: Money returned to customer

### Getting Help
- **PayMongo Support**: support@paymongo.com
- **Documentation**: https://developers.paymongo.com
- **Status Page**: https://status.paymongo.com

---

## Rollback Plan (If Needed)

If you need to switch back to test mode:

1. **Update Environment Variables**
   ```env
   # Mobile & Web
   PAYMONGO_PUBLIC_KEY=pk_test_XXXXXXXXXXXXXXXXXXXX
   
   # Backend
   PAYMONGO_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXX
   ```

2. **Redeploy All Services**
   - Backend on Render
   - Web on Vercel
   - Rebuild mobile apps

3. **Notify Users**
   - If in production, inform users about maintenance
   - Disable payment features temporarily if needed

---

## Security Best Practices

### Protect Your Secret Key
- ✅ Never commit secret keys to Git (already in .gitignore)
- ✅ Never expose secret keys in frontend code
- ✅ Only use secret keys in backend/server-side code
- ✅ Rotate keys if compromised

### Monitor for Fraud
- Watch for unusual transaction patterns
- Set up alerts in PayMongo dashboard
- Review disputes and chargebacks promptly
- Keep transaction records for at least 1 year

---

## Financial Tracking

### Recommended Tools
- **Accounting Software**: QuickBooks, Xero, or Wave
- **Spreadsheet**: Track daily transactions and settlements
- **Bank Reconciliation**: Match PayMongo settlements with bank deposits

### Tax Compliance
- Keep records of all transactions
- Report income from PayMongo settlements
- Consult with an accountant for tax obligations
- Issue official receipts to customers if required

---

## Support & Troubleshooting

### Common Issues

**Payment Stuck on "Processing"**
- Check PayMongo dashboard for transaction status
- Verify webhook is configured correctly
- Check backend logs for errors

**Settlement Not Received**
- Verify bank account details in PayMongo dashboard
- Check if T+3 business days have passed
- Contact PayMongo support if delayed

**Refund Not Processing**
- Refunds take 5-10 business days
- Check PayMongo dashboard for refund status
- Ensure sufficient balance for refund

---

## Next Steps

1. ✅ **Test Thoroughly**: Make small test transactions
2. ✅ **Update Backend**: Deploy new keys to Render
3. ✅ **Update Web**: Deploy new keys to Vercel
4. ✅ **Rebuild Apps**: Build mobile apps with new keys
5. ✅ **Monitor**: Watch first transactions closely
6. ✅ **Support**: Be ready to help customers with payment issues

---

## Files Updated

- `.env` - Mobile app environment variables
- `web/.env.local` - Web app environment variables
- `backend/.env` - Backend server environment variables

---

## Commit Information

**Commit Message**: "Switch to PayMongo live mode for production payments"

**Date**: February 16, 2026

**Status**: Ready for production deployment

---

## Emergency Contacts

- **PayMongo Support**: support@paymongo.com
- **PayMongo Phone**: +63 2 8667 8265
- **Emergency**: Switch back to test mode immediately if issues arise

---

**Remember**: You're now handling real money. Test thoroughly, monitor closely, and provide excellent customer support! 🚀💰
