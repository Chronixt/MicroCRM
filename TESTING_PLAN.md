# TradieCRM Feature Testing Plan

This document provides a comprehensive testing plan for all new features implemented in the TradieCRM branch.

---

## Pre-Testing Setup

### Environment Preparation
- [ ] Clear browser cache and IndexedDB (DevTools > Application > Storage > Clear site data)
- [ ] Reload the app to trigger fresh database creation
- [ ] Verify app loads without console errors
- [ ] Confirm database version is 6 (check console logs)

### Test Data Setup
- [ ] Create at least 3 test customers with varied data
- [ ] Create at least 5 test jobs across different statuses
- [ ] Add some photos to customers
- [ ] Create some notes

---

## Phase 1.1: Reminders / Follow-ups

### Database Tests
- [ ] Verify `reminders` store exists in IndexedDB
- [ ] Verify indexes: `customerId`, `appointmentId`, `dueAt`, `status`

### Follow-ups View Tests
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Navigate to Follow-ups | Click Follow-ups tile in menu | Follow-ups view loads | |
| Empty state | View with no reminders | Shows "No Follow-ups" message with bell icon | |
| Create reminder from button | Click "+ New Reminder" | Modal opens with message, date picker, presets | |
| Preset message buttons | Click "Call back" preset | Message field populated with "Call back" | |
| Save reminder | Fill form and save | Reminder appears in appropriate section | |
| Overdue section | Create reminder with past date | Appears in red "Overdue" section | |
| Today section | Create reminder for today | Appears in amber "Today" section | |
| Next 7 days section | Create reminder for 3 days out | Appears in "Next 7 Days" section | |
| Later section | Create reminder for 2 weeks out | Appears in "Later" section | |
| Mark done | Click checkmark button | Reminder disappears from list | |
| Snooze 1 hour | Click snooze > 1 Hour | Reminder moves/updates due time | |
| Snooze tomorrow | Click snooze > Tomorrow 9am | Reminder due date changes to 9am tomorrow | |
| Snooze custom | Click snooze > Custom, pick date | Custom datetime picker appears and works | |
| Delete reminder | Click trash button, confirm | Reminder removed | |
| Click to navigate | Click on reminder card | Navigates to linked job or customer | |

### Create from Job Modal
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Reminder button exists | Open any job modal | "🔔 Reminder" button visible | |
| Create from job | Click reminder button | Modal opens with customer/job pre-filled | |
| Linked reminder | Save and view in Follow-ups | Shows job title and customer name | |

### Create from Customer View
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Reminder button exists | Open any customer view | Bell button (🔔) visible in header | |
| Create from customer | Click bell button | Modal opens with customer pre-filled | |

---

## Phase 1.2: Payment Tracking

### Database Tests
- [ ] Verify appointments can store `quotedAmount`, `invoiceAmount`, `paidAmount`

### Job Modal Payment Section
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Payment section visible | Open any job modal | "💰 Payment Tracking" section visible | |
| Three input fields | Check section | Quoted $, Invoiced $, Paid $ fields present | |
| Status badge - Not Quoted | Leave all fields empty | Badge shows "Not Quoted" (gray) | |
| Status badge - Quoted | Enter quoted amount only | Badge shows "Quoted" (purple) | |
| Status badge - Invoiced | Enter invoiced amount | Badge shows "Invoiced" (blue) | |
| Status badge - Part Paid | Enter partial payment | Badge shows "Part Paid" (orange) | |
| Status badge - Paid | Enter full payment | Badge shows "Paid" (green) | |
| Save payment data | Enter amounts and save | Values persist on reopen | |
| Real-time badge update | Change values without saving | Badge updates immediately | |

### Pipeline View Payment Badges
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Quoted amount shown | Job with quoted amount | Shows "$X" in purple on card | |
| Invoiced badge | Job with invoice amount | Shows "📄 Invoiced" on card | |
| Part paid badge | Job with partial payment | Shows "◐ Part Paid" on card | |
| Paid badge | Fully paid job | Shows "✓ Paid" in green on card | |

