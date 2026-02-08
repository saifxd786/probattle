
# BGMI POV Verification System Implementation Plan

## Overview
Implement a "POV Verification Hold" system for BGMI match results in the Admin Panel. When declaring results, if a player is suspicious of using hacks, the admin can mark them for POV verification. The winner receives their prize but it's immediately deducted and held until they submit proof (screen recording + handcam).

## How It Works

```text
+------------------+      +-------------------+      +------------------+
|  Admin Declares  | ---> |  Mark Player as   | ---> |  Winner Gets     |
|  Match Results   |      |  "Ask POV"        |      |  Prize (Normal)  |
+------------------+      +-------------------+      +------------------+
                                   |
                                   v
                          +-------------------+
                          |  Same Amount      |
                          |  DEDUCTED from    |
                          |  Wallet (Held)    |
                          +-------------------+
                                   |
                                   v
                          +-------------------+
                          | Transaction shows |
                          | "Deducted by Admin|
                          | - POV Required"   |
                          +-------------------+
                                   |
                                   v
                          +-------------------+
                          |  AI Support Detects|
                          |  POV hold when    |
                          |  user asks "Why?" |
                          +-------------------+
                                   |
                                   v
                          +-------------------+
                          | AI asks for Screen|
                          | Recording + Handcam|
                          +-------------------+
```

## Database Changes

### 1. New Table: `pov_verification_holds`
Tracks players flagged for POV verification:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| match_id | uuid | FK to matches |
| user_id | uuid | Player who needs to submit POV |
| match_result_id | uuid | FK to match_results |
| prize_amount_held | numeric | Amount deducted and held |
| status | enum | pending/submitted/approved/rejected |
| admin_note | text | Why they were flagged |
| pov_video_url | text | User's submitted recording |
| handcam_video_url | text | User's submitted handcam |
| reviewed_by | uuid | Admin who reviewed |
| reviewed_at | timestamp | When reviewed |
| created_at | timestamp | When flagged |

### 2. New Enum: `pov_status`
```sql
CREATE TYPE pov_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');
```

## Implementation Steps

### Step 1: Database Migration
- Create `pov_status` enum
- Create `pov_verification_holds` table
- Add RLS policies for admin access

### Step 2: Update Admin MatchResultsDialog
Location: `src/components/admin/MatchResultsDialog.tsx`

Changes:
- Add "Ask POV" checkbox/toggle next to each player row
- When declaring results:
  - If player marked "Ask POV" AND wins prize
  - Credit prize to wallet (normal flow)
  - Immediately deduct same amount
  - Create `pov_verification_holds` record
  - Send notification to user

UI Changes:
```text
+------------------------------------------+
|  [Avatar] Player Name                    |
|  ID: 123456789                           |
|                                          |
|  Result: [Win v]  Kills: [3]  Prize: 180 |
|                                          |
|  [x] Ask POV (Suspicious gameplay)       |
+------------------------------------------+
```

### Step 3: Create Transaction with POV Reference
When POV hold is created:
- Transaction type: `admin_debit`
- Description: `🔍 POV Verification Hold for "[Match Title]" - Submit screen recording + handcam to claim ₹X`
- Store `pov_hold_id` reference

### Step 4: Send User Notification
Create notification when POV hold is applied:
```
Title: ⚠️ POV Verification Required
Message: Your prize of ₹X from "[Match Title]" is on hold. Submit screen recording + handcam via Support to claim your winnings. Match ID: XXXXXXXX
```

### Step 5: Update AI Support Chat
Location: `supabase/functions/ai-support-chat/index.ts`

Enhance AI to:
1. Detect when user asks about missing winnings/deductions
2. Check `pov_verification_holds` table for pending holds
3. If POV hold exists:
   - Explain why prize is held
   - Request screen recording + handcam
   - Guide user to upload videos via Support

Add to system prompt:
```
### POV VERIFICATION HOLDS

When user asks about missing winnings or wallet deductions:
1. Check if they have any pending POV verification holds
2. If found, explain:
   - Match was flagged for suspicious gameplay
   - They need to submit screen recording + handcam
   - Once verified, prize will be restored
3. Ask them to upload:
   - Full match screen recording
   - Handcam footage (if applicable)
```

### Step 6: Admin POV Review Interface
Create new component: `src/pages/admin/AdminPOVReview.tsx`

Features:
- List all pending POV verifications
- View submitted videos
- Match details and player info
- Approve: Restore held amount to wallet
- Reject: Keep amount deducted, ban if needed

### Step 7: Agent Access (Optional)
Add to Agent panel if needed with permission `can_review_pov`

---

## Technical Details

### Files to Create:
1. `src/pages/admin/AdminPOVReview.tsx` - POV review dashboard

### Files to Modify:
1. `src/components/admin/MatchResultsDialog.tsx` - Add POV checkbox
2. `supabase/functions/ai-support-chat/index.ts` - POV detection logic
3. `src/components/admin/AdminSidebar.tsx` - Add POV Review link
4. `src/integrations/supabase/types.ts` - Auto-updated with new types

### Database Migration:
```sql
-- Create POV status enum
CREATE TYPE public.pov_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');

-- Create POV verification holds table
CREATE TABLE public.pov_verification_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_result_id UUID REFERENCES public.match_results(id) ON DELETE SET NULL,
  prize_amount_held NUMERIC NOT NULL DEFAULT 0,
  status pov_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  pov_video_url TEXT,
  handcam_video_url TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pov_verification_holds ENABLE ROW LEVEL SECURITY;

-- Admin read/write policy
CREATE POLICY "Admins can manage POV holds"
  ON public.pov_verification_holds
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own holds
CREATE POLICY "Users can view own POV holds"
  ON public.pov_verification_holds
  FOR SELECT
  USING (auth.uid() = user_id);
```

### AI Support Enhancements:
The AI will query `pov_verification_holds` when user mentions:
- "mera winning nahi aaya"
- "prize deduct ho gaya"
- "paisa kat gaya"
- "wallet se minus hua"
- Match ID

Response flow:
1. Search for match by ID or recent transactions
2. Find linked POV hold
3. Explain situation in Hinglish
4. Request video uploads via support chat

---

## User Flow Summary

1. **Admin declares results** with POV flag on suspicious player
2. **System**: Credits prize, then debits immediately
3. **User sees**: Prize notification + deduction notification
4. **User contacts AI Support**: "Mera winning kyu kata?"
5. **AI detects POV hold**: Explains reason, asks for videos
6. **User uploads**: Screen recording + handcam via support
7. **Admin reviews**: In POV Review dashboard
8. **Outcome**:
   - Approved: Amount restored to wallet
   - Rejected: No refund, possible ban
