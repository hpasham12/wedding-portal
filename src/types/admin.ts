export interface Guest {
  id: string;
  full_name: string;
  email: string;
  passcode: string;
  created_at: string;
}

export interface WeddingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
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
