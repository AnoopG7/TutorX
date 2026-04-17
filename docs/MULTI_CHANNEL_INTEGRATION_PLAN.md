# CBSE Study Agent - Multi-Channel Integration

## Overview
Users access CBSE Study Agent via:
1. **Website** (React + Vite on Vercel) - Full study dashboard
2. **Telegram Bot** (@cbse_study_bot) - Quick concept queries

---

## Telegram Bot (@cbse_study_bot)

### How It Works (RAG-Powered)
```
Student question on Telegram
    ↓
API receives question + generates embedding
    ↓
Supabase pgvector searches textbook chunks
    ↓
Top 5 most relevant chunks retrieved
    ↓
Groq LLM generates answer from chunks
    ↓
Bot sends answer with citations
    ↓
"Source: Chapter 3, Page 12 - Photosynthesis"
```

### Commands
```
/start          → Welcome + Account linking
/ask            → Query textbook content
/practice       → Get practice problems
/summary        → Chapter summary
/schedule       → View study reminders
/progress       → Learning progress tracker
/help           → Show all commands
/settings       → Notification preferences
/link_account   → Link to website account
```

### Quick Actions (Inline Buttons)
```
[✅ Mark Concept Learned] [📝 Try Practice] [💾 Save for Later]
[📱 View Full Content]    [🔗 Open in App]
```

### Example Interactions

**Scenario 1: Quick Concept Query**
```
User: "What is photosynthesis?" @cbse_study_bot
Bot:   "🌱 Photosynthesis - Quick Summary
        Process where plants convert light to energy...
        
        [📖 Full Explanation] [📝 Try Practice] [💾 Save]"

User clicks: [📖 Full Explanation]
Bot: Links to website with detailed content
```

---

## Website Features

### Study Interface (RAG-Powered Answers)
- Concept explanations (generated from textbook via RAG)
- Interactive diagrams
- Related concepts
- Video links (optional)
- **Citations:** Every answer shows exact chapter/page source
- **Confidence score:** Shows how closely answer matches the question

### Student Dashboard
- Recent studies & progress
- Weak topics identified by AI
- Suggested concepts to study
- Practice test results

### Study Interface
- Concept explanations (AI-generated via Groq)
- Interactive diagrams
- Related concepts
- Video links (optional)

### Practice Module
- Chapter-wise practice questions
- Topic-wise tests
- Full mock exams
- Answer explanations

### Progress Tracking
- Chapter completion status
- Concept mastery levels
- Quiz performance history
- Weak topics analysis

### Settings
- Notification preferences
- Telegram bot linking
- Study schedule setup
- Email frequency

---

## Notification System

### Automated Notifications

**Daily Study Reminders** (8 AM)
- Telegram: "📚 Time to study! Today's topic: Acids and Bases"
- Email: Daily digest of topics to cover
- In-app: Dashboard notification

**Practice Reminders** (Daily at 6 PM)
- Telegram: "📝 Have you practiced today?"
- Push: Quick notification

**Weekly Summary** (Every Sunday)
- Email: Week's progress, weak topics, recommendations
- Telegram: Weekly stats summary

**Quiz Results** (Immediately)
- Telegram: Score, performance feedback
- In-app: Detailed analysis

### User Preferences
```json
{
  "notifications": {
    "study_reminders": {
      "enabled": true,
      "time": "08:00",
      "channels": ["telegram", "email"]
    },
    "practice_reminders": {
      "enabled": true,
      "time": "18:00",
      "channels": ["telegram"]
    },
    "weekly_summary": {
      "enabled": true,
      "day": "Sunday",
      "time": "10:00",
      "channels": ["email"]
    }
  }
}
```

---

## Account Linking

### Flow
```
1. User taps /start on Telegram
2. Bot: "Link your account to access saved progress!"
3. Bot sends: "Link here: https://cbse.app/link?code=ABC123"
4. User clicks link → Website
5. User signs in (or creates account)
6. System confirms Telegram ID + Code
7. Bot confirms: "✅ Account linked!"
8. User's progress now synced across devices
```

### Backend Implementation
```javascript
// Generate linking code
app.post('/api/auth/generate-link-code', async (req, res) => {
  const code = generateCode(6); // ABC123
  await LinkingCode.create({
    code: code,
    agent: 'cbse_study',
    expires: Date.now() + 1*60*60*1000, // 1 hour
    used: false
  });
  
  // Send to Telegram bot
  await bot.telegram.sendMessage(
    telegramId,
    `Link here: https://cbse.app/link?code=${code}`
  );
  res.json({ success: true });
});

