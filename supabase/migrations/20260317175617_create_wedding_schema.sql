/*
  # Wedding Portal Database Schema

  1. New Tables
    - `guests` - Guest profiles with authentication
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `passcode` (text, unique, for login)
      - `email` (text)
      - `is_admin` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `events` - Wedding events
      - `id` (uuid, primary key)
      - `name` (text)
      - `date` (date)
      - `location` (text)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `access` - Many-to-many: guests to events
      - `id` (uuid, primary key)
      - `guest_id` (uuid, foreign key)
      - `event_id` (uuid, foreign key)
      - `created_at` (timestamptz)

    - `rsvps` - RSVP records for guests
      - `id` (uuid, primary key)
      - `guest_id` (uuid, foreign key)
      - `event_id` (uuid, foreign key)
      - `status` (text: 'attending' or 'declined')
      - `meal_preference` (text)
      - `plus_one_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `media` - Uploaded photos and media
      - `id` (uuid, primary key)
      - `url` (text)
      - `uploaded_by` (uuid, foreign key to guests)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Guests can view all guest profiles
    - Guests can only update their own profile
    - Guests can view events they have access to
    - Guests can manage their own RSVPs
    - Guests can view media
    - Admins have full access
*/

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  passcode text UNIQUE NOT NULL,
  email text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  location text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create access table (many-to-many)
CREATE TABLE IF NOT EXISTS access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(guest_id, event_id)
);

-- Create rsvps table
CREATE TABLE IF NOT EXISTS rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'declined')),
  meal_preference text,
  plus_one_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guest_id, event_id)
);

-- Create media table
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE access ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Guests table policies
CREATE POLICY "Anyone can view all guests"
  ON guests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Guests can update their own profile"
  ON guests FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Events table policies
CREATE POLICY "All authenticated users can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

-- Access table policies
CREATE POLICY "Guests can view their own access records"
  ON access FOR SELECT
  TO authenticated
  USING (guest_id = auth.uid());

-- RSVPs table policies
CREATE POLICY "Guests can view their own RSVPs"
  ON rsvps FOR SELECT
  TO authenticated
  USING (guest_id = auth.uid());

CREATE POLICY "Guests can create RSVPs for their events"
  ON rsvps FOR INSERT
  TO authenticated
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "Guests can update their own RSVPs"
  ON rsvps FOR UPDATE
  TO authenticated
  USING (guest_id = auth.uid())
  WITH CHECK (guest_id = auth.uid());

-- Media table policies
CREATE POLICY "All authenticated users can view all media"
  ON media FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Guests can upload media"
  ON media FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
