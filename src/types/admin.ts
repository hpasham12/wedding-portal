export interface Guest {
  id: string;
  full_name: string;
  email: string;
  passcode: string;
  created_at: string;
  group_id: string | null;
}

export interface GuestGroup {
  id: string;
  members: Guest[];
}

export interface WeddingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  dress_code?: string;
}

export interface AccessRecord {
  guest_id: string;
  event_id: string;
}

export interface RSVPRecord {
  guest_id: string;
  event_id: string;
  status: 'attending' | 'declined';
}

export interface EventFAQ {
  id: string;
  event_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface EventItineraryItem {
  id: string;
  event_id: string;
  time: string;
  title: string;
  description?: string;
  sort_order: number;
}
