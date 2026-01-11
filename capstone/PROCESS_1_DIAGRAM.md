# PROCESS 1: USER REGISTRATION

## Level 1 DFD - Registration Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROCESS 1: USER REGISTRATION                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘


                                         ┌──────────────┐
                                         │              │
                                         │     USER     │
                                         │              │
                                         └──────┬───────┘
                                                │
                                                │ Registration Data
                                                ▼
                                        ╭───────────────╮
                                        │      1.1      │
                                        │    SELECT     │
                                        │     ROLE      │
                                        ╰───────┬───────╯
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        │                                               │
                        ▼                                               ▼
                ╭───────────────╮                               ╭───────────────╮
                │      1.2      │                               │      1.3      │
                │   PERSONAL    │                               │   PERSONAL    │
                │ INFORMATION   │                               │ INFORMATION   │
                │   (CLIENT)    │                               │  (PROVIDER)   │
                ╰───────┬───────╯                               ╰───────┬───────╯
                        │                                               │
                        ▼                                               ▼
                ╭───────────────╮                               ╭───────────────╮
                │      1.4      │                               │      1.5      │
                │    CONTACT    │                               │    CONTACT    │
                │ INFORMATION   │                               │ INFORMATION   │
                │   (CLIENT)    │                               │  (PROVIDER)   │
                ╰───────┬───────╯                               ╰───────┬───────╯
                        │                                               │
                        ▼                                               ▼
                ╭───────────────╮                               ╭───────────────╮
                │      1.6      │                               │      1.7      │
                │    EMAIL      │                               │   SERVICE     │
                │ VERIFICATION  │                               │  CATEGORY     │
                ╰───────┬───────╯                               ╰───────┬───────╯
                        │                                               │
                        │                                               ▼
                        │                                       ╭───────────────╮
                        │                                       │      1.8      │
                        │                                       │   DOCUMENT    │
                        │                                       │    UPLOAD     │
                        │                                       ╰───────┬───────╯
                        │                                               │
                        ▼                                               ▼
                ╭───────────────╮                               ╭───────────────╮
                │      1.9      │                               │     1.10      │
                │   LOCATION    │                               │   LOCATION    │
                │    SETUP      │                               │    SETUP      │
                │   (CLIENT)    │                               │  (PROVIDER)   │
                ╰───────┬───────╯                               ╰───────┬───────╯
                        │                                               │
                        ▼                                               ▼
                ╭───────────────╮                               ╭───────────────╮
                │     1.11      │                               │     1.12      │
                │   PROFILE     │                               │   PROFILE     │
                │    PHOTO      │                               │    PHOTO      │
                │   (CLIENT)    │                               │  (PROVIDER)   │
                ╰───────┬───────╯                               ╰───────┬───────╯
                        │                                               │
                        │                                               ▼
                        │                                       ╭───────────────╮
                        │                                       │     1.13      │
                        │                                       │  SET FIXED    │
                        │                                       │    PRICE      │
                        │                                       ╰───────┬───────╯
                        │                                               │
                        ▼                                               ▼
                ╭───────────────╮                               ╭───────────────╮
                │     1.14      │                               │     1.15      │
                │   CREATE      │                               │   CREATE      │
                │   ACCOUNT     │                               │   ACCOUNT     │
                │   (CLIENT)    │                               │  (PROVIDER)   │
                ╰───────┬───────╯                               ╰───────┬───────╯
                        │                                               │
                        │ Store Data                                    │ Store Data
                        ▼                                               ▼
                ╔═══════════════╗                               ╔═══════════════╗
                ║               ║                               ║               ║
                ║    USERS      ║                               ║    USERS      ║
                ║  (Firestore)  ║                               ║  (Firestore)  ║
                ║               ║                               ║               ║
                ║ role: CLIENT  ║                               ║ role: PROVIDER║
                ║               ║                               ║ providerStatus║
                ║               ║                               ║  : 'pending'  ║
                ╚═══════════════╝                               ╚═══════════════╝
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **1.1** | Select Role | User chooses between Client or Provider registration |
| **1.2** | Personal Information (Client) | Client enters first name, last name, email, password |
| **1.3** | Personal Information (Provider) | Provider enters first name, last name, email, password |
| **1.4** | Contact Information (Client) | Client enters phone number |
| **1.5** | Contact Information (Provider) | Provider enters phone number |
| **1.6** | Email Verification | System sends OTP to client's email, client verifies |
| **1.7** | Service Category | Provider selects: Electrician, Plumber, Carpenter, or Cleaner |
| **1.8** | Document Upload | Provider uploads Valid ID (front/back), Barangay Clearance |
| **1.9** | Location Setup (Client) | Client selects barangay, enters address, pins location on map |
| **1.10** | Location Setup (Provider) | Provider selects barangay, enters address, pins location on map |
| **1.11** | Profile Photo (Client) | Client uploads or captures profile photo |
| **1.12** | Profile Photo (Provider) | Provider uploads or captures profile photo |
| **1.13** | Set Fixed Price | Provider sets their service rate (₱) |
| **1.14** | Create Account (Client) | System creates Firebase Auth and stores client in Firestore |
| **1.15** | Create Account (Provider) | System creates Firebase Auth and stores provider in Firestore (pending approval) |

---