### Payment Filters
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Filter buttons visible | Go to Jobs view | All, Needs Invoice, Unpaid buttons visible | |
| All filter | Click "All" | Shows all jobs | |
| Needs Invoice filter | Click "📄 Needs Invoice" | Shows only completed jobs without invoice | |
| Unpaid filter | Click "💰 Unpaid" | Shows only invoiced but not fully paid jobs | |
| Filter persists | Switch views and back | Filter selection maintained | |

---

## Phase 1.3: Job Events / Timeline

### Database Tests
- [ ] Verify `jobEvents` store exists in IndexedDB
- [ ] Verify indexes: `appointmentId`, `customerId`, `createdAt`

### Quick Action Buttons
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Quick actions visible | Open job modal | 6 quick action buttons visible | |
| Log call | Click "📞 Call" button | Event logged, timeline updates | |
| Phone deep link | Click Call with phone number | Opens phone dialer (on mobile) | |
| Log SMS | Click "💬 SMS" button | Event logged, opens SMS (on mobile) | |
| Log email | Click "✉️ Email" button | Event logged in timeline | |
| Log quote sent | Click "📄 Quote Sent" | Event logged with quote icon | |
| Log invoice sent | Click "🧾 Invoice Sent" | Event logged with invoice icon | |
| Log payment | Click "💵 Payment" | Event logged with payment icon | |

### Timeline Display
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Timeline shows events | Log multiple events | All appear in timeline | |
| Newest first | Check order | Most recent at top | |
| Time ago format | Check timestamps | Shows "X min ago", "Yesterday", etc. | |
| Icons correct | Check each event type | Correct emoji for each type | |
| Scrollable | Log many events | Timeline scrolls within max-height | |

### Customer Recent Activity
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Section visible | Open customer view | "📋 Recent Activity" section shows | |
| Last contacted | Log a call | Shows "Last contacted: X ago" | |
| Shows 5 max | Log more than 5 events | Only 5 most recent shown | |
| Empty state | Customer with no events | Shows "No recent activity" | |

---

## Phase 1.4: Quick Add Job

### FAB (Floating Action Button)
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| FAB visible on Home | Go to home screen | "+" button in bottom-right | |
| FAB visible on Customers | Go to customers list | FAB visible | |
| FAB visible on Jobs | Go to jobs/calendar | FAB visible | |
| FAB visible on Follow-ups | Go to follow-ups | FAB visible | |
| FAB visible on Customer | Open customer detail | FAB visible | |
| FAB hidden on Options | Go to Options page | FAB not visible | |
| FAB animation | Load page with FAB | Smooth scale/rotate entry animation | |
| FAB hover effect | Hover over FAB | Scales up slightly | |

### Quick Add Overlay
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Opens on FAB click | Click FAB | Quick Add modal opens | |
| Customer dropdown | Check dropdown | Lists all customers + "Create New" | |
| Job title suggestions | Check suggestion buttons | Quote, Inspection, Repair, etc. visible | |
| Click suggestion | Click "Quote" | Title field populated | |
| Reminder presets | Check preset buttons | None, Tomorrow, 3 Days, 1 Week visible | |
| Select reminder | Click "Tomorrow" | Button highlighted, hidden field set | |

### New Customer Quick-Create
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Show new customer fields | Select "+ Create New Customer" | Name and phone fields appear | |
| Hide fields | Select existing customer | New customer fields hide | |
| Create with new customer | Enter name/phone, create job | Customer created, job linked | |
| Name splitting | Enter "John Smith" | First: John, Last: Smith | |

### Job Creation
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Validation - no customer | Try save without customer | Error message | |
| Validation - no title | Try save without title | Error message | |
| Creates job | Fill all fields, save | Job created with status "Lead" | |
| Creates reminder | Select reminder preset | Reminder also created | |
| Prefill from customer | Open FAB from customer view | Customer pre-selected | |

---

## Phase 2.1: Global Search

