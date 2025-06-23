# MediZap AI - Clinic Voice Agent System

A comprehensive clinic management system with AI-powered voice agent for automated appointment booking via phone calls and QR-based walk-in registration.

## 🚀 Features

### Core Features
- **MediZap AI Voice Agent**: Natural conversation flow using ElevenLabs for speech synthesis and OpenAI Whisper for transcription
- **Advanced Transcription**: Dual-layer speech recognition with Twilio's built-in recognition and OpenAI Whisper fallback
- **Multi-language Support**: Supports English and regional languages (e.g., Malayalam) for voice interactions
- **Real-time Appointments**: Instant booking and live dashboard updates using Supabase
- **Clinic Management**: Manage departments, doctors, schedules, and availability
- **Call Center Analytics**: Monitor AI agent performance and conversation logs
- **Beautiful Dashboard**: Modern, responsive interface with real-time updates

### NEW: QR-Based Walk-In Registration
- **Unique QR Codes**: Each clinic gets a unique QR code for walk-in registration
- **Human-Readable URLs**: Clean URLs like `/walkin/clinic-name` for easy access
- **Mobile-Friendly Forms**: Responsive registration forms optimized for mobile devices
- **Real-Time Updates**: Walk-in registrations appear instantly in the admin dashboard
- **QR Code Management**: Generate, download, and print QR codes for clinics
- **Public Registration**: No login required for patients to register as walk-ins

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Edge Functions
- **Voice AI**: ElevenLabs API for speech synthesis, OpenAI Whisper for transcription
- **Telephony**: Twilio Voice API for call handling
- **QR Codes**: QR Server API for QR code generation
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

# OpenAI Configuration (for Whisper transcription)
OPENAI_API_KEY=your_openai_api_key

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
supabase functions deploy whisper-transcribe

# Set environment variables for edge functions
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_api_key
supabase secrets set ELEVENLABS_VOICE_ID=your_voice_id
supabase secrets set CLINIC_TRANSFER_NUMBER=your_clinic_phone_number
```

### 5. Configure Twilio Webhook

1. Log in to your Twilio Console
2. Navigate to Phone Numbers → Manage → Active numbers
3. Select your phone number
4. In the "Voice & Fax" section, set:
   - **A call comes in**: Webhook
   - **URL**: `https://your-project.supabase.co/functions/v1/twilio-webhook`
   - **HTTP Method**: POST
5. Save the configuration

### 6. Run the Application

```bash
npm run dev
```

## 📞 QR-Based Walk-In Registration Setup

### How It Works

1. **Clinic Slug Generation**: Each clinic automatically gets a unique slug (e.g., `downtown-medical-center`)
2. **QR Code Creation**: System generates QR codes pointing to `/walkin/{clinic-slug}`
3. **Patient Registration**: Patients scan QR code and fill out mobile-friendly form
4. **Real-Time Updates**: Walk-in registrations appear instantly in clinic dashboard

### QR Code Features

- **Auto-Generated Slugs**: Slugs are automatically created from clinic names
- **Unique URLs**: Each clinic has a unique, human-readable registration URL
- **Downloadable QR Codes**: Download individual or bulk QR codes as PNG files
- **Printable Formats**: Print-optimized QR codes with clinic information
- **Mobile Optimization**: Registration forms work perfectly on all devices

### Walk-In Management

- **Real-Time Dashboard**: See all walk-in registrations as they happen
- **Status Management**: Update patient status (waiting, in-progress, completed, cancelled)
- **Patient Information**: Full patient details including reason for visit
- **Search & Filter**: Find patients quickly by name, ID, or status

## 📊 Database Schema

The system uses the following main tables:

- **clinics**: Clinic information with unique slugs for QR codes
- **departments**: Medical departments within each clinic
- **doctors**: Doctor profiles with availability schedules
- **appointments**: Patient appointments with real-time updates
- **walk_ins**: Walk-in patient registrations from QR code forms
- **call_logs**: Voice agent call history and analytics
- **conversation_logs**: Detailed conversation transcripts

### New QR Code Schema