## Client Registration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT REGISTRATION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    USER                        SYSTEM                          EXTERNAL SERVICES
      │                            │                                    │
      │  1.1 Select "Client"       │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  1.2 Enter Personal Info   │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  1.4 Enter Phone Number    │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  1.6 Send Verification Email       │
      │                            │───────────────────────────────────▶│ BREVO
      │                            │                                    │
      │  1.6 Enter OTP Code        │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  1.9 Select Barangay       │                                    │
      │      Pin Location          │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  1.9 Reverse Geocode               │
      │                            │───────────────────────────────────▶│ GOOGLE MAPS
      │                            │                                    │
      │  1.11 Upload Profile Photo │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  1.11 Upload to Cloudinary         │
      │                            │───────────────────────────────────▶│ CLOUDINARY
      │                            │                                    │
      │                            │  1.14 Create Firebase Auth         │
      │                            │───────────────────────────────────▶│ FIREBASE
      │                            │                                    │
      │                            │  1.14 Store User in Firestore      │
      │                            │───────────────────────────────────▶│ FIREBASE
      │                            │                                    │
      │  Registration Complete     │                                    │
      │◀───────────────────────────│                                    │
      │                            │                                    │
```

---

## Provider Registration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             PROVIDER REGISTRATION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    USER                        SYSTEM                          EXTERNAL SERVICES
      │                            │                                    │
      │  1.1 Select "Provider"     │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  1.3 Enter Personal Info   │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  1.5 Enter Phone Number    │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  1.7 Select Service        │                                    │
      │      Category              │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  1.8 Upload Documents      │                                    │
      │      • Valid ID (Front)    │                                    │
      │      • Valid ID (Back)     │                                    │
      │      • Barangay Clearance  │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  1.8 Upload Documents              │
      │                            │───────────────────────────────────▶│ CLOUDINARY
      │                            │                                    │
      │  1.10 Select Barangay      │                                    │
      │       Pin Location         │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  1.10 Get Coordinates              │
      │                            │───────────────────────────────────▶│ GOOGLE MAPS
      │                            │                                    │
      │  1.12 Upload Profile Photo │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  1.12 Upload Photo                 │
      │                            │───────────────────────────────────▶│ CLOUDINARY
      │                            │                                    │
      │  1.13 Set Fixed Price      │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  1.15 Create Firebase Auth         │
      │                            │───────────────────────────────────▶│ FIREBASE
      │                            │                                    │
      │                            │  1.15 Store Provider (pending)     │
      │                            │───────────────────────────────────▶│ FIREBASE
      │                            │                                    │
      │                            │  1.15 Notify Admin                 │
      │                            │──────────┐                         │
      │                            │          │                         │
      │                            │◀─────────┘                         │
      │                            │                                    │
      │  Registration Complete     │                                    │
      │  (Pending Approval)        │                                    │
      │◀───────────────────────────│                                    │
      │                            │                                    │
```

---

## Data Dictionary - Process 1

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **firstName** | User's first name | 1.2 / 1.3 | Firestore (users) |
| **lastName** | User's last name | 1.2 / 1.3 | Firestore (users) |
| **email** | User's email address | 1.2 / 1.3 | Firebase Auth, Firestore |
| **password** | User's password (hashed) | 1.2 / 1.3 | Firebase Auth |
| **phoneNumber** | User's phone number | 1.4 / 1.5 | Firestore (users) |
| **role** | User type (CLIENT/PROVIDER) | 1.1 | Firestore (users) |
| **serviceCategory** | Provider's service type | 1.7 | Firestore (users) |
| **documents** | Provider's uploaded documents | 1.8 | Cloudinary → Firestore |
| **profilePhoto** | User's profile picture | 1.11 / 1.12 | Cloudinary → Firestore |
| **barangay** | User's barangay in Maasin | 1.9 / 1.10 | Firestore (users) |
| **streetAddress** | User's street address | 1.9 / 1.10 | Firestore (users) |
| **latitude** | Location coordinate | 1.9 / 1.10 | Firestore (users) |
| **longitude** | Location coordinate | 1.9 / 1.10 | Firestore (users) |
| **fixedPrice** | Provider's service rate | 1.13 | Firestore (users) |
| **providerStatus** | Provider approval status | 1.15 | Firestore (users) |
| **isOnline** | Provider availability | 1.15 | Firestore (users) |

---

## Validation Rules

| Field | Validation | Process |
|-------|------------|---------|
| **Email** | Valid email format, unique in system | 1.2 / 1.3 |
| **Password** | Minimum 6 characters | 1.2 / 1.3 |
| **Phone** | Valid Philippine phone format | 1.4 / 1.5 |
| **First Name** | Required, min 2 characters | 1.2 / 1.3 |
| **Last Name** | Required, min 2 characters | 1.2 / 1.3 |
| **OTP Code** | 6-digit code, expires in 10 minutes | 1.6 |
| **Service Category** | Must be one of: Electrician, Plumber, Carpenter, Cleaner | 1.7 |
| **Documents** | Required: ID front, ID back, clearance (max 5MB each) | 1.8 |
| **Barangay** | Must be from Maasin City list | 1.9 / 1.10 |
| **Profile Photo** | Required, max 5MB | 1.11 / 1.12 |
| **Fixed Price** | Required for providers, minimum ₱100 | 1.13 |

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│     1.X       │     Process
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

