# Data Safety Disclosure for Google Play

## Overview
This document outlines the data collection, usage, and security practices for the AI Art Exchange app as required by Google Play's Data Safety section.

---

## Data Collection Summary

### ✅ Data Types Collected

#### 1. Personal Information
**Collected:** Yes

**Data Points:**
- Email address
- Username
- Profile information (display name, bio, avatar)
- Age verification status

**Purpose:**
- Account creation and authentication
- Communication with users
- Age verification compliance

**Sharing:**
- Not shared with third parties
- Processed by Stripe for payments (see Payment Info section)

---

#### 2. Financial Information
**Collected:** Yes

**Data Points:**
- Payment card information (processed by Stripe, not stored)
- Transaction history
- Wallet balances
- Payout information

**Purpose:**
- Process payments
- Enable marketplace transactions
- Revenue distribution

**Sharing:**
- Shared with Stripe (PCI-DSS compliant payment processor)
- Not shared with other third parties

---

#### 3. User-Generated Content
**Collected:** Yes

**Data Points:**
- AI generation prompts
- Created artwork and metadata
- Marketplace listings
- Comments and interactions

**Purpose:**
- Provide AI art generation service
- Enable marketplace functionality
- Platform features

**Sharing:**
- User-generated art is publicly visible in marketplace
- Prompts may be used for AI model improvement (opt-in only)

---

#### 4. App Activity
**Collected:** Yes

**Data Points:**
- Page views and navigation
- Feature usage
- Search queries
- Auction bids and purchases

**Purpose:**
- Improve user experience
- Analytics and performance monitoring
- Fraud prevention

**Sharing:**
- Not shared with third parties

---

#### 5. Device and Diagnostic Data
**Collected:** Yes

**Data Points:**
- Device type and OS version
- IP address (anonymized)
- Browser information
- Crash logs and error reports

**Purpose:**
- Bug fixing and performance optimization
- Security and fraud prevention
- Service improvement

**Sharing:**
- Not shared with third parties

---

## Data Security Practices

### Encryption
✅ **Data encrypted in transit** - TLS 1.3
✅ **Data encrypted at rest** - AES-256

### Account Security
✅ **Password hashing** - bcrypt with 12 rounds
✅ **JWT authentication** - Secure token-based auth
✅ **Session management** - Redis-backed sessions

### Data Deletion
✅ **User can request data deletion** - Via in-app settings or support request
✅ **Account deletion available** - Complete data removal upon request

---

## Data Sharing Practices

### Third-Party Services

#### Stripe (Payment Processing)
- **Purpose:** Payment processing only
- **Data Shared:** Payment card info, transaction amounts
- **Compliance:** PCI-DSS Level 1
- **Link:** https://stripe.com/privacy

### No Other Third-Party Sharing
- We do NOT sell user data
- We do NOT share data with advertisers
- We do NOT use data for external marketing

---

## Optional Data Sharing (User Controlled)

### AI Model Training (Opt-In Only)
Users can opt-in to share:
- Generation prompts
- Artwork metadata
- Usage patterns

**Benefits:**
- Improved AI models
- Better generation results
- Platform benefits (every 5th asset vs every 2nd)

**Control:**
- Fully optional
- Can be disabled in settings at any time
- Clear disclosure before opting in

---

## Privacy Controls

Users can:
✅ View their data
✅ Delete their account
✅ Control data sharing preferences
✅ Manage privacy settings
✅ Export their data (upon request)

---

## Compliance

- ✅ GDPR compliant
- ✅ CCPA compliant
- ✅ Children's privacy (COPPA) - App is 18+
- ✅ Data breach notification procedures in place

---

## Contact

**Privacy Inquiries:** privacy@aiartexchange.com
**Data Deletion Requests:** support@aiartexchange.com
**Security Issues:** security@aiartexchange.com

---

## Last Updated
February 11, 2026

---

*This data safety information must be accurately reflected in the Google Play Console's Data Safety section.*
