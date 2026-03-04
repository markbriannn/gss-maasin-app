# PROCESS 1: CLIENT REGISTRATION

## Level 1 DFD - Client Registration Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PROCESS 1: CLIENT REGISTRATION                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │    CLIENT    │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Registration Info                                          
           │ (Name, Email, Phone)                                       
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      1.1      │                                                   
    │ COLLECT INFO  │                                                   
    │               │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Personal Details                                          
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      1.2      │                                                   
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
            │              │    CLIENT    │                            
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
    │      1.3      │                                                   
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
            │              │    CLIENT    │                            
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
    │      1.4      │                                                   
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
            │ Success              │ Confirmation                      
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │              │       │              │                           
    │    CLIENT    │◄──────│    CLIENT    │                           
    │              │       │              │                           
    └──────────────┘       └──────────────┘                           
    Account Created        Welcome Message                             
```

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **1.1** | Collect Info | Client enters personal information (name, email, phone, password) |
| **1.2** | Verify Email | System sends verification code to email, client enters code to verify |
| **1.3** | Verify Phone | System sends OTP to phone number, client enters OTP to verify |
| **1.4** | Create Account | System creates client account and stores data in Firestore database |

## Data Flows

- **Registration Info**: Name, email, phone number, password from client
- **Personal Details**: Validated registration information
- **Request Code**: System requests email verification code from Brevo Email Service
- **Send Code**: Brevo Email Service sends 6-digit verification code to client's email
- **Verification Code**: Client enters 6-digit code received via email
- **Verified Email**: Confirmation that email is verified
- **Request OTP**: System requests SMS OTP from Semaphore SMS Service
- **Send OTP**: Semaphore SMS Service sends 6-digit OTP to client's phone
- **OTP Code**: Client enters 6-digit OTP received via SMS
- **Verified Phone**: Confirmation that phone is verified
- **Store Data**: Save client account data to Firestore
- **Success**: Account creation successful
- **Confirmation**: Database confirms data stored
- **Account Created**: Client receives confirmation of account creation
- **Welcome Message**: System sends welcome notification to client

## External Services

- **Email Service (Brevo)**: Third-party service that sends verification codes to client's email address
- **SMS Service (Semaphore)**: Third-party service that sends OTP codes to client's phone number via SMS
