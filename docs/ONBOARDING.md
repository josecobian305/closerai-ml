# CloserAI — Typeform-Style Onboarding + Customizable Workspace

## Registration Flow (Carousel-Style)

Each screen is ONE question, full-screen, animated transitions. Progress bar at top.

### Screen 1: Welcome
"Let's build your AI sales team in 5 minutes."
[Get Started →]

### Screen 2: Business Basics
"What's your business called?"
- Business name (text input, large)
- Industry (visual selector — grid of icons: Construction, Healthcare, Restaurant, Retail, Auto, Legal, Real Estate, HVAC, Trucking, Tech, Other)

### Screen 3: What Are You Selling?
"Describe what you offer in one sentence"
- Text area (e.g. "Merchant cash advances up to $500K, same-day funding")
- This becomes the agent's pitch foundation

### Screen 4: Your Contact Info
"Where should leads reach you?"
- Your name
- Email (becomes login)
- Phone number
- Password

### Screen 5: Agent Setup
"Name your AI sales agent"
- Agent first name (e.g. "Jacob", "Sarah", "Alex")
- Agent title (e.g. "Head of Sales", "Account Manager")
- Agent email (e.g. jacob@yourbusiness.com — where docs get sent)

### Screen 6: Conversation Style
"How should your agent talk?"
Visual cards — click to select:
- 🎯 **Professional** — "Polished and precise"
- 💬 **Casual** — "Friendly and conversational"  
- ⚡ **Urgent** — "Direct and time-sensitive"
- ❤️ **Empathetic** — "Warm and understanding"
- 💪 **Bold** — "Confident and assertive"

### Screen 7: Lead Source
"Where do your leads come from?"
Multi-select chips:
- LendingTree, Fundera, Nav, Cold List, Referral, Google Ads, Social Media, Direct/Inbound, Other

### Screen 8: Lead Age
"How old are your typical leads?"
- 0-48 hours (Fresh)
- 2-7 days
- 7-14 days
- 14-30 days
- 30-90 days
- 90+ days (Re-engagement)

### Screen 9: Documents to Collect
"What docs do you need from leads?"
Checkboxes with icons:
- 📊 Bank statements (3 months)
- 📊 Bank statements (4 months)
- 📄 MTD transactions
- 🪪 Driver's license
- 🏦 Voided check
- 📝 Payoff letter
- 📋 Tax returns
- 💰 P&L statement
- 🏢 Articles of incorporation
- 📃 EIN letter

### Screen 10: Phone Number
"Choose your agent's phone number"
- Area code preference (auto-provision via TextTorrent/AWS)
- Or port existing number

### Screen 11: Dashboard Layout
"How do you want to see your data?"
Visual layout picker — click one:
- 📊 **Overview First** — Stats + pipeline + recent activity (default)
- 👥 **Contacts First** — Contact grid front and center
- 💬 **Messages First** — Chat/inbox view like WhatsApp
- 📋 **Pipeline First** — Kanban board view

### Screen 12: Agent Capabilities
"What should your agent do?"
Toggle switches:
- 📱 SMS outreach — ON/OFF
- 📧 Email follow-ups — ON/OFF
- 🎤 Voice notes — ON/OFF
- 📞 Call bridge — ON/OFF
- 🤖 Auto-reply to leads — ON/OFF
- 📄 Document collection — ON/OFF
- ⚖️ Court records check — ON/OFF
- 🔔 Notifications to you — ON/OFF

### Screen 13: Ready!
"Your AI sales team is ready."
Big animated checkmark.
[Launch Dashboard →]

## What Happens on Submit

1. Create user account (JWT auth)
2. Provision phone number (TextTorrent sub-account)
3. Create workspace directory (copy template)
4. Inject all answers into:
   - SOUL.md (agent personality + business context)
   - OUTREACH-RULES.md (tone, lead source, messaging style)
   - REPLY-RULES.md (document collection, objection handling)
   - EMAIL-RULES.md (email templates)
   - config.json (all settings)
5. Set up cron jobs (follow-up engine, reply monitor)
6. Set dashboard layout preference
7. Enable selected agent capabilities
8. Create admin chat channel (their "brain")
9. Redirect to personalized dashboard

## Admin Chat Channel (The Brain)

Every user gets a chat channel called "Admin" or "Brain" that works like Discord:
- Talk to the system to customize their workspace
- "Move the stats to the top"
- "Change my agent's tone to more casual"
- "Show me only hot leads"
- "Add a new filter for restaurant leads"

This chat connects to a Claude Sonnet session that:
- Has access to the user's config files
- Can modify dashboard layout preferences (stored in user_preferences.json)
- Can edit agent rules (SOUL.md, RULES files)
- Can create/modify automation workflows
- Responds in plain English

The UI renders based on user_preferences.json:
```json
{
  "layout": "contacts_first",
  "dashboardWidgets": ["stats", "pipeline", "recentActivity"],
  "widgetOrder": ["contacts", "stats", "agents"],
  "filters": {
    "default": "hot",
    "custom": [
      {"name": "Restaurant Leads", "query": {"industry": "restaurant"}},
      {"name": "High Value", "query": {"amount_gte": 100000}}
    ]
  },
  "agentCapabilities": {
    "sms": true,
    "email": true,
    "voiceNotes": false,
    "callBridge": false,
    "autoReply": true,
    "docCollection": true,
    "courtSearch": true,
    "notifications": true
  },
  "theme": "dark",
  "notificationPrefs": {
    "smsReply": true,
    "docReceived": true,
    "dealUpdate": true
  }
}
```
