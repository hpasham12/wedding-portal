-- Add dress_code column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS dress_code text;

-- Create event_faqs table
CREATE TABLE IF NOT EXISTS event_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create event_itinerary_items table
CREATE TABLE IF NOT EXISTS event_itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  time text NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_itinerary_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_faqs
CREATE POLICY "Authenticated users can view event FAQs"
  ON event_faqs FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for event_itinerary_items
CREATE POLICY "Authenticated users can view event itinerary items"
  ON event_itinerary_items FOR SELECT
  TO authenticated
  USING (true);
