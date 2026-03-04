# PROCESS 6: PAYMENT PROCESS

## Level 1 DFD - Payment Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 6: PAYMENT PROCESS                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │    CLIENT    │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Proceed to Payment                                         
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      6.1      │──────────────┐                                   
    │    SELECT     │              │ Get Booking                        
    │    PAYMENT    │              │                                   
    │    METHOD     │              │                                   
    │ -GCash        │              ▼                                   
    │ -Maya         │      ╔═══════════════╗                          
    ╰───────┬───────╯      ║               ║                          
            │              ║   BOOKINGS    ║                          
            │              ║  (Firestore)  ║                          
            │              ║               ║                          
            │              ╚═══════════════╝                          
            │                                                           
            │ Payment Method Selected                                   
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      6.2      │                                                   
    │    CREATE     │──────────────┐                                   
    │    SOURCE     │              │ Create Payment                     
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║   PAYMONGO    ║                           
            │              ║  (GCash/Maya) ║                           
            │              ║               ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ Redirect to Payment  │ Payment Link                      
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │              │       │              │                           
    │    CLIENT    │◄──────│   PAYMONGO   │                           
    │              │       │   CHECKOUT   │                           
    └──────┬───────┘       └──────────────┘                           
           │                                                            
           │ Complete Payment                                           
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      6.3      │                                                   
    │    CONFIRM    │◄─────────────┐                                   
    │    PAYMENT    │              │ Webhook                            
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║   PAYMONGO    ║                           
            │              ║   (Webhook)   ║                           
            │              ║               ║                           
            │              ╚═══════════════╝                           
            │                                                           
            │ Payment Confirmed                                         
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      6.4      │──────────────┐                                   
    │    UPDATE     │              │ Update Status                      
    │    BOOKING    │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║    status:    ║                           
            │              ║  'pending_    ║                           
            │              ║    admin_     ║                           
            │              ║   approval'   ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ Payment Success      │ Confirmation                      
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │              │       │              │                           
    │    CLIENT    │       │    CLIENT    │                           
    │              │       │              │                           
    └──────────────┘       └──────────────┘                           
    Payment Complete       Awaiting Admin Review                       
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **6.1** | Select Payment Method | Client selects payment method (GCash or Maya) |
| **6.2** | Create Source | System creates payment source via PayMongo API |
| **6.3** | Confirm Payment | System receives payment confirmation from PayMongo webhook |
| **6.4** | Update Booking | System updates booking status to 'pending_admin_approval' |

---

## Data Dictionary - Process 6

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **paymentMethod** | GCash or Maya | Client | PayMongo |
| **paymentAmount** | Total amount to pay | System | PayMongo |
| **sourceId** | PayMongo source ID | PayMongo | System |
| **paymentStatus** | Payment status | PayMongo | System |
| **transactionId** | Payment transaction ID | PayMongo | Firestore (bookings) |
| **paidAt** | Payment timestamp | PayMongo | Firestore (bookings) |

---

## Payment Flow

```
pending_payment → create_source → redirect_to_paymongo → payment_completed → pending_admin_approval
```

---

## Payment Status Values

| Status | Description |
|--------|-------------|
| **pending** | Awaiting payment |
| **processing** | Payment in progress |
| **paid** | Payment successful |
| **failed** | Payment failed |
| **cancelled** | Payment cancelled |

---

## PayMongo Integration

```
1. Client selects payment method
2. System creates PayMongo source
3. Client redirects to PayMongo checkout
4. Client completes payment (GCash/Maya)
5. PayMongo sends webhook to system
6. System confirms payment
7. Booking status updated
```

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│     6.X       │     Process
│   PROCESS     │
│               │
╰───────────────╯

╔═══════════════╗
║               ║     Data Store
║  DATA STORE   ║
║               ║
╚═══════════════╝

─────────────────▶    Data Flow
```
