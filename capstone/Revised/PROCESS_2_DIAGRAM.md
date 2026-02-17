# PROCESS 2: PROVIDER REGISTRATION

## Level 1 DFD - Provider Registration Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 2: PROVIDER REGISTRATION                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │   PROVIDER   │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Registration Info                                          
           │ (Name, Email, Phone)                                       
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      2.1      │                                                   
    │ COLLECT INFO  │                                                   
    │               │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Personal Details                                          
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      2.2      │                                                   
    │ VERIFY EMAIL  │──────────────┐                                   
    │               │              │ Request Code                       
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║ EMAIL SERVICE ║                           
            │              ║    (Brevo)    ║                           
            │              ║               ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │                      │ Send Code                         
            │                      │                                   
            │                      ▼                                   
            │              ┌──────────────┐                            
            │              │              │                            
            │              │   PROVIDER   │                            
            │              │              │                            
            │              └──────┬───────┘                            
            │                     │                                    
            │ Verification Code   │                                    
            │◄────────────────────┘                                    
            │                                                           
            │ Verified Email                                            
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      2.3      │                                                   
    │ VERIFY PHONE  │──────────────┐                                   
    │               │              │ Request OTP                        
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║  SMS SERVICE  ║                           
            │              ║  (Semaphore)  ║                           
            │              ║               ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │                      │ Send OTP                          
            │                      │                                   
            │                      ▼                                   
            │              ┌──────────────┐                            
            │              │              │                            
            │              │   PROVIDER   │                            
            │              │              │                            
            │              └──────┬───────┘                            
            │                     │                                    
            │ OTP Code            │                                    
            │◄────────────────────┘                                   
            │                                                           
            │ Verified Phone                                            
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      2.4      │                                                   
    │UPLOAD DOCUMENTS│                                                  
    │               │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Documents (ID, Selfie,                                    
            │ Clearances, Profile Photo)                                
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      2.5      │                                                   
    │SELECT SERVICES│                                                   
    │               │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Service Categories                                        
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      2.6      │                                                   
    │ CREATE ACCOUNT│──────────────┐                                   
    │               │              │ Store Data                         
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║    USERS      ║                           
            │              ║  (Firestore)  ║                           
            │              ║               ║                           
            │              ╚═══════════════╝                           
            │                      │                                   
            │ Pending Status       │ Confirmation                      
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │              │       │              │                           
    │   PROVIDER   │◄──────│   PROVIDER   │                           
    │              │       │              │                           
    └──────────────┘       └──────────────┘                           
    Awaiting Approval      Pending Message                             
```

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **2.1** | Collect Info | Provider enters personal information (name, email, phone, password) |
| **2.2** | Verify Email | System sends verification code to email, provider enters code to verify |
| **2.3** | Verify Phone | System sends OTP to phone number, provider enters OTP to verify |
| **2.4** | Upload Documents | Provider uploads required documents (Valid ID, Selfie with ID, Barangay Clearance, Police Clearance, Profile Photo) |
| **2.5** | Select Services | Provider selects service categories they can provide |
| **2.6** | Create Account | System creates provider account with "PENDING" status and stores data in Firestore |

## Data Flows

- **Registration Info**: Name, email, phone number, password from provider
- **Personal Details**: Validated registration information
- **Request Code**: System requests email verification code from Brevo Email Service
- **Send Code**: Brevo Email Service sends 6-digit verification code to provider's email
- **Verification Code**: Provider enters 6-digit code received via email
- **Verified Email**: Confirmation that email is verified
- **Request OTP**: System requests SMS OTP from Semaphore SMS Service
- **Send OTP**: Semaphore SMS Service sends 6-digit OTP to provider's phone
- **OTP Code**: Provider enters 6-digit OTP received via SMS
- **Verified Phone**: Confirmation that phone is verified
- **Documents**: Valid ID, Selfie with ID, Barangay Clearance, Police Clearance, Profile Photo
- **Service Categories**: List of services provider can offer
- **Store Data**: Save provider account data to Firestore with PENDING status
- **Pending Status**: Account created but awaiting admin approval
- **Confirmation**: Database confirms data stored
- **Awaiting Approval**: Provider notified account is pending admin review
- **Pending Message**: System sends notification that account is under review

## External Services

- **Email Service (Brevo)**: Third-party service that sends verification codes to provider's email address
- **SMS Service (Semaphore)**: Third-party service that sends OTP codes to provider's phone number via SMS
