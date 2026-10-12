# TradingView teardown 13/13 — Account settings, notifications, desktop/mobile apps, community profile, first-run

Date: 2026-09-06. Scope: everything a TradingView user touches **outside the chart itself** — the profile/settings pages, the notification preferences and the notification surfaces, the Desktop app vs the web version, mobile-app parity, the community/social profile, and what a brand-new user meets on a first visit (defaults, hints, free-plan ads). Chart-internal settings, alerts *conditions*, layouts, screeners, the Trading Panel's order tickets and plan tables are in their own teardown files (02, 07, 06, 10, 12, 08) and are only cross-referenced here.

Method note. The session's web-search budget was exhausted before this surface started, so discovery was done by (a) walking TradingView's own Help Center category → folder → article tree once one folder URL was found, (b) TradingView's blog search (`tradingview.com/blog/en/?s=`), and (c) Yahoo search restricted to `site:tradingview.com/support` as an index. Every claim below is from a page that was actually read; the URL list at the end is the complete set. Where a Help Center article only shows the answer in a screenshot (several do), the text says **could not verify** rather than guessing the toggle names.

Vocabulary. TradingView calls the settings area **"Settings and billing"** (the newer articles) or **"profile settings"** (the older ones); both refer to the same page, `tradingview.com/settings/`, whose sections are addressed by hash anchors (`#account-settings`, `#public-profile`, `#social-notifications`, `#active-sessions`). The plans are **Basic** (free), **Essential**, **Plus**, **Premium**, **Ultimate**; several Help Center articles also name an **Expert** plan between Premium and Ultimate that the pricing page fetch did not list — treat Expert as "could not verify on the pricing page".

---

## 1. The settings page — map of sections

Every section name below appears verbatim in at least one Help Center article, blog post or the Privacy Policy. The page is reached from the avatar in the top-left of Supercharts (the "user menu") → "Settings and billing". Anonymous visitors do not have it.

| Section / anchor (verbatim) | What lives there | Source |
|---|---|---|
| **Account settings** (`/settings/#account-settings`) | Change **email**, change **password**, set email+password for a social-login account, **"Linked external accounts"** (unlink Google/Apple/etc.), **2-factor authentication** ("Enable" / "Disable" per method), phone number, **"Delete account"** button | change-password, change-email, log-in-with-email, configure-2FA, delete-account articles |
| **Public profile** (`/settings/#public-profile`) | **Username** (max two changes ever), avatar, **Signature**, **Website**, social-media link fields (X, YouTube, Facebook, Instagram — plan-gated), status field | change-username, links-to-social-media, signature articles |
| **Privacy and Security** tab | **"Turn off the ability to create new private chats with you"**, the **Ignored Users** list, and (per the 2FA article) the entry point to enable 2FA | blog "Privacy settings"; configure-2FA article |
| **Active sessions** (`/settings/#active-sessions`; older article calls it the **Sessions** tab) | Device, time and location of every session; **"Log Out"** per row; **"Log out everywhere"** (older wording: **"Terminate all Sessions"**) | track-the-device article; blog "Session History" |
| **Social notifications** (`/settings/#social-notifications`) | On/off for the site + email notifications about followers, likes, comments, new ideas from people you follow (individual toggle labels: **could not verify** — the article only shows a screenshot) | manage-site-notifications article; Privacy Policy |
| **Alerts delivery** | **"Add email"** — an alternative email for alert notifications, verified by a 6-digit **"Verification code"** | alternative-email article |
| **Subscriptions** (under **Billing**) | Current plan, **"Cancel trial"**, and the **"Real-time market data"** block with an **"Explore now"** button | purchase-market-data, cancel-trial articles |
| **Subscriber status** | **"Update"** button to switch professional / non-professional (drives exchange-data pricing) | subscriber-status articles |
| **Billing history page** | Invoices; the support article tells billing complaints to check it first | how-to-get-help article |
| **Refer a friend** (in the profile menu; also `tradingview.com/share-your-love/`) | Invited count, upgraded count, reward earned, **"Stats & history"** tab | referral articles |
| **Coins** menu → **"Redeem"** tab / **"Get Coins"** tab | Spend TradingView Coins on a plan renewal/upgrade | blog "Improved TradingView Coins spending system" |
| Cookies Policy link (Desktop app **Settings** only) | Added in Desktop 3.2.0 | Desktop release notes |

