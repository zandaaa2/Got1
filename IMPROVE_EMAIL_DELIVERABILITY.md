# Improve Email Deliverability - Prevent Spam

If your emails are going to spam, follow these steps to improve deliverability:

## 1. Verify Your Domain in Resend (CRITICAL)

This is the most important step:

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain: `got1.app`
4. Resend will provide DNS records to add:
   - **SPF Record** - Authenticates your domain
   - **DKIM Record** - Signs your emails cryptographically
   - **DMARC Record** - Policy for handling failed authentication

5. Add these records to your domain's DNS (wherever you manage DNS for got1.app)
6. Wait for verification (can take up to 48 hours, usually much faster)
7. Once verified, update `RESEND_FROM_EMAIL` to use your domain:
   ```
   RESEND_FROM_EMAIL=noreply@got1.app
   ```

## 2. Update Environment Variables

After domain verification, update your `.env.local`:

```env
RESEND_FROM_EMAIL=noreply@got1.app  # Use your verified domain
RESEND_REPLY_TO=zander@got1.app     # Where replies should go
```

## 3. Email Best Practices

The code has been updated to include:
- ✅ Proper `Reply-To` headers
- ✅ Better email formatting
- ✅ Avoid spam trigger words
- ✅ Proper HTML structure

## 4. Test Email Deliverability

1. Send a test email
2. Check if it lands in inbox or spam
3. Use tools like:
   - [Mail Tester](https://www.mail-tester.com/) - Send an email to their address and get a spam score
   - [MXToolbox](https://mxtoolbox.com/) - Check your domain's SPF/DKIM records

## 5. Additional Tips

### For Gmail Recipients:
- Ask recipients to mark your emails as "Not Spam"
- Add your email to their contacts
- Gmail learns from user behavior

### For Other Providers:
- Ensure your domain has a good reputation
- Don't send too many emails too quickly
- Use consistent "from" addresses

## 6. Monitor Email Delivery

Check Resend dashboard:
- Go to [Resend Emails](https://resend.com/emails)
- See delivery status for each email
- Check bounce rates and spam complaints

## Quick Checklist

- [ ] Domain verified in Resend
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS (optional but recommended)
- [ ] `RESEND_FROM_EMAIL` updated to use verified domain
- [ ] Test email sent and checked
- [ ] Email lands in inbox (not spam)

## Common Issues

### "Domain not verified"
- Make sure DNS records are correctly added
- Wait for DNS propagation (can take up to 48 hours)
- Check Resend dashboard for verification status

### "SPF record invalid"
- Ensure SPF record includes Resend's servers
- Format: `v=spf1 include:resend.com ~all`

### "Emails still going to spam after verification"
- Check spam score using Mail Tester
- Ensure you're not using spam trigger words
- Ask recipients to mark as "Not Spam"
- Consider using a subdomain for transactional emails (e.g., `mail.got1.app`)

