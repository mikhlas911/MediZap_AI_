# AI Agent Setup Guide for MediZap AI

This guide explains how to configure your ElevenLabs Conversational AI agent to securely access MediZap AI's Supabase Edge Functions.

## Overview

The MediZap AI system uses custom secret authentication to allow your AI agent to securely access the database through Edge Functions. This approach is simple, efficient, and secure.

## Step 1: Set the Secret in Supabase

First, you need to set the `ELEVENLABS_FUNCTION_SECRET` environment variable in your Supabase project.

### Using Supabase CLI:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (replace with your project reference)
supabase link --project-ref your-project-ref

# Set the secret (replace with a strong, unique secret)
supabase secrets set ELEVENLABS_FUNCTION_SECRET=your-super-secret-key-here
```

### Using Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. In the Environment Variables section, add:
   - **Name**: `ELEVENLABS_FUNCTION_SECRET`
   - **Value**: `your-super-secret-key-here` (use a strong, unique secret)
4. Click "Add variable"

## Step 2: Configure ElevenLabs Custom Tools

In your ElevenLabs Conversational AI agent, you need to configure custom tools to call the MediZap AI Edge Functions with the secret header.

### Tool 1: Get Departments

**Tool Name**: `get-departments`
**Description**: Fetch available departments for a clinic
**URL**: `https://your-project.supabase.co/functions/v1/get-departments`
**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "X-Elevenlabs-Secret": "your-super-secret-key-here"
}
```

**Request Body Schema**:
```json
{
  "type": "object",
  "properties": {
    "clinicId": {
      "type": "string",
      "description": "The clinic ID to fetch departments for"
    },
    "isActive": {
      "type": "boolean",
      "description": "Filter by active departments only",
      "default": true
    }
  },
  "required": ["clinicId"]
}
```

### Tool 2: Get Doctors

**Tool Name**: `get-doctors`
**Description**: Fetch available doctors for a clinic or department
**URL**: `https://your-project.supabase.co/functions/v1/get-doctors`
**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "X-Elevenlabs-Secret": "your-super-secret-key-here"
}
```

**Request Body Schema**:
```json
{
  "type": "object",
  "properties": {
    "clinicId": {
      "type": "string",
      "description": "The clinic ID to fetch doctors for"
    },
    "departmentId": {
      "type": "string",
      "description": "Filter doctors by department ID"
    },
    "isActive": {
      "type": "boolean",
      "description": "Filter by active doctors only",
      "default": true
    },
    "includeAvailability": {
      "type": "boolean",
      "description": "Include doctor availability information",
      "default": true
    }
  },
  "required": ["clinicId"]
}
```

### Tool 3: Book Appointment

**Tool Name**: `book-appointment`
**Description**: Book an appointment for a patient
**URL**: `https://your-project.supabase.co/functions/v1/book-appointment`
**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "X-Elevenlabs-Secret": "your-super-secret-key-here"
}
```

**Request Body Schema**:
```json
{
  "type": "object",
  "properties": {
    "clinicId": {
      "type": "string",
      "description": "The clinic ID"
    },
    "patientName": {
      "type": "string",
      "description": "Patient's full name"
    },
    "patientPhone": {
      "type": "string",
      "description": "Patient's phone number"
    },
    "patientEmail": {
      "type": "string",
      "description": "Patient's email address (optional)"
    },
    "doctorId": {
      "type": "string",
      "description": "The selected doctor's ID"
    },
    "departmentId": {
      "type": "string",
      "description": "The department ID"
    },
    "appointmentDate": {
      "type": "string",
      "description": "Appointment date in YYYY-MM-DD format"
    },
    "appointmentTime": {
      "type": "string",
      "description": "Appointment time in HH:MM format (24-hour)"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes for the appointment"
    }
  },
  "required": ["clinicId", "patientName", "patientPhone", "doctorId", "departmentId", "appointmentDate", "appointmentTime"]
}
```

## Step 3: Test the Configuration

### Test with curl:

```bash
# Test get-departments
curl -X POST https://your-project.supabase.co/functions/v1/get-departments \
  -H "Content-Type: application/json" \
  -H "X-Elevenlabs-Secret: your-super-secret-key-here" \
  -d '{"clinicId": "your-clinic-id"}'

# Test get-doctors
curl -X POST https://your-project.supabase.co/functions/v1/get-doctors \
  -H "Content-Type: application/json" \
  -H "X-Elevenlabs-Secret: your-super-secret-key-here" \
  -d '{"clinicId": "your-clinic-id", "includeAvailability": true}'
```

### Expected Response Format:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 5,
    "count": 5,
    "limit": null,
    "offset": 0,
    "hasMore": false
  },
  "filters": {
    "clinicId": "your-clinic-id",
    "isActive": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Step 4: AI Agent Conversation Flow

Here's a recommended conversation flow for your AI agent:

1. **Greeting**: Welcome the patient and ask how you can help
2. **Intent Detection**: Determine if they want to book an appointment or register as walk-in
3. **Patient Information**: Collect name and phone number
4. **Department Selection**: Use `get-departments` to show available departments
5. **Doctor Selection**: Use `get-doctors` to show available doctors in the selected department
6. **Date/Time Selection**: Show available slots from doctor's availability
7. **Confirmation**: Review all details with the patient
8. **Booking**: Use `book-appointment` to create the appointment
9. **Confirmation**: Provide appointment details and ID

## Security Best Practices

1. **Keep the Secret Secure**: Never expose the `ELEVENLABS_FUNCTION_SECRET` in client-side code
2. **Use Strong Secrets**: Generate a long, random secret key (at least 32 characters)
3. **Rotate Secrets**: Periodically update the secret for enhanced security
4. **Monitor Logs**: Check Edge Function logs for any unauthorized access attempts

## Troubleshooting

### Common Issues:

1. **401 Unauthorized**: Check that the `X-Elevenlabs-Secret` header is included and matches the configured secret
2. **500 Internal Server Error**: Verify that Supabase environment variables are set correctly
3. **Empty Response**: Ensure the clinic ID exists and has active departments/doctors

### Debug Mode:

The Edge Functions include extensive logging. Check the Supabase Edge Functions logs for detailed debug information about each request.

## Example ElevenLabs Agent Prompt

```
You are MediZap AI, a helpful medical appointment booking assistant. You can:

1. Help patients book appointments by:
   - Getting their name and phone number
   - Showing available departments using get-departments tool
   - Showing available doctors using get-doctors tool
   - Booking appointments using book-appointment tool

2. Always be polite, professional, and clear
3. Confirm all details before booking
4. Provide appointment ID after successful booking

When a patient wants to book an appointment:
1. Ask for their name and phone number
2. Use get-departments with the clinic ID to show available departments
3. Once they choose a department, use get-doctors to show available doctors
4. Help them select a date and time from the doctor's availability
5. Confirm all details and use book-appointment to create the appointment
6. Provide the appointment ID and details

Always use the provided tools to access real-time data from the clinic's system.
```

## Support

If you encounter any issues:
1. Check the Edge Function logs in your Supabase dashboard
2. Verify all environment variables are set correctly
3. Test the endpoints manually using curl or Postman
4. Ensure your ElevenLabs agent configuration matches this guide exactly