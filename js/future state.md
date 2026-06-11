# CRMicro – Future State Architecture & Product Strategy

## 0. Objective

Transition CRMicro from:

* ❌ Role-based product branches (e.g. beautician, tradie)

To:

* ✅ Feature-driven **Product Types (core systems)**
* ✅ Configurable **Brand Layers (terminology + defaults)**

Goal:

* Maintain **1 core codebase**
* Support **multiple industries via configuration**
* Minimize long-term maintenance overhead

---

# 1. Product Architecture Model

## 1.1 Core Concept

The system is composed of:

### A) Product Type (functional system)

Defines:

* Data structure
* Core modules
* UX paradigm

### B) Product Brand (configuration layer)

Defines:

* Terminology
* Default values
* Service types
* Minor UI variations

---

## 1.2 Configuration Structure

```javascript
const PRODUCT_TYPE = 'appointment'
// 'appointment' | 'job' | 'case' | 'sales' | 'hybrid' | 'personal'

const PRODUCT_BRAND = 'pet-groomer'
// e.g. 'hairdresser', 'electrician', 'consultant'
```

---

## 1.3 Config Layer Design

### Product Type Config (core system)

```javascript
const ProductTypeConfig = {
  appointment: {
    primaryView: 'calendar',
    modules: ['customers', 'appointments', 'notes', 'reminders'],
    ux: 'calendar-first',
    terminology: {
      appointment: 'Appointment',
      customer: 'Customer'
    }
  }
}
```

---

### Brand Config (override layer)

```javascript
const BrandConfig = {
  'pet-groomer': {
    terminology: {
      appointment: 'Grooming Session',
      customer: 'Pet Owner'
    },
    serviceTypes: ['Wash', 'Full Groom', 'Nail Trim']
  }
}
```

---

# 2. Core Product Types (Priority Ordered)

---

## 2.1 Appointment-Based Services (HIGH PRIORITY)

### Industries

* Hairdressers
* Beauticians
* Pet groomers
* Massage therapists
* Nail salons

### Core Modules

* Calendar / booking system (PRIMARY)
* Customer profiles
* Service types (duration + price)
* Notes (per appointment)
* Reminders (appointment-based)

### Optional Modules

* Staff management (future)
* Repeat bookings
* Package tracking

### UX Model

* Calendar-first
* Time-slot driven
* Focus: “Next appointment”

---

## 2.2 Job / Field Service (HIGH PRIORITY)

### Industries

* Electricians
* Plumbers
* Handymen
* Cleaners
* Landscapers

### Core Modules

* Jobs (not time slots)
* Pipeline (Lead → Paid)
* Customer profiles
* Photos (critical)
* Follow-ups / reminders

### Optional Modules

* Quotes
* Invoice tracking
* Site visits

### UX Model

* Pipeline-first
* Action-driven (“What needs action?”)
* Fast capture (on-site usage)

---

## 2.3 Case / Client Management (MEDIUM PRIORITY)

### Industries

* Support workers (NDIS)
* Therapists
* Consultants
* Coaches
* Advisory services

### Core Modules

* Clients (primary entity)
* Notes (heavy usage)
* Timeline / history
* Tasks / follow-ups

### Optional Modules

* Documents
* Session tracking
* Goals / progress tracking

### UX Model

* Timeline-first
* Notes-first
* Relationship-centric

---

## 2.4 Sales / Lead Tracking (MEDIUM PRIORITY)

### Industries

* Freelancers
* Agencies
* Small B2B services
* Real estate (lightweight)

### Core Modules

* Leads
* Pipeline (deal stages)
* Contact tracking
* Follow-ups

### Optional Modules

* Email logging
* Proposal tracking

### UX Model

* Pipeline-first
* Conversion-focused
* Deal-value oriented

---

## 2.5 Hybrid Service (Appointment + Job) (MEDIUM PRIORITY)

### Industries

* Mobile mechanics
* Cleaning services
* Pest control
* Mobile pet grooming

### Core Modules

* Calendar (booking)
* Jobs (execution)
* Customers
* Notes + photos
* Reminders

