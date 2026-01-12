    # PROCESS 4: BOOKING & PAYMENT

## Level 1 DFD - Booking & Payment Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROCESS 4: BOOKING & PAYMENT                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘


                                         ┌──────────────┐
                                         │              │
                                         │    CLIENT    │
                                         │              │
                                         └──────┬───────┘
                                                │
                                                │ Selected Provider
                                                ▼
                                        ╭───────────────╮
                                        │      4.1      │
                                        │     FILL      │
                                        │   BOOKING     │
                                        │     FORM      │
                                        ╰───────┬───────╯
                                                │
                                                │ Photos, Address, Notes
                                                ▼
                                        ╭───────────────╮
                                        │      4.2      │
                                        │    SELECT     │
                                        │   PAYMENT     │
                                        │ (GCash/Maya)  │
                                        ╰───────┬───────╯
                                                │
                                                ▼
                                        ╭───────────────╮
                                        │      4.3      │
                                        │    SUBMIT     │
                                        │   BOOKING     │
                                        ╰───────┬───────╯
                                                │
                                                │ Booking Data
                                                ▼
                                        ╔═══════════════╗
                                        ║               ║
                                        ║   BOOKINGS    ║
                                        ║  (Firestore)  ║
                                        ║               ║
                                        ╚═══════╤═══════╝
                                                │
                                                ▼
                                        ╭───────────────╮
                                        │      4.4      │
                                        │   PROCESS     │
                                        │   PAYMENT     │
                                        ╰───────┬───────╯
                                                │
                                                │ Payment Request
                                                ▼
                                        ┌───────────────┐
                                        │               │
                                        │   PAYMONGO    │
                                        │               │
                                        └───────┬───────┘
                                                │
                                                │ Payment Confirmed
                                                ▼
                                        ╭───────────────╮
                                        │      4.5      │
                                        │    UPDATE     │
                                        │   BOOKING     │
                                        │  (paid: true) │
                                        ╰───────┬───────╯
                                                │
                                                ▼
                                        ╭───────────────╮
                                        │      4.6      │
                                        │    NOTIFY     │
                                        │    ADMIN      │
                                        ╰───────────────╯
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │               │
                                        │   PROCESS 5   │
                                        │ JOB APPROVAL  │
                                        │               │
                                        └───────────────┘
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **4.1** | Fill Booking Form | Upload photos, set address, add notes |
| **4.2** | Select Payment | Choose GCash or Maya |
| **4.3** | Submit Booking | Create booking in Firestore |
| **4.4** | Process Payment | Redirect to PayMongo checkout |
| **4.5** | Update Booking | Mark booking as paid after payment |
| **4.6** | Notify Admin | Send push notification to admin |

---

## Booking & Payment Flow

```
    CLIENT                      BACKEND                         PAYMONGO
      │                            │                               │
      │  4.1-4.2 Fill Form         │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  4.3 Create Booking           │
      │                            │──────────┐                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  4.4 Create Payment Source    │
      │                            │───────────────────────────────▶
      │                            │                               │
      │  4.4 Redirect to Checkout  │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
      │  Authorize Payment         │                               │
      │─────────────────────────────────────────────────────────────▶
      │                            │                               │
      │                            │  Webhook: Payment Success     │
      │                            │◀───────────────────────────────
      │                            │                               │
      │                            │  4.5 Update Booking           │
      │                            │──────────┐                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │  4.6 View Booking Status   │                               │
      │◀───────────────────────────│                               │
```

---

## Price Calculation

```
Provider Fixed Price:     ₱1,000
System Fee (5%):         +   ₱50
─────────────────────────────────
Total Amount:             ₱1,050
```

---

## Legend

```
╭───────────────╮
│     4.X       │     Process
╰───────────────╯

╔═══════════════╗
║  DATA STORE   ║     Data Store
╚═══════════════╝

─────────────────▶    Data Flow
```

