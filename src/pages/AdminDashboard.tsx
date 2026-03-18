import { useState, useEffect } from 'react';
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

export default function AdminDashboard() {
  const { toast } = useToast();

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

  // --- State: Access ---
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [togglingAccess, setTogglingAccess] = useState<string | null>(null); // tracks guest_id being updated

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
      // Revoke access
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
      // Grant access
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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-stone-900">Admin Dashboard</h1>
          <p className="text-stone-600 mt-2">Manage guests, events, and invitations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: Creation Forms */}
          <div className="space-y-8">
            {/* Create Guest Form */}
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

            {/* Create Event Form */}
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
            {/* Access Management */}
            <Card className="border-stone-800 bg-stone-900 text-stone-50">
              <CardHeader>
                <CardTitle className="text-stone-50">Manage Invitations</CardTitle>
                <CardDescription className="text-stone-400">Select an event to assign guests to it.</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-stone-400">Create an event first to assign guests.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-300">Select Event</label>
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

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      <label className="text-sm font-medium text-stone-300">Invited Guests</label>
                      {guests.map(guest => {
                        const hasAccess = accessRecords.some(a => a.guest_id === guest.id && a.event_id === selectedEventId);
                        const isUpdating = togglingAccess === guest.id;
                        
                        return (
                          <div key={guest.id} className="flex items-center space-x-3 bg-stone-800 p-3 rounded-md">
                            <input 
                              type="checkbox"
                              id={`guest-${guest.id}`}
                              checked={hasAccess}
                              onChange={() => handleToggleAccess(guest.id, selectedEventId, hasAccess)}
                              disabled={isUpdating}
                              className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500"
                            />
                            <label htmlFor={`guest-${guest.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                              {guest.full_name}
                              <span className="block text-xs text-stone-400 mt-1">{guest.email}</span>
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

            {/* Guest List Summary */}
            <Card>
              <CardHeader>
                <CardTitle>All Guests</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingGuests ? (
                  <p className="text-stone-500 text-sm">Loading guests...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-stone-500 uppercase bg-stone-100 border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Passcode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guests.map((guest) => (
                          <tr key={guest.id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium text-stone-900">{guest.full_name}</td>
                            <td className="px-4 py-3 font-mono text-stone-600">{guest.passcode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
        </div>
      </div>
    </div>
  );
}