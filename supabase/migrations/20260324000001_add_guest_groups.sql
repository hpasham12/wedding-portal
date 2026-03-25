-- Create guest_groups table
CREATE TABLE IF NOT EXISTS guest_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guest_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view guest groups"
  ON guest_groups FOR SELECT TO authenticated USING (true);

-- Add group_id to guests
ALTER TABLE guests ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES guest_groups(id) ON DELETE SET NULL;

-- Helper: check if two guests are in the same group (SECURITY DEFINER bypasses RLS for the check)
CREATE OR REPLACE FUNCTION public.in_same_group(uid1 uuid, uid2 uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM guests g1
    JOIN guests g2 ON g1.group_id = g2.group_id AND g1.group_id IS NOT NULL
    WHERE g1.id = uid1 AND g2.id = uid2 AND uid1 <> uid2
  );
$$;

-- Helper: check if a specific guest has access to a specific event
CREATE OR REPLACE FUNCTION public.guest_has_event_access(g_id uuid, e_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM access WHERE access.guest_id = g_id AND access.event_id = e_id
  );
$$;

-- Update access RLS: guests can also see their group members' access records
-- (needed so the dashboard can know which events group members are invited to)
DROP POLICY IF EXISTS "Guests can view their own access records" ON access;
CREATE POLICY "Guests can view own and group member access records"
  ON access FOR SELECT TO authenticated
  USING (
    guest_id = auth.uid()
    OR public.in_same_group(auth.uid(), guest_id)
  );

-- Drop old rsvp policies and replace with group-aware ones
DROP POLICY IF EXISTS "Guests can view their own RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Guests can create RSVPs for their events" ON rsvps;
DROP POLICY IF EXISTS "Guests can update their own RSVPs" ON rsvps;

-- Guests can view their own RSVPs and those of group members
CREATE POLICY "Guests can view own and group RSVPs"
  ON rsvps FOR SELECT TO authenticated
  USING (
    guest_id = auth.uid()
    OR public.in_same_group(auth.uid(), guest_id)
  );

-- Guests can create RSVPs for themselves, or for group members who have access to the event
CREATE POLICY "Guests can create RSVPs for self or group members with access"
  ON rsvps FOR INSERT TO authenticated
  WITH CHECK (
    guest_id = auth.uid()
    OR (
      public.in_same_group(auth.uid(), guest_id)
      AND public.guest_has_event_access(guest_id, event_id)
    )
  );

-- Guests can update their own RSVPs or those of group members
CREATE POLICY "Guests can update own and group RSVPs"
  ON rsvps FOR UPDATE TO authenticated
  USING (
    guest_id = auth.uid()
    OR public.in_same_group(auth.uid(), guest_id)
  )
  WITH CHECK (
    guest_id = auth.uid()
    OR (
      public.in_same_group(auth.uid(), guest_id)
      AND public.guest_has_event_access(guest_id, event_id)
    )
  );