Not found as a dedicated settings section (i.e. **could not verify** they exist as pages): a "Connected brokers" page (brokers are connected from the chart's Trading Panel, section 7), a "Language" page (language is a user-menu switch, section 5), a "Timezone" page (timezone is per chart, section 5).

---

## 2. Account settings — the individual controls

| Control (verbatim where TradingView names it) | Path | Behaviour and rules | Source |
|---|---|---|---|
| Change **email** | profile settings → **Account settings** tab | Change of the login email; the article shows the field only in a screenshot (verification-step wording **could not verify**) | change-email |
| Change **password** | profile settings → **Account settings** tab | Also recommended as the first step if a linked social account is compromised | change-password; log-in-with-email |
| Set a password on a social-login account | **Account settings** → "set an email and password", then remove the network in **"Linked external accounts"** | Lets a Google/Apple/… user sign in with email+password instead | log-in-with-email |
| Social sign-in providers | Sign-in dialog | **"Facebook, X (formerly Twitter), Google, Yahoo!, LinkedIn, Apple"** | Privacy Policy |
| **Username** | **Settings and billing → Public profile** | **Max two changes per account** (the House-rules page says "can be changed only once afterwards" — the two pages disagree; the profile-settings article is the newer wording). Must be free, may not contain "admin", "moderator" or "tradingview", English letters/digits/underscore/hyphen only, must obey House Rules | change-username; creating-your-account |
| Avatar | Public profile | Prohibited: discriminatory, overly political, impersonation, anything that "Suggests you are a moderator, TradingView employee or employed by a broker or exchange", "Contains a website, email address or contact information", adult content, poor taste. Violation → blocked from all social features until removed | creating-your-account |
| Phone number | Account settings | Used for **SMS verification during the trial** and for SMS 2FA; a number can be on **one account only** ("My phone number is in use inside another account"); verification also offered via **WhatsApp** | SMS-not-arriving; phone-number-in-use; configure-2FA |
| **2-factor authentication** | **Privacy and Security** tab → Account Settings → **"Enable"** | Methods: **authenticator app** (Google Authenticator, Microsoft Authenticator, Duo Mobile, Authy — recommended) or **SMS** (less reliable). Social-login users must set a password first. Backup codes are generated once; **"I saved the codes"** confirms. **"Disable"** next to the method turns it off. Changing phones = reconfigure. Backup codes are "the only way to regain access" if the device is lost | configure-2FA; blog 2FA |
| **Active sessions** | `/settings/#active-sessions` | Shows device, time, location. **"Log Out"** per session; **"Log out everywhere"** ends all but the current one. Warning: "Terminating a session on a device may result in all unsaved changes made on that device being lost." | track-the-device; how-to-protect-your-account |
| Breach / login e-mails | (automatic) | "We always let you know if someone else is in" | blog "Safety of your account first" |
| Account recovery | Sign-in → **"I forgot password or can't sign in"** → code by email or SMS; else the **account recovery form** at `tradingview.com/account-recovery/` (billing details, and possibly ID card / bank card / personal photo) | recover-your-account |
| **Delete account** | **Settings and billing → Account settings → "Delete account"** | 30-day grace period during which deletion can be cancelled; published ideas/scripts and messages sent to others are retained; TradingView asks search engines to de-index | delete-account; Privacy Policy |
| **Subscriber status** | **Settings and billing → Subscriber status → "Update"** | Professional = uses data on behalf of an employer or is registered with a regulator (FINRA, NFA, CSA…); professionals must be on **Ultimate** to buy professional data packages | subscriber-status articles |
| Sign-out (Desktop app) | Any chart tab → profile icon (upper-left) → **"Sign Out"** | Save layouts first | desktop sign-out |

---

## 3. Public profile — what other people see

| Element | Rule / gating | Source |
|---|---|---|
| Publicly visible by default | "Usernames, avatars, signatures, social media handles, subscription levels, and join dates"; first/last name, phone and email stay private | Privacy Policy |
| **Signature** field | **Paid users only; "Free & free trial users are unable to access this feature."** External links in the signature: **Premium and higher** only. Shown under each published idea | trial-signature; signature-links; pricing ("Signature and Website fields" Premium+) |
| **Website** field | Premium/Expert/Ultimate | links-to-social-media |
| Social link fields | Basic: **X, YouTube**. Essential & Plus: + **Facebook, Instagram**. Premium, Expert & Ultimate: + **Website**. Links appear under each posted idea/script | links-to-social-media |
| Status field | "any paid plan" can activate a status field on the profile page for updates/promotions/external links | signature-links |
| Plan badge | "Exclusive badge next to your name" on paid plans; black/white badges mean "a user has bought an upgraded plan" | pricing; badge-meanings |
| Profile tabs | Ideas, Scripts, plus a way to find everything you **"Commented," "Followed," or "Liked"**; a **Scripts tab** shows every script you publish; **Followers** screen (mobile) | find-ideas-liked; updated-script-publishing; mobile blog |
| **"Message"** button | On a profile (and in the hover pop-up on a username) — starts a private chat | private-chat |
| **"Gift a subscription"** (older wording **"Send gift"**) | On another user's profile; recipient must be a free user; monthly or annual Essential/Plus/Premium; no auto-renewal; recipient gets "an email and website notification" | gift articles/blog |
| **"Report"** button | Next to any idea, script, comment or message | inform-moderators |
| Shared portfolio | **"Share portfolio"** toggle → **"Copy link"**; read-only for visitors, "Make a copy" for logged-in users; tips stay private | blog "Show your portfolio to the world" |

---

## 4. Privacy controls

| Control (verbatim) | Where | Effect | Source |
|---|---|---|---|
| **"Turn off the ability to create new private chats with you"** | Profile Settings → **Privacy and Security** | New users can't DM you; existing chats continue | blog "Privacy settings" |
| **Ignored Users** list / right-click → **"Ignore"** / **"Ignore username"** in a chat message menu | Privacy and Security; any chat | Hides that user's public and private chat messages; blog says it also hides their idea/script comments, the chat article says it is chat-only (the two sources disagree — treat comment-hiding as **could not verify**). No notification to the ignored user; no limit; moderators can't be ignored; reversible from the list | blog "Privacy settings"; stop-seeing-messages; private-chat |
| **Chart Sharing** / **"Sharing"** toggle | Chart layout menu ("arrow up" to the right of the layout name) | Saved charts are **not** viewable by link until enabled; shared copy is a snapshot at share time; recipients must be logged in; they see it **"View Only"** and can **"Copy"** | blog "Customize your chart sharing settings"; share-view-only |
| Private vs public ideas/scripts | At publish time | Private: not on profile, not in streams, not indexed, no reputation, no follower notification, editable/deletable any time. Public → private (or back) is **impossible**; public ideas are editable only **15 minutes** after publishing | private-vs-public; change-public-private |
| Marketing email opt-out | Unsubscribe link in the email | Service announcements can't be disabled | Privacy Policy |
| Cookies | Separate Cookies Policy (linked from Desktop app **Settings** since 3.2.0) | — | Privacy Policy; desktop notes |
| Account deletion | Section 2 | 30 days | delete-account |
| Third parties named in the policy | Payments: Braintree, Coinbase Commerce, Razorpay, Apple, Google, Triple-A, dLocal. Analytics: Firebase, Flurry, App Center, AppsFlyer, Sentry. AI features: OpenRouter, Langfuse, OpenMeter. Exchanges (e.g. ICE) receive contact details for market-data access | — | Privacy Policy |

App-store privacy labels (vendor-authored): iOS "Data Linked to You" = Contact Info, User Content, Identifiers, Usage Data; "Data Not Linked to You" = Device ID, crash data, performance diagnostics. (Google Play data-safety text **could not verify** — the listing did not render.)

---

## 5. Language and time zone

**Language (web).** "You can switch between the language (localized) versions of TradingView in the user menu." Each language is a **subdomain** (`fr.tradingview.com`, `in.`, `th.`, `tw.`, `de.`, `es.`, `ru.`, `il.` were all met while researching). Consequences that matter: notifications "only from the language version of the site you are on", and ideas are published *into* a language version — "There are no ideas in my profile" is answered with "changing the language to the one that you had when you published the idea". The UK version was merged into the main site in 2021 ("all your content, all ideas and reputation, and all notifications have been moved").

Language list shown by TradingView's own switcher (blog header/footer, 19 entries): **English, Deutsch, Français, Español, Italiano, Polski, Türkçe, Русский, Português, Bahasa Indonesia, Bahasa Melayu, ภาษาไทย, Tiếng Việt, 日本語, 简体中文, 한국어, 繁體中文, العربية, עברית**. The Android app announced the same 19; the App Store lists "English + 18 others". The charting-library docs list 21–25 locale codes (adds `ca_ES`, `sv`, `he_IL`, `id_ID`, `ms_MY`, `zh_TW`); whether the web app exposes Catalan/Swedish **could not verify**.

**Language (mobile).** **Menu** tab → **Settings** menu → **Language** menu → pick; "The app will change the language automatically", and it also switches which language's public chats / ideas feed you see.

**Time zone (chart).** Not an account setting. Change it by clicking the **clock at the bottom of the chart** or in **Chart settings → Symbol tab** (charting-library docs: "from the drop-down list at the bottom of the chart or through the Settings dialog"). Alert pop-ups, the alert manager and the Alerts Log use **"the timezone of your operating system"**, the chart timezone "doesn't affect alerts in any way", and CSV exports of the alert log are **UTC**. The supported list in the charting-library docs is 134 zones (Africa 6, Americas 17, Asia 30, Atlantic 2, Australia 4, Europe 32, Pacific 5, plus `Etc/UTC` and `US/Mountain`); "Exchange" as a menu entry **could not verify**.

**Theme.** Web: "move the slider in the pull-down menu of the upper button in the left" (Light/Dark). Desktop app: **Settings** or the three-dot menu → **"Use system theme"** (default) / **"Dark"** / **"Light"**; follows macOS Auto and Night Shift. Mobile: **Menu** → gear → **"Theme"** → **"Light"** / **"Dark"**, with a prompt to "keep the current format, or apply the new settings" if the chart uses a custom theme.

---

## 6. Notifications

### 6a. Social notifications (site + email)

- Managed in **profile settings → Social notifications tab** (`/settings/#social-notifications`). The Help Center article shows the toggles only as an image, so the exact labels **could not verify**. The Privacy Policy describes the class: "notify you via email about new users who have followed you, liked an idea, new ideas of users that you follow, and so on. You can refuse to receive such notifications at any time by adjusting your Settings."
- Known limits: "you can receive notifications only from the language version of the site you are on"; "notifications about new ideas on symbols that you follow are only available on the site. Email notifications have been discontinued"; no notification when someone you follow *updates* an idea (only for ideas you follow yourself).
- Other site notifications mentioned in sources: gift received ("email and website notification"), followers notified when you publish a script, **"Notifications for Minds and comments within Minds"** (live since Oct 2023), moderator warnings/bans arrive as a **private chat** message.
- A dedicated "notification center"/bell article was not found in the Help Center — the UI element's name and behaviour **could not verify** from primary sources.

### 6b. Alert notifications (delivery channels — the *conditions* are in 07-alerts)

| Channel (verbatim) | Where set | Notes / gating | Source |
|---|---|---|---|
| **"Notify in App"** / **"Push notifications"** checkbox | Alert dialog | Alerts created in the mobile app have it on by default; needs OS permission (section 6d). "Native push alerts notifications" — all paid plans on the pricing page; the push articles say "available to all users regardless of subscription tier" (conflict noted) | phone-notifications; iOS/Android push articles; pricing |
| Email + **alternative email** | **Settings and billing → Alerts delivery → "Add email"** → 6-digit **"Verification code"** | If the code never arrives, TradingView suggests webhooks instead | alternative-email |
| **"Play sound"** checkbox | Alert dialog | 40 sounds; needs the browser to allow autoplay/notifications (Chrome: Privacy and Security → Site Settings → Permissions → Notifications; Firefox "Allow Audio and Video"; Safari "Auto-Play → Allow All Auto-Play"); Chrome may need a click on the page first | cannot-hear-sound; blog "New notification sounds" |
| **Alert Volume** slider | Website: Alerts menu in the right toolbar → **Settings → Alerts** | "available on the website and not in the mobile or desktop apps" (the Desktop app has its own in-app volume — see 6c) | adjust-alert-volume; blog "Volume control for alerts" |
| **"Automatically hide toasts"** checkbox | Options menu → **Alerts settings** | Toasts (bottom-left pop-ups since Oct 2023) auto-close after **20 seconds** unless unchecked | toasts article; product update Oct 2023 |
| Webhook | Alert dialog | Essential+ | pricing; alerts-notifications folder |
| **Notification schedule** | Alert dialog | Presets **"Weekdays"**, **"Standard working hours (9:00 AM – 6:00 PM)"**, custom days/hours (may cross midnight) with a time zone; suppresses push, email and webhooks outside the window; last-used schedule is remembered; can be stored in an alert preset | blog "Notification scheduling" |
| Server-side | — | "You can close TradingView or exit the chart page and alerts will continue working on your devices." | alerts-work-when-closed |
| SMS alert delivery | — | Not mentioned on the pricing page or in the alerts-notifications folder: **could not verify** that it exists today | — |

### 6c. Desktop-app notifications

- **System notifications**: alerts arrive as native macOS/Windows/Linux notifications, "even on the lock screen".
- **"Mute app notifications"** in the app **Settings** ("silence the app for a while if needed").
- **In-app volume control** for alert sounds (Desktop 2.0.0) — independent of system volume.
- **Bad connection indicator** in the UI; notification badges on the Windows app icon were removed in 2.7.1; app-update notifications improved in 2.13.0.

### 6d. Mobile push

- iOS: **Settings → Notifications → TradingView → "Allow Notifications"**, then tick **"Push Notifications"** in the alert. Android: the same OS path plus the in-app push setting; the troubleshooting article lists OS-level causes (Airplane mode, Data saver, battery optimisation, "Background activity", "Always keep Wi-Fi on during sleep", autostart managers on Samsung/Huawei/Xiaomi/…), requires Android 6+/iOS 11+, and correct device time.
- **Alert management screen** (iOS): tab 1 = create / delete / stop / restore / edit / clone alerts; tab 2 = **Alert Log**; long-press for the context menu.
- Widgets (iOS): **Watchlist**, **Symbol**, **News** widgets plus lock-screen widgets; long-tap → **"Edit widget"**; options "price change type (percent or price)" and logo visibility. Android "Widgets shortcuts" exist; **Siri shortcuts** on iOS. Apple Watch app: **could not verify**.

### 6e. Trading notifications

- Order fills: "TradingView will pop up its own alert when an order or position is filled" (TradingView notifications must be enabled).
- **Sound on order execution**: **Chart settings → Trading tab**.
- Some brokers e-mail on every TradingView login (Crypto.com example, with an anti-phishing code).

---

## 7. Connected brokers (account-level view; order tickets are in 12)

| Item (verbatim) | Where | Notes | Source |
|---|---|---|---|
| **Trade** button | Supercharts, upper-right | Opens the brokers list; pick a broker → log in with broker credentials | finding-your-perfect-broker |
| **Trading Panel** / **Trading panel at the bottom** | Bottom of Supercharts | Broker list incl. **Paper Trading**; disconnect via the **trading menu (top-right)** → **"Log out Paper Trading"** or **"See the brokers list"** | paper-trading connect |
| **Account manager** | Bottom of Supercharts after connecting | Summary row (Account balance, Equity, Realized/Unrealized PnL, Account margin, Available funds, Orders margin, Margin buffer); tabs **Positions, Orders, History, Account history, Trading journal**; click the broker name → settings, CSV export, switch broker | account-manager |
| **Trading settings → One-click trading** (mobile: **one-tap trading**) | Trading settings / three-dot menu in the Order Panel | Everything executes without confirmation; mobile also hides/shows the floating Buy/Sell panel | one-click; buy-sell-buttons; one-tap |
| Buy/Sell buttons on the chart | **Chart settings** (web); order-panel three-dot menu (mobile) | — | show-buy-sell |
| One broker per tab | — | "we can guarantee stable connection in one tab and to one broker only" | broker-multiple-tabs |
| Broker-verified market data | Connect the broker in the Trading Panel | Real-time data you already pay your broker for is unlocked on TradingView; verification lasts **7 days** and renews on login; 30+ brokers, **"See all brokers"** button | data-from-broker |
| **Autofill of broker credentials** (Desktop) | App **Settings** | Windows: on by default, stored in **Credential Manager**; macOS: enable manually, stored in **Keychain Access** under "TradingView Desktop"; Linux unsupported; not for Capital.com, Currency.com, Alpaca, Bingbon. Remove via Credential Manager **"Remove"** / Keychain **"Delete 'TradingView Desktop'"** then restart | blog autofill; remove-saved-login |
| **"AD-free trading on the chart"** | — | Brokers on a **Platinum** partner plan give their connected users an ad-free chart | ad-free-trading |
| Paper Trading currency | Sub-account creation → currency drop-down; existing account → **Reset** (deletes history) | — | blog paper-currency |
| Broker "data type" toggle | Broker menu | Example: PhillipCapital Turkiye — free real-time **BIST_MIXED** (no volume) vs 15-min delayed BIST (with volume) | selecting-data-type |

---

## 8. Market-data subscriptions

- **Purchase path**: avatar → **Settings and billing** → **Subscriptions** (under Billing) → **"Real-time market data"** → **"Explore now"**. Also: click the chart's market status, or the **"Learn more"** button on the **"Data is delayed"** message, or symbol search to see the exchange.
- **Defaults**: US stocks are shown from **Cboe** in real time for free ("It doesn't have any per-user fees imposed by the exchange"); primary-exchange data (**NASDAQ, NYSE, NYSE Arca**) is paid; "Cryptocurrency exchanges provide real-time data by default"; "Most of the stock and futures exchanges we support charge fees for their real-time data". Cboe data can differ on 1-minute charts, thin tickers and pre/post-market.
- **Limits**: "Maximum market data subscriptions allowed" Basic 2, Essential 4, Plus 6 (Premium/Ultimate unlisted on the fetched pricing page); professionals need **Ultimate**; the Telegram mini-app note: "real-time data is only available if paid separately on the website".
- **Web-only**: "Real-time data subscriptions can only be purchased through the web version" (and discount coupons are web-only). A web plan works "in browser, mobile and desktop apps"; a mobile-store **Lite** plan works on mobile only and is managed in **Menu → Subscriptions**; store subscriptions can't be cancelled on the website, only their auto-renewal in the store.

---

## 9. Support, help and the free tier's account experience

- **"Support ticket"**: paid plans only — "You have to be a user with a paid plan in order to get in touch with the team". Everyone gets the **AI-powered Chat assistant**, the knowledge base, the blog and the Reddit community; the support team "doesn't provide help in direct messages on the platform, on social media, or via phone or email". Ultimate gets "First Priority" support; Essential–Premium "Priority support".
- Account-compromise → **Account Recovery form**; billing → **Billing history page** then the **Payment Search form**.
- Free users: can like, follow, post **private** ideas and messages; **cannot publish publicly** ("Why can't I share anything publicly") and cannot use the Signature; see ads.
- **Referral**: **"Refer a friend"** in the profile menu — $15 to you (older blog: "up to $30", in Coins) and a $15 coupon to the friend when they go paid within 3 months; **"Stats & history"** tab.
- **Coins**: earned via referrals/affiliate/tips; **"Get Coins"** tab; **"Redeem"** tab renews or upgrades a plan; coin-bought plans don't auto-renew without a payment method.

---

## 10. TradingView Desktop vs the web app

### 10a. What is only in the Desktop app (TradingView's own list + release notes)

| Desktop-only feature (verbatim) | Detail | Source |
|---|---|---|
| **Native multi-monitor support** / **"How to open multiple app windows?"** | **"New Window"** button on the title bar, app menu, or **Ctrl/Cmd+N**; detach a tab; "as many charts in separate windows as you like" — free since 1.0.6 | desktop page; multi-window; blog multi-monitor |
| **Tab linking** via **color tag** (**Symbol syncing between tabs**) | Right-click a tab → set the same colour; linked tabs follow the ticker, and since 2.13.0 the **interval**; since 3.1.0 also **time** and **date range**; works chart↔chart and chart↔screener, and (2.9.5) Markets/Symbols/Calendar pages | symbol-syncing; blog updates |
| **Synchronized workspace crosshairs** (**Crosshair Sync** option in the Select Layout menu) | On by default for new layouts; across tabs and windows; toggle in Settings | blog crosshair |
| **Restore** | Tickers, intervals, watchlist (with width/height since 3.2.0) and window positions come back on launch — if you exit with **"Quit TradingView"** from the title-bar menu (Windows/Linux: **Shift+Ctrl+Q**) rather than closing windows | close-and-keep-positions; restore blog |
| **Custom tab titles** (**"Customize tab title"** in the tab context menu) | Show the layout name ("Crypto", "US Stocks", "FX") instead of the ticker; **"Reset to default"** | edit-tab-title |
| **Pin tab / Unpin tab** | Pinned tabs sit left, have no close button, survive restart | pin-tab |
| **New Tab** page | Customisable launchpad: **"Individual tools panel"** picks Screeners, Heatmaps, Calendars, News Flow, Portfolios, Yield Curves, Options, Fundamental Graphs, Markets, Community tools; layout list with delete; **"Close tabs to the right"** in the context menu | blog new-tab; release notes |
| **System notifications**, **Mute app notifications**, in-app alert volume, **bad connection indicator** | Section 6c | — |
| **Autofill of broker credentials** | Section 7 | — |
| **In-app link handling** | Windows only: TradingView links from messengers/email open in the app; disable in Windows **Settings → Apps → Apps for websites** (`*.tradingview.com`, `tradingview.com`); macOS/Linux use **"Open link from clipboard"** in the app menu | link-handling; open-chart-link |
| **Theme follows the OS** | **"Use system theme"** / Dark / Light | theme article |
| **Sign in with browser** | Sign-in form opens the browser, confirms app access, honours 2FA | blog sign-in |
| Proxy | **Menu → Settings → Network → "Use a proxy server"** (HTTP / SOCKS5) → **"Relaunch"** | proxy |
| Default download location, camera/mic for video ideas | App **Settings** | blog tune-up |
| **Service** tab | **"Clear cache"**, **"Disable hardware acceleration"**, **"Back to defaults"** (keeps remotely stored layouts) | high-memory; tab-crashes |
| **About** tab | Version and manual update check | restore blog; tab-crashes |
| Launch at startup | Windows **Settings → Apps → Startup** toggle; macOS Dock → **"Open at Login"** | launch-at-startup |

### 10b. Native menus and keyboard shortcuts (Desktop app only)

The app has a **three-dot "Main menu"** on the tab bar (Settings, theme toggle since 2.7.1, Color theme…, Open link from clipboard, New window, Quit) and a **tab context menu** (colour tag, Customize tab title, Pin/Unpin tab, Close, Close other tabs, Close tabs to the right). Keyboard shortcuts from the Help Center:

| Action | Windows/Linux | macOS |
|---|---|---|
| Open Settings dialog | Ctrl + , | Cmd + , |
| Open new tab | Ctrl + T | Cmd + T |
| Duplicate tab | Ctrl + U | Cmd + U |
| Open new window | Ctrl + N | Cmd + N |
| Reload tab | Ctrl + R or F5 | Cmd + R |
| Close window | Ctrl + W | Cmd + W |
| Restore closed window or tab | Shift + Ctrl + T | Shift + Cmd + T |
| Switch tabs | Ctrl + PgDn/PgUp, Ctrl + Tab / Ctrl + Shift + Tab | Cmd + PgDn/PgUp, Ctrl + Tab / Ctrl + Shift + Tab, ⌘+⌥+←/→ |
| Go to tab 1–8 / rightmost | Ctrl + number / Ctrl + 9 | Cmd + number / Cmd + 9 |
| Quit and keep layout | Shift + Ctrl + Q | Cmd + Q |
| Help Center in a new tab | F1 (2.3.0) | — |
| Save snapshot opened in a new tab | Ctrl + S | Cmd + S |

### 10c. Same in both / limits shared with the web

- "the same functionality as the TradingView web platform"; layouts, watchlists and settings sync ("Synced layouts, watchlists, settings"). The **200 simultaneous chart connections** cap counts every browser tab *and* every app tab ("Opening one tab in your browser and one in an app counts as two connections"); the oldest tab is closed with a pop-up offering **"Restore connection"**. Plan caps ("Simultaneous chart connections") are in 08.
- The web-only **Alert Volume** slider vs the desktop in-app volume are two different controls.
- Platforms: Windows 10 22H2+/11 22H2+ (x64, no ARM, needs App Installer; `.msix`), macOS 12+ (Intel/Apple Silicon), Ubuntu 20.04/22.04/24.04 (`.deb` repo or snap; "Snap build is currently unstable on native Wayland"); IPv6 unsupported. Auto-updates on restart; Windows fallback = download `TradingView.msix` → **"Update"**.
- Desktop onboarding: "App onboarding for new users" (2.2.0) and "Fresh install opens chart and New Tab automatically" (2.7.5) — screens **could not verify**.

---

## 11. Mobile-app parity

- Pricing page: "Mobile apps — Fully synced — 100%" on paid tiers; "Android and iOS Widgets"; "Native push alerts notifications". Support page: "AppStore (iOS 16.0 or later)", "Google Play (Android 8.0 or later)" (the App Store listing itself says iOS 17.0+ — conflict noted). App size 209 MB; age 16+.
- **Menu** tab is "a single access point for profile and app settings" (iOS). Settings inside it (verbatim where known): **Theme**, **Language**, remember-last-chart ("The app will show the last chart you viewed on this specific device when this option is enabled"; default on iOS is "the last chart you viewed in either the web browser or on the TradingView Desktop app"), **Subscriptions** (Android), one-tap trading, **"Show symbol screen feature"** (Watchlist settings; needed to reach Minds on the symbol screen).
- Mobile-specific: alert management screen with **Alert Log**; **Followers** screen and **Subscribe to user** (Android); **Editor's picks**; **Chart quick previews**; **Symbols info previews**; landscape charts; multi-chart view; **Flagged lists**; 45° drawing alignment; Bar Replay interval picker; Minds ("all users can read, comment on and like minds, but only old TradingView users and all upgraded plan holders in general can create their own minds"); brokers listed per app.
- Missing on mobile: **Alert Volume** slider; real-time data purchase; coupons; a **Lite** plan bought in the store does not work on the web. Login issues: account must be verified by the emailed link first.
- Latest listing note (2.139.0): "Chart settings can now be accessed from the Analysis hub menu on the chart screen and by long-pressing the price scale."
- **TradingView mini app on Telegram**: charts, indicators, last price, chart snapshots shared in messages; paid real-time data not included.

---

## 12. Community and social profile

| Feature | Verbatim rules / gating | Source |
|---|---|---|
| **Ideas** | Required fields **Title, Description, Category, position (long/neutral/short)**; optional smart tags and related ideas; **15-minute** edit/delete window; ideas on timeframes under 15 minutes "can only be published privately or sent in chat or Minds"; public publishing requires a paid plan ("Publish public ideas and scripts" — Premium+ on the pricing page; the Free-User FAQ says simply "a paid plan"); private ideas free. Update-status feature, trending feed, followers notified of updates | publish-idea; publishing-rules; why-cant-share; pricing; build-following |
| **Scripts** | Invite-only: Essential+; protected: Plus+; public: Premium+. New scripts appear in the profile **Scripts tab**, followers get a notification; moderator-approved scripts get a **"Suggested badge"**; limits **5 per 24 h, 15 per 30 days** | updated-script-publishing; pricing |
| **Minds** | Symbol-scoped short posts; reach via **Publish → "Speak your mind"**, the **Discussions** tab of a symbol page, or the right rail; **$SYMBOL** cashtags, chart snapshot attach, **Boost**, comments, share, **Report**. Read/follow/vote for everyone; posting = paid plans (Pro/Pro+/Premium at launch; "all upgraded plan holders" on mobile) | minds articles/blogs |
| **Comments** | Only accounts "confirmed … via mobile authentication"; edit within 15 minutes; authors cannot delete or disable comments; reported comments are reviewed, not auto-deleted; a limit on likes/comments per user exists (anti-spam) | using-public-comments; comment-moderation; house-rules blog |
| **Chats** | **Public chats are being retired on Sep 30, 2026** ("outdated and require significant moderation resources"); the new Chats = one-to-one and private group chats; switching is permanent. Private chat starts from the **"Message"** button; message menu: **"Quote this message"**, **"Permanent link to this message"**, **"Ignore username"**; `[pine]…[/pine]` code blocks; moderator warnings/bans arrive here | public-chats-retired; private-chat |
| **Streams** | Editors' Picks section for Streams; chat can be turned on/off during a stream; ideas can be video; camera/mic chosen in Desktop settings | product update summer 2023; ideas folder |
| **Badges** | **MOD** (red, official reps), **BROKER** (platinum-blue / gold / silver), **WIZARD** (green, top Pine authors), TradingView employee (blue with TV logo), black/white = paid plan | badge-meanings |
| **Reputation** | Earned by publishing and engaging; "A new and more fair reputation algorithm"; duplicate accounts → permanent ban of the duplicate, long ban + reputation correction on the original | duplicate-accounts; house-rules blog |
| **Moderators** | Volunteer members "who earned trust"; directory at `/moderators/`; **"Report"** next to any content or DM a moderator | who-are-moderators; inform-moderators |
| **Bans** | "5 minutes to 1 month", escalating to 1 week then 1 month; permanent for spam, malware, trial abuse, plagiarism, duplicate accounts; always a private message from a moderator; paid status gives no exemption | how-bans-work |
| **Editors' Picks** | Hand-picked by the moderation team; **USD 100** per selected idea/script (PayPal, English-speaking users, brokers excluded, W-9/W-8 over $600) | editors-picks blog; earn-money |
| **Paid Spaces / Creator Program** | Author must be on **Premium or Ultimate** with at least one public invite-only script; subscriptions "$4.99 to $199 per month", managed "from your account settings"; hub `/creator-program/`, `/spaces/` | creator-program blog; paid-space |
| **Community trading contests** | Anyone can join free; creating one needs a paid plan or trial | contests blog |
| **Wall of Love**, **Social network** page, **House Rules** | `/wall-of-love/`, `/social-network/`, `/house-rules/` | editors-picks blog; house-rules |
| **Shared portfolio** | Section 3 | — |

---

## 13. What a new user sees first

Verified from primary sources (the anonymous SPA chart page could not be rendered by the fetcher, so anything not listed here — the default symbol, the default layout, the default watchlist contents, in-chart tooltips — is **could not verify**):

- **Home page** headline "The best trades require research, then commitment."; CTAs **"Get started for free"** with "$0 forever, no credit card needed", and a header **"Get started"** that carries `feature=start_free_trial`. Trials: 30 days on Basic–Premium (14 on Ultimate) per the pricing page.
- **Sign-up**: choose a username (changes limited), avatar rules apply immediately; email must be verified by link before the mobile app will log you in; SMS/WhatsApp phone verification happens "during the trial".
- **Supercharts on first open** (from "Getting started with Supercharts"): top toolbar = **Symbol search, Data type switcher, Compare symbols, Chart interval, Chart type, Indicators, metrics, and strategies, Alerts, Bar replay, Undo/Redo, Chart layouts, Quick search, Settings, Take a snapshot, Trade, Publish**; left toolbar = drawing groups; right toolbar = **Watchlist, details, and news; Alerts; Object tree and data window; Screeners; Pine Editor; Calendars; News Flow; Portfolio; Fundamental Graphs; Yield Curves; Options; Macro Maps**, community tools and help; bottom = **Time scale** with interval presets, **"Go to"**, **Time zone settings**, price-scale settings. (Anatomy and defaults inside the chart are in 01/02.)
- **Desktop app**: "App onboarding for new users" exists (2.2.0), and a fresh install "opens chart and New Tab automatically" (2.7.5).
- **Mobile**: first chart shown = "the last chart you viewed in either the web browser or on the TradingView Desktop app" (cross-device hand-off); Minds requires "Show symbol screen feature"; alerts created in-app already have push on.
- **Learning surfaces** TradingView points new users to: the Help Center **Getting started** page, the **@TradingView** account's Tutorials tab, `/education/`, `/education/tradingviewtips/`, the YouTube channel, the blog, and a "Community-powered support chat" (public chats — being retired). A "Free user FAQs" folder exists specifically because free accounts can't open tickets.
- **Free-plan ads**: "Ad-free" starts at **Essential**; Basic "Includes ads". If an ad blocker is on, the site shows **"Ad blocker detected"** and the Help Center's fix is to whitelist `tradingview.com`, disable Brave/Safari/Opera built-in blocking, VPN ad-filtering and antivirus web filters. A broker on a Platinum partner plan removes ads from the chart for its connected users. Exact ad **placement** on the chart page **could not verify** from a primary source.
- **Free-plan account limits that shape the first session** (from the pricing page; full table in 08): 2 simultaneous chart connections, 2 market-data subscriptions, 5K historical bars, 3 price alerts, no webhooks, no Signature, no public publishing, no support tickets.

---

## What this means for OnStock

OnStock today: a Profile sheet (Appearance = Dark/Light/System + accent, wallet connect, Help & feedback, About, Privacy link, sign-in/out, password), one dismiss-once onboarding caption, a Welcome sheet after sign-in, client-side price + gap-drift alerts that fire in-app only, folders/watchlists synced via Supabase, and no language/timezone controls (everything is `en-US` and `America/New_York`).

1. **Adopt — one "Settings" page with hash-anchored sections** (`#account`, `#appearance`, `#notifications`, `#sessions`, `#privacy`). TradingView's `settings/#social-notifications` deep links are what let Help articles and in-app toasts point straight at a control; on desktop OnStock's stacked sheets should become a left-nav settings page.
2. **Adopt — "Alerts delivery" as its own section** (email + alternative email with a 6-digit code, browser push, sound, "Automatically hide toasts" with a 20 s default, and a notification schedule with "Weekdays"/"working hours" presets in the user's zone). OnStock alerts only render in-app today; a desktop tab left open overnight is exactly the case TradingView solves server-side.
3. **Adapt — server-side alert evaluation** ("You can close TradingView… and alerts will continue working"). OnStock evaluates rules in `AlertsContext` on the client; the gap-drift alert is the product's reason to exist and must fire when the tab is closed. Move evaluation to a Vercel cron/function and deliver by email + web push.
4. **Adopt — Active sessions with "Log out everywhere"** and a warning about unsaved changes. Cheap with Supabase auth, and it is the single most reassuring control for a security-cautious owner.
5. **Adopt — 2FA via authenticator app with backup codes** and a "set a password on a magic-link account" path; make "Linked external accounts" visible so users understand how they sign in.
6. **Adapt — timezone as a chart control, not an account setting**, with alert timestamps in the OS zone and CSV exports in UTC. OnStock hard-codes `America/New_York` for sessions; keep that for the stock session strip but let the desktop chart clock switch between Exchange (New York), Local and UTC — the token leg trades 24/7 so "Local" matters more than on TradingView.
7. **Adapt — language**: TradingView's per-language subdomains create real user pain ("no ideas in my profile"). OnStock should keep one domain and, if it ever localises, store the language on the account.
8. **Adopt — theme "Use system theme" as the default** on desktop (TradingView Desktop's default), keeping the explicit Dark/Light overrides already in AppearanceSheet.
9. **Adapt — the "Data is delayed → Learn more" pattern**. TradingView turns delayed data into a purchase prompt; OnStock's Yahoo stock leg is delayed by design, so the same badge should explain the delay (and why the gap is still meaningful) rather than sell an add-on.
10. **Adopt — connected-account cards** modelled on the Trading Panel/account manager: wallet (Phantom) shown with its short address, per-tab connection warnings ("stable connection in one tab"), and a remove-saved-credentials note when OnStock adds native deep-linking.
11. **Skip — the community layer** (ideas, Minds, chats, reputation, badges, moderators, Paid Spaces). Public chats are being retired on Sep 30, 2026 and every social feature drags moderation with it; OnStock's news feed is the only social-adjacent surface it needs.
12. **Skip — free-plan ads and an "Ad blocker detected" wall.** OnStock's plan is a waitlist for trading, not an ad-supported free tier.
13. **Adapt — desktop-app behaviours inside the web app**: tab-title customisation ("AAPL | gap 2.1%" in the document title), restore-on-reload (last asset, interval, Gap|Candles state, watchlist width), pinned tabs via browser only, and keyboard shortcuts mirroring Ctrl+, for Settings. A native Electron shell is not warranted until multi-window sync is a real request.
14. **Adopt — a "Getting started" surface that names the toolbar** the way TradingView's article does, plus a Free-User-FAQ-style page, instead of growing more dismiss-once captions; keep the existing single premium-pill tip.
15. **Adopt — account deletion with a 30-day grace period** and an explicit list of what is retained (nothing, for OnStock — no public content), stated on the Privacy page.

---

## Sources (every URL read)

TradingView product/marketing/policy pages
- https://www.tradingview.com/
- https://www.tradingview.com/desktop/
- https://www.tradingview.com/mobile/
- https://www.tradingview.com/features/
- https://www.tradingview.com/pricing/
- https://www.tradingview.com/gopro/
- https://www.tradingview.com/privacy-policy/
- https://www.tradingview.com/security/
- https://www.tradingview.com/house-rules/
- https://www.tradingview.com/charting-library-docs/latest/core_concepts/Localization/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/
- https://www.tradingview.com/charting-library-docs/latest/ui_elements/timezones

Help Center — hubs and folders
- https://www.tradingview.com/support/
- https://www.tradingview.com/support/knowledge-base/
- https://www.tradingview.com/support/getting-started/
- https://www.tradingview.com/support/categories/profileSettings/
- https://www.tradingview.com/support/categories/desktop/
- https://www.tradingview.com/support/categories/socialNetwork/
- https://www.tradingview.com/support/categories/mobileApps/
- https://www.tradingview.com/support/categories/data/
- https://www.tradingview.com/support/categories/billing/
- https://www.tradingview.com/support/categories/alerts/
- https://www.tradingview.com/support/categories/trading/
- https://www.tradingview.com/support/folders/43000548578-i-want-to-change-my-account-information/
- https://www.tradingview.com/support/folders/43000549728-tell-me-more-about-notifications/
- https://www.tradingview.com/support/folders/43000555725-i-want-to-know-more-about-the-security-of-my-tradingview-account/
- https://www.tradingview.com/support/folders/43000548581-i-forgot-my-password-or-can-t-access-my-account/
- https://www.tradingview.com/support/folders/43000589976-how-to-get-help-support-on-tradingview/
- https://www.tradingview.com/support/folders/43000564457-i-want-to-delete-my-account/
- https://www.tradingview.com/support/folders/43000568623-two-factor-authentication/
- https://www.tradingview.com/support/folders/43000585939-why-is-my-account-banned/
- https://www.tradingview.com/support/folders/43000574972-settings/
- https://www.tradingview.com/support/folders/43000577553/
- https://www.tradingview.com/support/folders/43000558389-application-installation/
- https://www.tradingview.com/support/folders/43000558390-application-settings/
- https://www.tradingview.com/support/folders/43000547714-push-notifications/
- https://www.tradingview.com/support/folders/43000558391-other-questions/
- https://www.tradingview.com/support/folders/43000549720-tell-me-more-about-social-features-at-tradingview/
- https://www.tradingview.com/support/folders/43000548391-tell-me-more-about-tradingview-chats/
- https://www.tradingview.com/support/folders/43000572072-tell-me-more-about-the-house-rules/
- https://www.tradingview.com/support/folders/43000547307-tell-me-more-about-ideas-and-scripts-at-tradingview/
- https://www.tradingview.com/support/folders/43000548582-i-want-to-share-my-charts-and-or-ideas/
- https://www.tradingview.com/support/folders/43000548247-i-want-to-know-more-about-moderation-at-tradingview/
- https://www.tradingview.com/support/folders/43000571963-free-user-faqs/
- https://www.tradingview.com/support/folders/43000547663-alerts-settings/
- https://www.tradingview.com/support/folders/43000547712-alerts-notifications/
- https://www.tradingview.com/support/folders/43000547053-i-don-t-have-access-to-real-time-data/
- https://www.tradingview.com/support/folders/43000547366-i-need-more-info-about-free-trial-subscription/
- https://www.tradingview.com/support/folders/43000547456-i-need-more-info-about-my-subscription-s-and-or-a-billing-history/
- https://www.tradingview.com/support/folders/43000561946-refer-a-friend/
- https://www.tradingview.com/support/folders/43000547584-general-questions-settings-data-and-more/
- https://www.tradingview.com/support/folders/43000549472-trading-essentials-on-tradingview/
- https://www.tradingview.com/support/folders/43000579050-supercharts-learn-how-everything-works/

Help Center — articles (profile, security, notifications)
- https://www.tradingview.com/support/solutions/43000482566-how-do-i-manage-site-notifications/
- https://www.tradingview.com/support/solutions/43000482569-i-m-not-receiving-some-of-my-notifications-but-i-have-them-enabled/
- https://www.tradingview.com/support/solutions/43000786677-notifications/
- https://www.tradingview.com/support/solutions/43000477665-how-do-i-change-my-password/
- https://www.tradingview.com/support/solutions/43000566751-how-do-i-change-my-email/
- https://www.tradingview.com/support/solutions/43000482515-i-d-like-to-change-my-username/
- https://www.tradingview.com/support/solutions/43000553429-what-should-i-do-if-an-expected-sms-does-not-arrive/
- https://www.tradingview.com/support/solutions/43000690946-my-phone-number-is-in-use-inside-another-account/
- https://www.tradingview.com/support/solutions/43000572460-how-to-configure-2fa/
- https://www.tradingview.com/support/solutions/43000510126-how-do-i-track-the-device-including-the-exact-time-and-location-used-to-access-my-account/
- https://www.tradingview.com/support/solutions/43000582277-how-to-protect-your-account/
- https://www.tradingview.com/support/solutions/43000599943-i-want-to-log-in-with-my-email-username-and-password-how-can-i-do-that/
- https://www.tradingview.com/support/solutions/43000619597-how-to-recover-your-account/
- https://www.tradingview.com/support/solutions/43000550534-i-want-to-delete-my-account/
- https://www.tradingview.com/support/solutions/43000645888-i-have-lost-access-to-my-google-account-apple-id-how-can-i-cancel-my-subscription/
- https://www.tradingview.com/support/solutions/43000698097-how-to-get-help-support-on-tradingview/
- https://www.tradingview.com/support/solutions/43000648248-how-to-get-in-touch-with-the-support-team/
- https://www.tradingview.com/support/solutions/43000587296-i-can-t-submit-a-ticket-how-can-i-contact-support-or-get-help-with-my-issue/
- https://www.tradingview.com/support/solutions/43000590947-self-help-resources-for-free-users/
- https://www.tradingview.com/support/solutions/43000587305-i-am-new-to-tradingview-where-can-i-learn-more-on-how-to-use-tradingview-features-and-tools/
- https://www.tradingview.com/support/solutions/43000587316-do-you-have-any-tutorials-or-visual-learning-resources-that-i-can-look-into/
- https://www.tradingview.com/support/solutions/43000731499-do-you-have-tutorials/
- https://www.tradingview.com/support/solutions/43000746464-getting-started-with-supercharts/
- https://www.tradingview.com/support/solutions/43000748166/
- https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/
- https://www.tradingview.com/support/solutions/43000754968-ad-free-trading-on-the-chart/
- https://www.tradingview.com/support/solutions/43000763991-how-to-fix-the-ad-blocker-detected-message-on-tradingview/
- https://www.tradingview.com/support/solutions/43000482556-how-do-i-switch-between-the-language-versions/
- https://www.tradingview.com/support/solutions/43000506671-how-do-i-switch-the-language-in-the-app/
- https://www.tradingview.com/support/solutions/43000476526-is-there-a-way-to-change-chart-timezone-or-clock-time-at-the-bottom-of-the-chart/
- https://www.tradingview.com/support/solutions/43000691967-what-timezone-is-displayed-in-alerts/
- https://www.tradingview.com/support/solutions/43000478062-how-to-enable-disable-dark-theme/
- https://www.tradingview.com/support/solutions/43000671628-how-do-i-switch-the-app-to-dark-or-light-color-theme/
- https://www.tradingview.com/support/solutions/43000506669-how-do-i-turn-on-the-dark-theme/

Help Center — alerts delivery, mobile push, trading, data, billing
- https://www.tradingview.com/support/solutions/43000474389-how-to-receive-phone-notifications-for-alerts/
- https://www.tradingview.com/support/solutions/43000474398-how-to-set-up-alternative-email-address-used-for-alert-notifications/
- https://www.tradingview.com/support/solutions/43000548327-will-alerts-work-if-tradingview-is-not-open-on-the-computer/
- https://www.tradingview.com/support/solutions/43000474409-i-cannot-hear-sound-notifications-of-my-alerts/
- https://www.tradingview.com/support/solutions/43000737982-i-want-my-toasts-to-stay-visible-what-should-i-do/
- https://www.tradingview.com/support/solutions/43000740625-how-to-adjust-alert-volume/
- https://www.tradingview.com/support/solutions/43000474590-how-do-i-enable-push-notifications-to-receive-alerts-on-my-ios-device/
- https://www.tradingview.com/support/solutions/43000474595-how-do-i-enable-push-notifications-to-receive-alerts-on-my-android-device/
- https://www.tradingview.com/support/solutions/43000506687-ios-i-m-not-receiving-notifications-about-triggered-alerts/
- https://www.tradingview.com/support/solutions/43000512097-troubleshooting-push-notifications-on-android-devices/
- https://www.tradingview.com/support/solutions/43000754536-ios-how-do-i-edit-widgets/
- https://www.tradingview.com/support/solutions/43000690947-how-to-change-the-default-chart-that-loads-in-the-app/
- https://www.tradingview.com/support/solutions/43000755479-how-to-remember-the-last-opened-chart-on-your-mobile-device/
- https://www.tradingview.com/support/solutions/43000641691-how-to-enable-disable-buy-sell-buttons-in-the-app/
- https://www.tradingview.com/support/solutions/43000776264-one-tap-trading-mode-in-ios-and-android-mobile-apps/
- https://www.tradingview.com/support/solutions/43000506667-where-can-i-download-the-app/
- https://www.tradingview.com/support/solutions/43000506685-i-m-unable-to-log-into-my-tradingview-account/
- https://www.tradingview.com/support/solutions/43000506681-there-are-no-ideas-in-my-profile-where-can-i-find-them/
- https://www.tradingview.com/support/solutions/43000479975-how-to-connect-or-disconnect-a-paper-trading-account/
- https://www.tradingview.com/support/solutions/43000784715/
- https://www.tradingview.com/support/solutions/43000756695-how-to-trade-on-tradingview/
- https://www.tradingview.com/support/solutions/43000786138-what-is-the-account-manager/
- https://www.tradingview.com/support/solutions/43000690936-can-i-connect-to-my-broker-in-multiple-tabs/
- https://www.tradingview.com/support/solutions/43000694474-parallel-chart-connections/
- https://www.tradingview.com/support/solutions/43000480920-i-d-like-to-place-orders-without-having-to-confirm-them-every-time/
- https://www.tradingview.com/support/solutions/43000480908-i-d-like-to-enable-sound-notifications-for-order-execution/
- https://www.tradingview.com/support/solutions/43000480915-how-do-i-switch-my-order-panel-mode/
- https://www.tradingview.com/support/solutions/43000479981-how-to-show-buy-sell-buttons-on-the-chart/
- https://www.tradingview.com/support/solutions/43000725196/
- https://www.tradingview.com/support/solutions/43000471705-how-to-purchase-additional-market-data/
- https://www.tradingview.com/support/solutions/43000473924-is-us-stock-market-data-free-by-default/
- https://www.tradingview.com/support/solutions/43000479666-how-can-i-get-real-time-data-from-exchanges-that-i-have-already-purchased-with-my-broker/
- https://www.tradingview.com/support/solutions/43000715287-how-can-i-change-my-subscriber-status-professional-non-professional/
- https://www.tradingview.com/support/solutions/43000677382-the-difference-between-professional-and-non-professional-status/
- https://www.tradingview.com/support/solutions/43000473385-i-d-like-to-learn-more-about-different-subscription-plans/
- https://www.tradingview.com/support/solutions/43000777718-would-my-web-plan-subscription-work-on-the-mobile-app-version-and-vice-versa/
- https://www.tradingview.com/support/solutions/43000733673-i-have-the-lite-plan-on-my-device-and-want-to-use-it-on-the-web-version-can-i-do-that/
- https://www.tradingview.com/support/solutions/43000471709-i-would-like-to-cancel-my-free-trial/
- https://www.tradingview.com/support/solutions/43000474854-i-ve-signed-up-for-a-free-trial-but-can-t-add-a-signature/
- https://www.tradingview.com/support/solutions/43000739401-can-i-gift-a-subscription-to-another-user/
- https://www.tradingview.com/support/solutions/43000538302-what-s-the-tradingview-referral-program/
- https://www.tradingview.com/support/solutions/43000538305-where-can-i-find-my-reward-balance-and-the-number-of-people-i-invited/

Help Center — Desktop app
- https://www.tradingview.com/support/solutions/43000671618/
- https://www.tradingview.com/support/solutions/43000673888-tradingview-desktop-releases-and-release-notes/
- https://www.tradingview.com/support/solutions/43000623399-desktop-app-keyboard-shortcuts/
- https://www.tradingview.com/support/solutions/43000609329-how-do-i-close-the-desktop-app-and-keep-the-positions-of-windows/
- https://www.tradingview.com/support/solutions/43000611543-how-to-open-multiple-app-windows/
- https://www.tradingview.com/support/solutions/43000673893-symbol-syncing-between-tabs/
- https://www.tradingview.com/support/solutions/43000673907-how-to-open-a-tradingview-chart-link-in-desktop-app/
- https://www.tradingview.com/support/solutions/43000686674-how-to-remove-saved-broker-login-and-password/
- https://www.tradingview.com/support/solutions/43000686676-how-to-launch-desktop-app-at-system-startup/
- https://www.tradingview.com/support/solutions/43000689717-how-to-edit-tab-title/
- https://www.tradingview.com/support/solutions/43000708221-how-in-app-link-handling-works-in-tradingview-desktop/
- https://www.tradingview.com/support/solutions/43000721442-how-to-sign-out-of-your-account-in-desktop-app/
- https://www.tradingview.com/support/solutions/43000728277-how-to-pin-unpin-tab-in-desktop-app/
- https://www.tradingview.com/support/solutions/43000760213-how-to-set-up-a-proxy-server/
- https://www.tradingview.com/support/solutions/43000624193-system-requirements-for-tradingview-desktop-app/
- https://www.tradingview.com/support/solutions/43000647779-how-to-update-desktop-app-on-mac-and-windows/
- https://www.tradingview.com/support/solutions/43000728898-how-to-install-and-update-desktop-app-on-linux/
- https://www.tradingview.com/support/solutions/43000726020-how-to-fix-high-memory-and-cpu-usage-in-tradingview-desktop/
- https://www.tradingview.com/support/solutions/43000760580-what-to-do-if-a-tab-crashes/

Help Center — community / social
- https://www.tradingview.com/support/solutions/43000475985-what-are-the-meanings-behind-each-tradingview-badge/
- https://www.tradingview.com/support/solutions/43000635806-links-to-social-media/
- https://www.tradingview.com/support/solutions/43000472770-am-i-allowed-to-include-links-to-3rd-party-sites-in-my-signature/
- https://www.tradingview.com/support/solutions/43000690226/
- https://www.tradingview.com/support/solutions/43000696301-using-minds/
- https://www.tradingview.com/support/solutions/43000761245-tradingview-social-network/
- https://www.tradingview.com/support/solutions/43000765877-what-s-a-paid-space/
- https://www.tradingview.com/support/solutions/43000570846-how-to-build-a-following-on-tradingview/
- https://www.tradingview.com/support/solutions/43000591334-creating-your-account-and-selecting-your-avatar/
- https://www.tradingview.com/support/solutions/43000591339-public-chats-are-being-retired-on-sep-30-2026/
- https://www.tradingview.com/support/solutions/43000591345-using-public-comments/
- https://www.tradingview.com/support/solutions/43000604448-how-to-use-tradingview-private-chat/
- https://www.tradingview.com/support/solutions/43000477270-what-can-i-do-to-stop-seeing-messages-from-a-specific-user/
- https://www.tradingview.com/support/solutions/43000477617-i-m-unable-to-see-a-list-of-chats/
- https://www.tradingview.com/support/solutions/43000570847-comment-moderation/
- https://www.tradingview.com/support/solutions/43000570843-who-are-tradingview-moderators/
- https://www.tradingview.com/support/solutions/43000482593-how-do-i-inform-moderators-about-a-violation-of-house-rules/
- https://www.tradingview.com/support/solutions/43000570845-duplicate-accounts-and-reputation-score/
- https://www.tradingview.com/support/solutions/43000591357-how-bans-work/
- https://www.tradingview.com/support/solutions/43000589083-how-can-i-publish-an-idea/
- https://www.tradingview.com/support/solutions/43000591338-publishing-and-updating-ideas/
- https://www.tradingview.com/support/solutions/43000548335-how-do-private-ideas-and-scripts-differ-from-public-ones/
- https://www.tradingview.com/support/solutions/43000476689-can-i-change-the-public-private-setting-for-my-published-ideas-and-scripts/
- https://www.tradingview.com/support/solutions/43000669330-why-can-t-i-share-anything-publicly-on-tradingview/
- https://www.tradingview.com/support/solutions/43000606515-how-to-share-charts-in-view-only-mode/
- https://www.tradingview.com/support/solutions/43000702405-can-i-earn-money-creating-content-on-tradingview/

TradingView blog (official announcements)
- https://www.tradingview.com/blog/en/privacy-settings-of-the-platform-24967/
- https://www.tradingview.com/blog/en/notification-schedule-for-alerts-59369/
- https://www.tradingview.com/blog/en/new-alert-sounds-46455/
- https://www.tradingview.com/blog/en/volume-control-for-alerts-48330/
- https://www.tradingview.com/blog/en/real-time-news-alerts-54444/
- https://www.tradingview.com/blog/en/new-alert-management-for-ios-19521/
- https://www.tradingview.com/blog/en/bad-connection-indicator-and-system-notifications-in-tradingview-desktop-25177/
- https://www.tradingview.com/blog/en/tradingview-desktop-2-0-35634/
- https://www.tradingview.com/blog/en/in-app-theme-management-and-customizable-tabs-in-tradingview-desktop-32720/
- https://www.tradingview.com/blog/en/tradingview-desktop-updated-new-tab-and-sync-58473/
- https://www.tradingview.com/blog/en/interval-syncing-in-tradingview-desktop-55068/
- https://www.tradingview.com/blog/en/restore-everything-with-tradingview-desktop-update-33365/
- https://www.tradingview.com/blog/en/more-tune-up-options-in-tradingview-desktop-30350/
- https://www.tradingview.com/blog/en/multi-monitor-support-free-on-desktop-app-31209/
- https://www.tradingview.com/blog/en/crosshair-syncing-in-tradingview-desktop-app-30157/
- https://www.tradingview.com/blog/en/sign-in-with-browser-in-tradingview-desktop-app-26870/
- https://www.tradingview.com/blog/en/autofill-of-broker-credentials-in-tradingview-desktop-27533/
- https://www.tradingview.com/blog/en/screener-heatmap-news-snaps-in-desktop-app-33600/
- https://www.tradingview.com/blog/en/tradingview-desktop-reaches-stable-28193/
- https://www.tradingview.com/blog/en/introducing-minds-35320/
- https://www.tradingview.com/blog/en/minds-in-tradingview-mobile-app-39626/
- https://www.tradingview.com/blog/en/you-ve-improved-our-mobile-apps-25189/
- https://www.tradingview.com/blog/en/android-app-updated-new-languages-dark-mode-13525/
- https://www.tradingview.com/blog/en/customize-chart-sharing-settings-9987/
- https://www.tradingview.com/blog/en/merge-of-local-versions-on-the-website-26414/
- https://www.tradingview.com/blog/en/tradingview-mini-app-on-telegram-51366/
- https://www.tradingview.com/blog/en/improved-tradingview-coins-spending-system-29897/
- https://www.tradingview.com/blog/en/we-ve-updated-our-house-rules-20420/
- https://www.tradingview.com/blog/en/show-your-portfolio-59176/
- https://www.tradingview.com/blog/en/safety-of-your-account-first-36717/
- https://www.tradingview.com/blog/en/2-factor-authentication-to-protect-your-account-18103/
- https://www.tradingview.com/blog/en/how-to-protect-your-account-17676/
- https://www.tradingview.com/blog/en/session-history-adding-safety-and-info-12532/
- https://www.tradingview.com/blog/en/self-help-resources-for-free-users-19821/
- https://www.tradingview.com/blog/en/learn-to-stay-safe-57981/
- https://www.tradingview.com/blog/en/tradingview-product-update-october-2023-41180/
- https://www.tradingview.com/blog/en/tradingview-product-update-40147/
- https://www.tradingview.com/blog/en/tradingview-wizards-37762/
- https://www.tradingview.com/blog/en/tradingview-creator-program-60011/
- https://www.tradingview.com/blog/en/community-trading-contests-59895/
- https://www.tradingview.com/blog/en/updated-script-publishing-60116/
- https://www.tradingview.com/blog/en/gift-tradingview-subscription-48004/
- https://www.tradingview.com/blog/en/give-tradingview-plans-for-one-month-50999/
- https://www.tradingview.com/blog/en/30-for-you-and-a-friend-14643/
- https://www.tradingview.com/blog/en/introducing-editors-picks-19288/
- https://www.tradingview.com/blog/en/tradingview-tackles-the-spam-issue-12583/
- https://www.tradingview.com/blog/en/change-paper-trading-account-currency-47213/

Vendor app-store listing
- https://apps.apple.com/us/app/tradingview-track-all-markets/id1205990992

Index pages used only for discovery (no facts taken from them): TradingView blog search result pages (`/blog/en/?s=…`) and Yahoo `site:tradingview.com/support` result pages.
