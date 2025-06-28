# MediZap AI Debugging Plan - Implementation Guide

## Overview
This document provides a comprehensive testing guide for the newly implemented debugging system in MediZap AI's conversational AI system.

## 1. Testing the AI Voice Chat Function

### Direct API Testing

You can test the AI voice chat function directly using these methods:

#### Method 1: Browser Console Testing
```javascript
// Open browser console and run:
const testAIVoiceChat = async () => {
  const response = await fetch('https://your-project.supabase.co/functions/v1/ai-voice-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
    },
    body: JSON.stringify({
      userInput: "I want to book an appointment",
      context: {
        clinicId: "your-clinic-id",
        clinicName: "Test Clinic",
        sessionId: "test-session-123"
      }
    })
  });
  
  const result = await response.json();
  console.log('AI Response:', result);
};

testAIVoiceChat();
```

#### Method 2: Postman/Insomnia Testing
- **URL**: `https://your-project.supabase.co/functions/v1/ai-voice-chat`
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
- **Body**:
```json
{
  "userInput": "I want to see Dr. Smith in cardiology",
  "context": {
    "clinicId": "your-clinic-id",
    "clinicName": "Test Clinic",
    "conversationState": {
      "step": "doctor",
      "intent": "appointment",
      "data": {
        "patientName": "John Doe",
        "patientPhone": "+1234567890",
        "departmentId": "dept-id",
        "departmentName": "Cardiology",
        "availableDoctors": [
          {"id": "doc1", "name": "Smith", "specialization": "Cardiology"}
        ]
      },
      "attempts": 0,
      "lastActivity": "2024-01-01T00:00:00Z"
    },
    "sessionId": "test-session-123"
  }
}
```

## 2. Sample Test Cases

### Test Case 1: Department Selection
```json
{
  "userInput": "cardiology",
  "context": {
    "clinicId": "your-clinic-id",
    "conversationState": {
      "step": "department",
      "intent": "appointment",
      "data": {
        "patientName": "John Doe",
        "patientPhone": "+1234567890",
        "availableDepartments": [
          {"id": "dept1", "name": "Cardiology"},
          {"id": "dept2", "name": "Pediatrics"}
        ]
      },
      "attempts": 0
    }
  }
}
```

### Test Case 2: Doctor Selection
```json
{
  "userInput": "Dr. Johnson",
  "context": {
    "clinicId": "your-clinic-id",
    "conversationState": {
      "step": "doctor",
      "intent": "appointment",
      "data": {
        "patientName": "John Doe",
        "patientPhone": "+1234567890",
        "departmentId": "dept1",
        "availableDoctors": [
          {"id": "doc1", "name": "Johnson", "specialization": "Cardiology"},
          {"id": "doc2", "name": "Smith", "specialization": "Cardiology"}
        ]
      },
      "attempts": 0
    }
  }
}
```

### Test Case 3: Time Selection
```json
{
  "userInput": "2 PM",
  "context": {
    "clinicId": "your-clinic-id",
    "conversationState": {
      "step": "time",
      "intent": "appointment",
      "data": {
        "patientName": "John Doe",
        "patientPhone": "+1234567890",
        "doctorId": "doc1",
        "appointmentDate": "2024-01-15",
        "availableSlots": ["14:00", "14:30", "15:00", "15:30"]
      },
      "attempts": 0
    }
  }
}
```

## 3. Monitoring Debug Output

### Browser Console Monitoring
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Run your test cases
4. Look for debug messages with these prefixes:
   - `[DEBUG]` - Information about data flow
   - `[ERROR]` - Error conditions and failures

### Expected Debug Output
You should see logs like:
```
[DEBUG] AI Voice Chat - Request received: {method: "POST", timestamp: "..."}
[DEBUG] fetchDepartments - Starting query with params: {clinicId: "...", timestamp: "..."}
[DEBUG] fetchDepartments - Query response: {data: [...], error: null, dataLength: 5}
[DEBUG] Department selection - Processing input: {input: "cardiology", availableDepartments: [...]}
[DEBUG] findBestMatch - Starting search: {input: "cardiology", itemsCount: 5, field: "name"}
[DEBUG] findBestMatch - Exact match found: {id: "dept1", name: "Cardiology"}
```

## 4. Database Verification

### Check Database Connection
```javascript
// Test Supabase connection
const testConnection = async () => {
  const { data, error } = await supabase.from('clinics').select('count').limit(1);
  console.log('Connection test:', { data, error });
};
```

### Verify Data Exists
```javascript
// Check if departments exist
const checkDepartments = async (clinicId) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);
  console.log('Departments:', { data, error });
};

// Check if doctors exist
const checkDoctors = async (clinicId, departmentId) => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('department_id', departmentId)
    .eq('is_active', true);
  console.log('Doctors:', { data, error });
};
```

## 5. Common Issues to Look For

### Issue 1: No Departments Found
**Debug Output**: `[DEBUG] fetchDepartments - Query response: {data: [], error: null, dataLength: 0}`
**Possible Causes**:
- Wrong clinic ID
- No departments created for the clinic
- Departments marked as inactive

### Issue 2: No Doctors Found
**Debug Output**: `[DEBUG] fetchDoctorsByDepartment - Query response: {data: [], error: null, dataLength: 0}`
**Possible Causes**:
- Wrong department ID
- No doctors assigned to the department
- Doctors marked as inactive

### Issue 3: Matching Failures
**Debug Output**: `[DEBUG] findBestMatch - No match found`
**Possible Causes**:
- User input doesn't match any available options
- Typos in department/doctor names
- Case sensitivity issues

## 6. Performance Monitoring

Monitor these metrics in the debug output:
- Query response times
- Number of database calls per conversation step
- Memory usage patterns
- Error frequency

## 7. Documentation Template

For each test session, document:

```
## Test Session: [Date/Time]

### Test Case: [Description]
- **Input**: [User input or API payload]
- **Expected**: [Expected behavior]
- **Actual**: [What actually happened]
- **Debug Output**: [Relevant console logs]
- **Issues Found**: [Any problems identified]
- **Resolution**: [How issues were fixed]

### Database State:
- **Clinic ID**: [ID used]
- **Departments Count**: [Number available]
- **Doctors Count**: [Number available]
- **Active Status**: [All active/inactive items]

### Performance:
- **Response Time**: [Time taken]
- **Database Queries**: [Number of queries]
- **Memory Usage**: [If applicable]
```

## 8. Next Steps

After implementing this debugging plan:

1. **Run Initial Tests**: Execute all test cases and document results
2. **Identify Patterns**: Look for common failure points
3. **Optimize Queries**: Based on performance data
4. **Enhance Error Handling**: Add more specific error messages
5. **Create Monitoring Dashboard**: For production monitoring

## 9. Production Considerations

Before deploying to production:
- Remove or reduce debug logging verbosity
- Implement proper error tracking (e.g., Sentry)
- Set up monitoring alerts
- Create automated tests based on findings