```sql
-- Clinics table now includes slug column
ALTER TABLE clinics ADD COLUMN slug text UNIQUE;

-- Walk-ins table structure
CREATE TABLE walk_ins (
  id bigint PRIMARY KEY,
  patient_name text,
  patient_id integer,
  date_of_birth date,
  Gender text,
  contact_number numeric,
  reason_for_visit text,
  status text,
  created_at timestamptz DEFAULT now()
);
```

## 🔧 API Documentation

### QR Code Registration Endpoint

```
GET /walkin/{clinic-slug}
```

Public endpoint that displays the walk-in registration form for the specified clinic.

### Walk-In Registration API

```
POST /api/walk-ins
```

Submits walk-in registration data to the database.

**Request Body:**
```json
{
  "patient_name": "John Doe",
  "date_of_birth": "1990-01-01",
  "Gender": "Male",
  "contact_number": "+1234567890",
  "reason_for_visit": "Routine checkup"
}
```

## 🎨 Features Overview

### QR Code Management
- **Clinic-Specific QR Codes**: Each clinic gets a unique QR code
- **Bulk Operations**: Download or print all QR codes at once
- **URL Management**: View and regenerate clinic URLs
- **Testing Interface**: Test registration forms directly from admin panel

### Walk-In Registration
- **Mobile-First Design**: Optimized for smartphone use
- **Offline Capability**: Forms work even with poor connectivity
- **Validation**: Comprehensive form validation with helpful error messages
- **Success Confirmation**: Clear confirmation with patient ID

### Admin Dashboard
- **Real-Time Updates**: See registrations as they happen
- **Status Management**: Update patient status with dropdown menus
- **Search & Filter**: Find patients by name, ID, status, or date
- **Export Capabilities**: Export walk-in data for reporting

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

### QR Code Setup for Production

1. **Domain Configuration**: Update QR codes to use your production domain
2. **SSL Certificate**: Ensure HTTPS is enabled for security
3. **Mobile Testing**: Test QR codes on various mobile devices
4. **Print Quality**: Verify QR codes print clearly at different sizes

## 🔒 Security Features

- **Public Registration**: Walk-in forms are public but secure
- **Input Validation**: Comprehensive validation on all form inputs
- **Rate Limiting**: Prevent spam registrations
- **Data Encryption**: All data encrypted in transit and at rest
- **GDPR Compliance**: Patient data handling follows privacy regulations

## 📱 Mobile Optimization

### QR Code Scanning
- **Camera Integration**: Works with built-in camera apps
- **QR Code Readers**: Compatible with all major QR code apps
- **Fallback URLs**: Manual URL entry if QR scanning fails

### Mobile Form Experience
- **Touch-Friendly**: Large buttons and inputs for easy touch interaction
- **Auto-Focus**: Smart field focusing for faster completion
- **Keyboard Optimization**: Appropriate keyboards for different input types
- **Offline Support**: Forms work even with poor connectivity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/qr-registration`)
3. Make your changes
4. Test thoroughly with QR codes and mobile devices
5. Commit your changes (`git commit -m 'Add QR-based walk-in registration'`)
6. Push to the branch (`git push origin feature/qr-registration`)
7. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the QR code setup documentation
- Review the mobile optimization guides
- Contact support for enterprise deployments

## 🎯 Roadmap

- [x] QR-based walk-in registration
- [x] Mobile-optimized registration forms
- [x] Real-time walk-in dashboard
- [x] Bulk QR code management
- [ ] SMS notifications for walk-in status updates
- [ ] Integration with appointment scheduling
- [ ] Advanced analytics for walk-in patterns
- [ ] Multi-language support for registration forms
- [ ] Kiosk mode for in-clinic registration tablets

---

Built with ❤️ for modern healthcare management powered by **MediZap AI**

### 🌟 Key Differentiators

- **QR Code Innovation**: First-of-its-kind QR-based patient registration
- **Mobile-First**: Designed specifically for smartphone users
- **Real-Time Updates**: Instant synchronization across all devices
- **Production-Ready**: Enterprise-grade architecture and security
- **Scalable**: Built to handle unlimited clinics and registrations
- **User-Friendly**: Intuitive interface for both patients and staff