### Search Bar
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Search bar visible | Any page with sidebar | Search bar in toolbar | |
| Placeholder text | Check input | "Search customers, jobs..." | |
| Minimum characters | Type 1 character | No results shown yet | |
| Trigger at 2 chars | Type 2 characters | Results dropdown appears | |
| Debounce | Type quickly | Single search after pause | |

### Search Results
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Customer results | Search customer name | Customer section with matches | |
| Job results | Search job title | Jobs section with matches | |
| Note results | Search note content | Notes section with matches | |
| Phone search | Search phone number | Finds matching customer | |
| Grouped display | Multiple result types | Grouped by Customers/Jobs/Notes | |
| Result limit | Many matches | Max 5 per category | |
| No results | Search gibberish | "No results found" message | |

### Navigation
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Click customer | Click customer result | Navigates to customer view | |
| Click job | Click job result | Navigates to job in calendar | |
| Click note | Click note result | Navigates to customer with note | |
| Clear on navigate | Navigate from result | Search cleared, dropdown hidden | |
| Click outside | Click anywhere else | Dropdown closes | |
| Focus reopen | Focus input with query | Dropdown reopens | |

---

## Phase 2.2: Customer Address Fields

### Customer Edit Form
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Address section visible | Edit any customer | "📍 Address" section visible | |
| Street address field | Check field | "Street Address" input present | |
| Suburb field | Check field | "Suburb" input present | |
| State dropdown | Check field | Dropdown with all AU states | |
| Postcode field | Check field | 4-digit input with maxlength | |
| Preferred contact field | Check field | Dropdown: Phone/SMS/Email | |
| Save address | Enter all fields, save | Values persist | |

### Customer View Display
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Address section shows | Customer with address | Address block displayed | |
| Formatted correctly | Check display | Street, Suburb STATE Postcode format | |
| Hidden if empty | Customer without address | No address section | |
| Preferred contact shows | Set preference | Shows in detail list | |

### Address Action Buttons
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Copy button | Click "📋 Copy" | Address copied to clipboard | |
| Copy feedback | After click | Button shows "✓ Copied" briefly | |
| Maps button | Click "🗺️ Maps" | Opens Google Maps with address | |
| Maps query | Check URL | Address properly encoded | |

---

## Phase 3.1: Image Compression & Storage Meter

### Image Compression
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Large image compressed | Upload 5MB image | Stored much smaller | |
| Quality acceptable | View compressed image | Still looks good | |
| Max 1200px | Upload very large image | Resized to max 1200px dimension | |

### Storage Meter
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Meter visible | Go to Options | "📊 Storage Usage" section | |
| Shows count | Check display | "X photos" shown | |
| Shows MB | Check display | "X.XX MB used" shown | |
| Progress bar | Check display | Visual progress bar | |
| Healthy status | Low usage | Green, "Healthy" | |
| Warning status | High usage (>80%) | Orange warning | |
| Percentage shown | Check display | "X% of ~50MB limit" | |

---

## Phase 3.2: Job-Level Photos

### Job Modal Photo Section
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Photos section visible | Open job modal | "📷 Job Photos" section | |
| Add button | Check section | "+ Add" button with file input | |
| Empty state | New job | "No photos attached to this job" | |
| Upload photo | Click Add, select image | Photo appears in grid | |
| Multiple upload | Select multiple images | All appear | |
| Thumbnail grid | Add several photos | Grid layout with thumbnails | |

### Photo Viewing
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Click thumbnail | Click any photo | Full-size lightbox opens | |
| Close lightbox | Click lightbox background | Lightbox closes | |
| Photo quality | View in lightbox | Good quality, compressed size | |

### Customer vs Job Photos
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Job photos separate | Add photo to job | Not in customer gallery | |
| Customer photos still work | Add photo to customer | Appears in customer gallery | |
| Both work | Add to both | Each in correct location | |

---

## Phase 4: StorageDriver Abstraction

