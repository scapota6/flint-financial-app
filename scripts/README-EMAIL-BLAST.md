# Email Blast Script

Send personalized waitlist launch emails to your contacts.

## What It Does

- Reads contacts from CSV file
- Personalizes each email with recipient's first name
- Sends via Resend with proper branding
- Uses reply-to: support@flint-investing.com
- Includes safety features: preview, confirmation, rate limiting

## Email Template

**Subject:** youre off the waitlist - Flint

**Content:**
- Personalized greeting with first name
- "Flint is live! 🎉" announcement
- Thank you message for early support
- Link to https://www.flint-investing.com/
- Support contact in footer

## How to Run

### 1. Check the CSV file
Make sure `attached_assets/apollo-contacts-export_1760916491011.csv` exists with columns:
- `First Name`
- `Email`

### 2. Run the script
```bash
tsx scripts/email-blast.ts
```

### 3. Review the preview
The script will show:
- Total number of contacts
- Email preview
- Full recipient list

### 4. Confirm sending
Type `yes` to send, anything else to cancel

## Safety Features

- **Preview before sending**: See exactly what will be sent
- **Confirmation required**: Must type "yes" to proceed
- **Rate limiting**: 500ms delay between emails to avoid API limits
- **Progress tracking**: Real-time status for each email
- **Error logging**: Failed emails are tracked and reported
- **Summary report**: Final count of sent vs failed emails

## CSV Format

The script expects these columns:
- `First Name` - Used for personalization (e.g., "Craig", "Jack", "David")
- `Email` - Recipient email address

Other columns in the CSV are ignored.

## Notes

- Emails are sent from: `Flint Support <updates@updates.flint-investing.com>`
- Replies go to: `support@flint-investing.com`
- Rate limit: ~120 emails per minute (with 500ms delay)
- For 27 contacts, the full blast takes ~15 seconds

## Example Output

```
🚀 Flint Waitlist Email Blast

📋 Found 27 contacts

📧 Email Preview:
---
Subject: youre off the waitlist - Flint
From: Flint Support <updates@updates.flint-investing.com>
Reply-To: support@flint-investing.com
---
Sample email body for first contact:
Craig,

We're excited to finally share this Flint is live! 🎉
...

👥 Recipients:
  1. Craig <grants@craignewmarkphilanthropies.org>
  2. Jack <fareed.raja@jwmi.com>
  ...

⚠️  Are you sure you want to send 27 emails? (yes/no): yes

📨 Sending emails...

[1/27] Sending to Craig <grants@...>... ✅ Sent
[2/27] Sending to Jack <fareed...>... ✅ Sent
...

📊 Summary:
  ✅ Sent: 27
  ❌ Failed: 0

✨ Email blast complete!
```
