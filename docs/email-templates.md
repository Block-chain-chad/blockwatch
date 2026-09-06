# Supabase auth email templates

Paste each into Supabase dashboard → Authentication → Emails. The links go
DIRECTLY to blockwatch.app carrying a one-time token (`{{ .TokenHash }}`);
the old `{{ .ConfirmationURL }}` bounced through Supabase's server, and iOS
refuses to open the app on a redirect. Site URL must remain
`https://blockwatch.app`.

## 1. Confirm signup — subject: `Confirm your OnStock account`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td style="font-size:18px;font-weight:700;color:#18181b;padding-bottom:8px;">OnStock</td></tr>
      <tr><td style="font-size:15px;color:#3f3f46;line-height:1.6;padding-bottom:20px;">
        Tap the button to confirm your account. If you're on your phone, the OnStock app opens with you signed in.
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup"
           style="display:inline-block;background:#2dd4bf;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:12px;">
          Confirm my account
        </a>
      </td></tr>
      <tr><td style="font-size:12px;color:#a1a1aa;line-height:1.6;">
        This link is single-use and expires in 24 hours. If you didn't create an OnStock account, ignore this email — nothing happens without this confirmation.
      </td></tr>
    </table>
  </td></tr>
</table>
```

## 2. Magic link — subject: `Your OnStock sign-in link`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td style="font-size:18px;font-weight:700;color:#18181b;padding-bottom:8px;">OnStock</td></tr>
      <tr><td style="font-size:15px;color:#3f3f46;line-height:1.6;padding-bottom:20px;">
        Tap the button to sign in — no password needed. On your phone, the OnStock app opens directly.
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink"
           style="display:inline-block;background:#2dd4bf;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:12px;">
          Sign in to OnStock
        </a>
      </td></tr>
      <tr><td style="font-size:12px;color:#a1a1aa;line-height:1.6;">
        This link is single-use and expires in one hour. If you didn't request it, ignore this email — your account is untouched.
      </td></tr>
    </table>
  </td></tr>
</table>
```

## 3. Reset password — subject: `Reset your OnStock password`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td style="font-size:18px;font-weight:700;color:#18181b;padding-bottom:8px;">OnStock</td></tr>
      <tr><td style="font-size:15px;color:#3f3f46;line-height:1.6;padding-bottom:20px;">
        Tap the button and you'll be asked to set a new password. On your phone, this opens the OnStock app.
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
           style="display:inline-block;background:#2dd4bf;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:12px;">
          Set a new password
        </a>
      </td></tr>
      <tr><td style="font-size:12px;color:#a1a1aa;line-height:1.6;">
        This link is single-use and expires in one hour. If you didn't request it, you can safely ignore this email — your password is unchanged.
      </td></tr>
    </table>
  </td></tr>
</table>
```