### UX Model

* Calendar + Pipeline combined
* Flow: “Booked → Completed”

---

## 2.6 Personal CRM / Life Admin (LOW PRIORITY)

### Use Cases

* Personal contacts
* Networking
* Freelancers managing relationships

### Core Modules

* Contacts
* Notes
* Reminders
* Interaction history

### UX Model

* Contact-centric
* Timeline-driven

---

# 3. Migration Strategy (Critical)

## Goal

Move from:

* `ACTIVE_PRODUCT = 'tradie'`

To:

* `PRODUCT_TYPE + PRODUCT_BRAND`

---

## Step-by-Step Plan

### Step 1

Refactor `productConfig.js`:

* Extract shared logic into ProductTypeConfig
* Move industry-specific logic into BrandConfig

### Step 2

Replace:

* `isTradie()` style checks

With:

* `PRODUCT_TYPE === 'job'`

---

### Step 3

Audit:

* Terminology usage
* Status labels
* Service types

Ensure all come from config layers

---

### Step 4

Ensure all UI is driven by:

* `modules`
* `primaryView`
* `terminology`

---

# 4. Platform Evolution

---

## 4.1 Sales Website (INITIAL)

### Phase 1 (MVP)

* Static marketing site
* Product overview pages (per Product Type)
* Screenshots
* “Request Demo” form

### Optional (HIGH VALUE)

* Interactive sandbox/demo mode

  * Preloaded data
  * Read-only environment

---

## 4.2 Sales Flow (LATER)

* Self-serve signup
* Plan selection
* Automated onboarding

---

## 4.3 Native App Transition (HIGH PRIORITY)

### Goal

Deploy CRMicro as:

* iOS app
* Android app

### Requirements

* Replace IndexedDB limitations
* Enable better storage (SQLite + filesystem)
* Support native features (notifications, camera)

---

## 4.4 Storage Evolution

### Current Problem

* IndexedDB (especially iOS) has:

  * low storage limits
  * instability with large blobs (images)

### Target Architecture

* Storage abstraction layer
* SQLite (native builds)
* Filesystem for attachments

## 4.5 Storage Mode & Cloud Sync (HIGH PRIORITY)

### Goal
Support multiple storage modes so CRMicro can offer:
- Free tier: local-only storage
- Premium tier: cloud storage / sync via Supabase

---

### Storage Modes

#### Local Only
Used for:
- Free tier
- Offline-first usage
- Users who want data stored only on their device

Characteristics:
- Data stored locally
- No account required
- No cloud backup
- No multi-device sync
- Lower operating cost

---

#### Cloud Enabled
Used for:
- Paid / premium tier

Characteristics:
- Requires account login
- Data stored/synced with Supabase
- Supports multi-device access
- Enables recovery if device is lost
- Incurs backend cost

---

### Required Architecture

Introduce a storage abstraction layer:

```javascript
const STORAGE_MODE = 'local'
// 'local' | 'cloud' | 'hybrid'

---

# 5. Developer Dashboard (Admin System)

## Goal

Central control over:

* Clients
* Features
* Diagnostics

---

## Core Capabilities

### 5.1 Client Management

* View all active clients
* Assign Product Type + Brand
* Enable/disable modules

---

### 5.2 Feature Flags

* Toggle modules per client
* Enable beta features

---

### 5.3 Diagnostics

* Storage usage
* Error logs
* Sync issues (future)

---

### 5.4 Future

* Remote config updates
* Usage analytics
* Billing integration

---

# 6. Guiding Principles

* Keep system **modular**
* Avoid hardcoding industry logic
* Prefer **configuration over branching**
* Maintain **single codebase**
* Optimize for **speed of iteration**
* Build for **offline-first usage**

---

# 7. Immediate Next Steps (for Codex)

1. Refactor `productConfig.js` into:

   * ProductTypeConfig
   * BrandConfig

2. Replace all role-based conditionals with type-based logic

3. Identify modules currently hardcoded and move into config

4. Define module registry system (feature toggling)

5. Begin storage abstraction planning (IndexedDB → SQLite)

