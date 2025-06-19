# MediZap AI - Clinic Voice Agent System

A comprehensive clinic management system with AI-powered voice agent for automated appointment booking via phone calls.

## 🚀 Features

- **MediZap AI Voice Agent**: Natural conversation flow using ElevenLabs for speech synthesis and Twilio for telephony
- **Real-time Appointments**: Instant booking and live dashboard updates using Supabase
- **Clinic Management**: Manage departments, doctors, schedules, and availability
- **Call Center Analytics**: Monitor AI agent performance and conversation logs
- **Beautiful Dashboard**: Modern, responsive interface with real-time updates
- **Secure & Scalable**: Built with Supabase, proper authentication, and secure API handling

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Edge Functions
- **Voice AI**: ElevenLabs API for speech synthesis
- **Telephony**: Twilio Voice API for call handling
- **Real-time**: Supabase real-time subscriptions
- **Deployment**: Vite build system, ready for production

## 🎯 Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Run the database migrations:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run each migration file in `supabase/migrations/` in order

### 3. Configure Environment Variables

Create a `.env` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twilio Configuration (for voice agent)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# ElevenLabs Configuration (for voice synthesis)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id

# Application Configuration
VITE_APP_URL=http://localhost:5173
CLINIC_TRANSFER_NUMBER=+1-555-CLINIC
```

### 4. Deploy Edge Functions

Install Supabase CLI and deploy the voice agent functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy edge functions
supabase functions deploy voice-agent
supabase functions deploy twilio-webhook
```

### 5. Run the Application

```bash
npm run dev
```

## 📞 MediZap AI Voice Agent Setup

### ElevenLabs Configuration

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Create or select a voice model (recommended: professional, clear voice)
3. Get your API key from the profile section
4. Copy the Voice ID from your selected voice
5. Add both to your `.env` file

### Twilio Configuration

1. Create a Twilio account at [twilio.com](https://twilio.com)
2. Purchase a phone number with voice capabilities
3. Configure webhook URL in Twilio Console:
   ```
   https://your-project.supabase.co/functions/v1/twilio-webhook
   ```
4. Set webhook method to `POST`
5. Add your Twilio credentials to environment variables

### Voice Agent Features

- **Natural Conversation**: Handles complex appointment booking flows
- **Department Selection**: Automatically lists available departments
- **Doctor Availability**: Real-time checking of doctor schedules
- **Date/Time Parsing**: Understands various date and time formats
- **Appointment Confirmation**: Confirms details before booking
- **Error Handling**: Graceful fallback to human transfer
- **Call Logging**: Comprehensive conversation and performance tracking

## 📊 Database Schema

The system uses the following main tables:

- **clinics**: Clinic information and contact details
- **departments**: Medical departments within each clinic
- **doctors**: Doctor profiles with availability schedules
- **appointments**: Patient appointments with real-time updates
- **call_logs**: Voice agent call history and analytics
- **conversation_logs**: Detailed conversation transcripts

## 🔧 API Documentation

### MediZap AI Voice Agent Endpoint

```
POST /functions/v1/voice-agent
```

Processes voice input and returns AI-generated responses for appointment booking.

**Request Body:**
```json
{
  "userInput": "I'd like to book an appointment",
  "context": {
    "clinicId": "uuid",
    "callerPhone": "+1234567890",
    "callSid": "twilio-call-id",
    "conversationState": {}
  },
  "config": {
    "elevenLabsApiKey": "your-key",
    "elevenLabsVoiceId": "voice-id"
  }
}
```

### Twilio Webhook

```
POST /functions/v1/twilio-webhook
```

Handles incoming Twilio voice calls and integrates with the MediZap AI voice agent.

## 🎨 Features Overview

### Dashboard
- Real-time appointment tracking
- MediZap AI voice agent status monitoring
- Quick stats and analytics
- Live updates when new appointments are booked

### MediZap AI Voice Agent Capabilities
- Natural conversation flow with context awareness
- Department and doctor selection with real-time availability
- Intelligent date/time parsing (supports "tomorrow", "next Monday", etc.)
- Appointment booking with confirmation
- Automatic fallback to human transfer when needed
- Comprehensive error handling and retry logic

### Call Center Analytics
- Real-time call monitoring
- Conversation transcripts and logs
- Performance metrics (success rate, average duration)
- Call volume analytics

### Appointment Management
- Automatic conflict detection
- Real-time availability updates
- Patient contact information
- Appointment status tracking
- Bulk operations and filtering

### Doctor Management
- Availability schedule configuration
- Department-based specialization
- Real-time schedule updates
- Performance tracking

## 🚀 Production Deployment

### Frontend Deployment
The application is ready for deployment to any static hosting service:

```bash
npm run build
```

Deploy the `dist` folder to:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static hosting provider

### Backend Requirements
- Supabase project with deployed edge functions
- Configured environment variables in Supabase
- SSL certificate for webhook endpoints (automatic with Supabase)

### Twilio Production Setup
1. Verify your Twilio account for production use
2. Purchase a dedicated phone number
3. Configure production webhook URLs
4. Set up call recording (optional, with patient consent)
5. Configure call forwarding for human transfer

### Security Considerations
- All API keys stored securely in Supabase environment
- Row Level Security (RLS) enabled on all tables
- HTTPS enforced for all webhook endpoints
- Input validation and sanitization
- Rate limiting on API endpoints

## 🔒 Security Features

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Role-based access control (admin, staff, doctor)
- **Data Protection**: Row Level Security on all database tables
- **API Security**: Secure API key management
- **Input Validation**: Comprehensive input sanitization
- **HTTPS**: All communications encrypted

## 📈 Monitoring & Analytics

### Call Analytics
- Total calls handled by AI agent
- Appointment booking success rate
- Average call duration
- Patient satisfaction metrics
- Peak call times and patterns

### Performance Metrics
- AI response time
- Conversation completion rate
- Transfer to human rate
- System uptime and reliability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly with both manual and automated tests
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation and setup guides
- Review the example configurations
- Contact support for enterprise deployments

## 🎯 Roadmap

- [ ] Multi-language support for voice agent
- [ ] SMS appointment reminders
- [ ] Video consultation integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app for clinic staff
- [ ] Integration with popular EMR systems
- [ ] WhatsApp Business API integration
- [ ] Advanced AI training and customization

---

Built with ❤️ for modern healthcare management powered by **MediZap AI**

### 🌟 Key Differentiators

- **Production-Ready**: Enterprise-grade architecture and security
- **Real-Time**: Instant updates across all components
- **Scalable**: Built to handle high call volumes
- **Intelligent**: Advanced AI with natural conversation capabilities
- **Comprehensive**: Complete clinic management solution
- **Modern**: Beautiful, responsive UI with excellent UX