// Complete linking
app.post('/api/auth/link-telegram', async (req, res) => {
  const { code, userId, telegramId } = req.body;
  
  const linkingCode = await LinkingCode.findOne({ code, agent: 'cbse_study' });
  if (!linkingCode || linkingCode.expires < Date.now()) {
    return res.status(400).json({ error: 'Invalid code' });
  }
  
  await User.findByIdAndUpdate(userId, {
    telegram_id: telegramId,
    telegram_linked: true
  });
  
  await LinkingCode.deleteOne({ code });
  res.json({ success: true });
});
```

---

## Real-Time Sync

### Cross-Device Updates
```
User updates progress on Website
  ↓
Backend updates Supabase
  ↓
WebSocket broadcasts update
  ├─ → Other web sessions (real-time)
  ├─ → Mobile app (if using same account)
  └─ → Telegram bot (next interaction)
```

### Real-Time Sync (python-socketio)
```python
# Concept marked as learned
socket.emit('concept:marked-learned', {
    'conceptId': '123',
    'timestamp': time.time()
})

# Listen on other sessions
@socket.on('concept:marked-learned')
def on_concept_learned(data):
    update_progress_ui(data['conceptId'])

# Notify Telegram (if user has bot linked)
if user.telegram_linked:
    await bot.send_message(
        chat_id=user.telegram_id,
        text=f"✅ Marked '{concept_name}' as learned!"
    )
```
    user.telegram_id,
    `✅ You've mastered: ${concept.name}`
  );
}
```

---

## Message Routing

### Channel Decision Logic
```
Event: New quiz result
  ↓
Check user preferences
  ├─ Telegram preference? → Send via Telegram
  ├─ Email preference? → Add to digest
  └─ In-app? → Show on dashboard
  ↓
All channels deliver simultaneously
```

---

## Email Templates

### Daily Reminder
```
Subject: 📚 Study Time - Photosynthesis Awaits

Hi [Student Name],

Ready to learn today? Your scheduled topic is:

📖 PHOTOSYNTHESIS
   - Key concepts you'll learn
   - Time to complete: 45 minutes
   - 5 practice questions ready

[Start Learning] [View Schedule]

Remember: Consistency is key to success! 💪
```

### Weekly Progress
```
Subject: 📊 Your Study Progress This Week

Hi [Student Name],

Here's what you accomplished this week:

📈 Progress Overview
   - 12 concepts learned (+2 from last week)
   - 5 practice tests completed (Avg: 78%)
   - Study time: 4.5 hours

⚡ Highlights
   - You're mastering: Chemical Reactions
   - Weak topic: Periodic Table (recommended to review)
   - Next: Thermal Energy & Heat

[View Full Dashboard] [Review Weak Topics]
```

---

## Features by Channel

| Feature | Website | Telegram | Email |
|---------|---------|----------|-------|
| Learn concepts | ✅ Full | ⚠️ Summary | ❌ |
| Practice questions | ✅ Interactive | ⚠️ Basic | ❌ |
| View progress | ✅ Detailed | ⚠️ Quick stats | ⚠️ Weekly |
| Get reminders | ✅ Yes | ✅ Yes | ✅ Yes |
| Mark concepts learned | ✅ Yes | ✅ Yes | ❌ |
| View explanations | ✅ Full | ⚠️ Summary | ❌ |
| Chat with AI | ✅ Yes | ✅ Yes | ❌ |

---

## Data Model Extensions

### User Telegram Integration
```json
{
  "user_id": "user_123",
  "telegram": {
    "telegram_id": "123456789",
    "username": "@johndoe",
    "linked": true,
    "linked_date": "2026-04-17T10:00:00Z"
  },
  "notification_settings": {
    "daily_reminders": { "enabled": true, "time": "08:00" },
    "practice_reminders": { "enabled": true, "time": "18:00" },
    "weekly_summary": { "enabled": true, "day": "Sunday" },
    "channels": {
      "telegram": true,
      "email": true,
      "in_app": true
    }
  }
}
```

---

## Implementation Steps

### Phase 1: Setup (Week 1)
- [ ] Create Telegram bot via @BotFather
- [ ] Set up webhook for bot messages
- [ ] Create account linking system
- [ ] Build "link account" UI on website

### Phase 2: Bot Commands (Week 2)
- [ ] Implement /start, /help, /settings
- [ ] Implement /ask command
- [ ] Implement /practice command
- [ ] Implement /progress command

### Phase 3: Notifications (Week 3)
- [ ] Set up notification preferences
- [ ] Create email templates
- [ ] Schedule daily/weekly notifications
- [ ] Route notifications to channels

### Phase 4: Integration (Week 4)
- [ ] Test cross-device sync
- [ ] Test all commands
- [ ] Beta test with students
- [ ] Deploy to production

---

## Success Metrics
- Telegram bot daily active users
- Message response time < 1 second
- Account linking success rate > 95%
- Notification delivery rate > 98%
- User engagement (usage frequency)

---

## Future Enhancements
- Question clarification via Telegram voice
- Photo-based concept queries ("Send photo of problem")
- Study group collaboration
- Peer tutoring matching
- Parent progress notifications
