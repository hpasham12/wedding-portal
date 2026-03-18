import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// --- Types ---
interface Guest {
  id: string;
  full_name: string;
  email: string;
  passcode: string;
  created_at: string;
}

interface WeddingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
}

interface AccessRecord {
  guest_id: string;
  event_id: string;
}

interface RSVPRecord {
  guest_id: string;
  event_id: string;
  status: 'attending' | 'declined';
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Admin Auth Check ---
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data } = await supabase
        .from('guests')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (!data?.is_admin) navigate('/dashboard');
    };
    checkAdmin();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // --- State: Guests ---
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [creatingGuest, setCreatingGuest] = useState(false);

  // --- State: Events ---
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  // --- State: Access & RSVPs ---
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([]);
  const [rsvps, setRsvps] = useState<RSVPRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [togglingAccess, setTogglingAccess] = useState<string | null>(null);

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoadingGuests(true);
    setLoadingEvents(true);

    // Fetch Guests
    const { data: guestData } = await supabaseAdmin
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });
    if (guestData) setGuests(guestData);
    setLoadingGuests(false);

    // Fetch Events
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    if (eventData) {
      setEvents(eventData);
      if (eventData.length > 0 && !selectedEventId) {
        setSelectedEventId(eventData[0].id);
      }
    }
    setLoadingEvents(false);

    // Fetch Access Records
    const { data: accessData } = await supabaseAdmin
      .from('access')
      .select('guest_id, event_id');
    if (accessData) setAccessRecords(accessData);

    // Fetch RSVPs
    const { data: rsvpData } = await supabaseAdmin
      .from('rsvps')
      .select('guest_id, event_id, status');
    if (rsvpData) setRsvps(rsvpData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers: Guests ---
  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingGuest(true);

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: passcode,
      email_confirm: true,
      user_metadata: { full_name: fullName, passcode: passcode }
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Guest created!", description: `${fullName} added.` });
      setFullName(''); setEmail(''); setPasscode('');
      fetchData();
    }
    setCreatingGuest(false);
  };

  const generatePasscode = () => setPasscode(Math.random().toString(36).slice(-6).toUpperCase());

  // --- Handlers: Events ---
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingEvent(true);

    const { error } = await supabaseAdmin.from('events').insert([
      { name: eventName, date: eventDate, location: eventLocation, description: eventDescription }
    ]);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Event created!", description: `${eventName} has been added to the schedule.` });
      setEventName(''); setEventDate(''); setEventLocation(''); setEventDescription('');
      fetchData();
    }
    setCreatingEvent(false);
  };

  // --- Handlers: Access ---
  const handleToggleAccess = async (guestId: string, eventId: string, hasAccess: boolean) => {
    setTogglingAccess(guestId);

    if (hasAccess) {
      const { error } = await supabaseAdmin
        .from('access')
        .delete()
        .match({ guest_id: guestId, event_id: eventId });
      
      if (!error) {
        setAccessRecords(prev => prev.filter(a => !(a.guest_id === guestId && a.event_id === eventId)));
      } else {
        toast({ variant: "destructive", title: "Error revoking access", description: error.message });
      }
    } else {
      const { error } = await supabaseAdmin
        .from('access')
        .insert([{ guest_id: guestId, event_id: eventId }]);
      
      if (!error) {
        setAccessRecords(prev => [...prev, { guest_id: guestId, event_id: eventId }]);
      } else {
        toast({ variant: "destructive", title: "Error granting access", description: error.message });
      }
    }
    setTogglingAccess(null);
  };

  // --- Derived Data for Selected Event ---
  const invitedGuests = guests.filter(g => accessRecords.some(a => a.guest_id === g.id && a.event_id === selectedEventId));
  const attendingCount = invitedGuests.filter(g => rsvps.some(r => r.guest_id === g.id && r.event_id === selectedEventId && r.status === 'attending')).length;
  const declinedCount = invitedGuests.filter(g => rsvps.some(r => r.guest_id === g.id && r.event_id === selectedEventId && r.status === 'declined')).length;
  const pendingCount = invitedGuests.length - attendingCount - declinedCount;

  return (
    <div className="text-stone-900">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-serif font-medium">Our Wedding</h1>
            <span className="bg-stone-800 text-stone-100 text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-serif text-stone-900">Admin Dashboard</h1>
            <p className="text-stone-600 mt-2">Manage guests, events, and track RSVPs.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* LEFT COLUMN: Creation Forms */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Guest</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateGuest} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <Input placeholder="e.g. Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Address</label>
                      <Input type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unique Passcode</label>
                      <div className="flex gap-2">
                        <Input type="text" placeholder="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} required />
                        <Button type="button" variant="outline" onClick={generatePasscode}>Generate</Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={creatingGuest}>
                      {creatingGuest ? 'Creating...' : 'Create Guest'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Event</CardTitle>
                  <CardDescription>Add a new event to the wedding schedule.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Event Name</label>
                        <Input placeholder="Rehearsal Dinner" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date & Time</label>
                        <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location</label>
                      <Input placeholder="123 Venue St, City, ST" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Input placeholder="Join us for drinks..." value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={creatingEvent}>
                      {creatingEvent ? 'Creating...' : 'Create Event'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Management & Assignment */}
            <div className="space-y-8">
              
              {/* Event Selector & Access Management */}
              <Card className="border-stone-800 bg-stone-900 text-stone-50">
                <CardHeader>
                  <CardTitle className="text-stone-50">Manage Invitations</CardTitle>
                  <CardDescription className="text-stone-400">Select an event to assign guests and view RSVPs.</CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-sm text-stone-400">Create an event first.</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-300">Select Event Context</label>
                        <select 
                          className="w-full p-2 rounded-md bg-stone-800 border border-stone-700 text-stone-50 focus:ring-2 focus:ring-stone-400"
                          value={selectedEventId}
                          onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                          {events.map(event => (
                            <option key={event.id} value={event.id}>{event.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar border-t border-stone-800 pt-4">
                        <label className="text-sm font-medium text-stone-300">Grant Access</label>
                        {guests.map(guest => {
                          const hasAccess = accessRecords.some(a => a.guest_id === guest.id && a.event_id === selectedEventId);
                          const isUpdating = togglingAccess === guest.id;
                          
                          return (
                            <div key={guest.id} className="flex items-center space-x-3 bg-stone-800 p-2 rounded-md hover:bg-stone-700 transition-colors">
                              <input 
                                type="checkbox"
                                id={`guest-${guest.id}`}
                                checked={hasAccess}
                                onChange={() => handleToggleAccess(guest.id, selectedEventId, hasAccess)}
                                disabled={isUpdating}
                                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500"
                              />
                              <label htmlFor={`guest-${guest.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1 py-1">
                                {guest.full_name}
                              </label>
                              {isUpdating && <span className="text-xs text-stone-400 animate-pulse">Saving...</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* NEW: RSVP Overview Card */}
              <Card>
                <CardHeader>
                  <CardTitle>RSVP Overview</CardTitle>
                  <CardDescription>
                    Status for the currently selected event above.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedEventId ? (
                    <p className="text-sm text-stone-500">Select an event to see RSVPs.</p>
                  ) : invitedGuests.length === 0 ? (
                    <p className="text-sm text-stone-500">No guests have been invited to this event yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {/* Metric blocks */}
                      <div className="grid grid-cols-4 gap-2 text-center border-b border-stone-100 pb-4">
                        <div className="bg-stone-100 p-2 rounded-md">
                          <p className="text-2xl font-serif text-stone-900">{invitedGuests.length}</p>
                          <p className="text-xs text-stone-500 uppercase font-bold mt-1">Invited</p>
                        </div>
                        <div className="bg-green-100 p-2 rounded-md">
                          <p className="text-2xl font-serif text-green-900">{attendingCount}</p>
                          <p className="text-xs text-green-700 uppercase font-bold mt-1">Yes</p>
                        </div>
                        <div className="bg-stone-200 p-2 rounded-md">
                          <p className="text-2xl font-serif text-stone-600">{declinedCount}</p>
                          <p className="text-xs text-stone-500 uppercase font-bold mt-1">No</p>
                        </div>
                        <div className="border border-dashed border-stone-200 p-2 rounded-md">
                          <p className="text-2xl font-serif text-stone-400">{pendingCount}</p>
                          <p className="text-xs text-stone-400 uppercase font-bold mt-1">Pending</p>
                        </div>
                      </div>

                      {/* Guest Status List */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {invitedGuests.map(guest => {
                          const rsvp = rsvps.find(r => r.guest_id === guest.id && r.event_id === selectedEventId);
                          let statusColor = "bg-stone-100 text-stone-500";
                          let statusText = "Pending";

                          if (rsvp?.status === 'attending') {
                            statusColor = "bg-green-100 text-green-800";
                            statusText = "Attending";
                          } else if (rsvp?.status === 'declined') {
                            statusColor = "bg-stone-200 text-stone-700";
                            statusText = "Declined";
                          }

                          return (
                            <div key={guest.id} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                              <span className="text-sm font-medium text-stone-800">{guest.full_name}</span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                                {statusText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}