### Script Loading
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Script loads | Check Network tab | storageDriver.js loads | |
| No errors | Check console | No script errors | |
| Globals available | Console: StorageDriverFactory | Object exists | |
| IndexedDB driver | Console: IndexedDbDriver | Object exists | |

### Driver Interface
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Has required methods | Check IndexedDbDriver | init, getAll, getById, create, update, delete | |
| isAvailable works | IndexedDbDriver.isAvailable() | Returns true in browser | |

---

## Phase 5: Pro Features

### Backup Reminders
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Section visible | Go to Options | "⭐ Pro Settings" section | |
| Frequency dropdown | Check dropdown | Off, Weekly, Monthly options | |
| Save setting | Select Weekly, click Save | Alert confirms saved | |
| Stored in localStorage | Check localStorage | backup_reminder_frequency key set | |
| Next reminder scheduled | Check localStorage | next_backup_reminder key set | |
| Reminder triggers | Set past date manually | Prompt appears on next load | |

### App Lock - Setup
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Checkbox present | Check Pro Settings | "Enable PIN Lock" checkbox | |
| PIN fields hidden | Initial state | PIN setup section hidden | |
| Enable shows fields | Check the checkbox | PIN input and Set button appear | |
| Validation - short | Enter 3 digits | Error on save | |
| Validation - letters | Enter "abcd" | Error on save | |
| Save valid PIN | Enter 4 digits, save | Success message, section hides | |
| Status shows set | After setting | "✓ PIN is set" shown | |
| Disable clears PIN | Uncheck checkbox | PIN removed, status updates | |

### App Lock - Lock Screen
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Lock screen shows | Set PIN, reload app | Lock overlay appears | |
| PIN input focused | On load | Input is focused | |
| Wrong PIN | Enter wrong PIN | Error message, input clears | |
| Correct PIN | Enter correct PIN | Overlay removed, app loads | |
| Enter key works | Type PIN, press Enter | Attempts unlock | |

---

## Cross-Cutting Tests

### Database Migration
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Fresh install | Clear data, reload | All stores created | |
| Upgrade from v5 | Have v5 data, reload | appointmentId index added to images | |
| Data preserved | Upgrade database | Existing data intact | |

### Offline Functionality
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Works offline | Disable network | App still functions | |
| Data persists | Add data offline | Available after reconnect | |

### Mobile/Responsive
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| FAB position | Mobile viewport | Not overlapping nav | |
| Quick Add modal | Mobile | Fits screen, scrollable | |
| Search dropdown | Mobile | Fits within viewport | |
| Payment fields | Mobile | Grid stacks properly | |

### Performance
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Search speed | Type quickly | Results in <200ms | |
| Pipeline load | Many jobs | Loads in <1s | |
| Photo upload | Large image | Compresses in <3s | |

---

## Regression Tests

### Existing Features Still Work
| Test Case | Steps | Expected Result | Pass/Fail |
|-----------|-------|-----------------|-----------|
| Customer CRUD | Create, read, update, delete | All work | |
| Job CRUD | Create, read, update, delete | All work | |
| Notes CRUD | Add, edit, delete notes | All work | |
| Calendar view | Switch to calendar | Events display | |
| Pipeline view | Switch to pipeline | Jobs grouped by status | |
| Photo gallery | Customer photos | Still displays | |
| Backup export | Export data | JSON downloads | |
| Backup import | Import backup | Data restored | |
| Language toggle | Switch EN/JA | UI updates | |

---

## Sign-Off

| Phase | Tested By | Date | Status |
|-------|-----------|------|--------|
| Phase 1.1 - Reminders | | | |
| Phase 1.2 - Payments | | | |
| Phase 1.3 - Timeline | | | |
| Phase 1.4 - Quick Add | | | |
| Phase 2.1 - Search | | | |
| Phase 2.2 - Address | | | |
| Phase 3.1 - Storage | | | |
| Phase 3.2 - Job Photos | | | |
| Phase 4 - StorageDriver | | | |
| Phase 5 - Pro Features | | | |
| Regression | | | |

**Overall Status:** ____________________

**Notes:**
