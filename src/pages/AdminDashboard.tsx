import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Button } from '@/components/ui/button';
import { AddGuestForm } from '@/components/admin/AddGuestForm';
import { CreateEventForm } from '@/components/admin/CreateEventForm';
import { ManageInvitations } from '@/components/admin/ManageInvitations';
import { RSVPOverview } from '@/components/admin/RSVPOverview';
import { ManageEventDetails } from '@/components/admin/ManageEventDetails';
import { ManageGuestGroups } from '@/components/admin/ManageGuestGroups';
import type { Guest, WeddingEvent, AccessRecord, RSVPRecord } from '@/types/admin';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([]);
  const [rsvps, setRsvps] = useState<RSVPRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');

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

  const fetchData = async () => {
    const [{ data: guestData }, { data: eventData }, { data: accessData }, { data: rsvpData }] = await Promise.all([
      supabaseAdmin.from('guests').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('events').select('*').order('date', { ascending: true }),
      supabaseAdmin.from('access').select('guest_id, event_id'),
      supabaseAdmin.from('rsvps').select('guest_id, event_id, status'),
    ]);

    if (guestData) setGuests(guestData);
    if (eventData) {
      setEvents(eventData);
      if (eventData.length > 0 && !selectedEventId) {
        setSelectedEventId(eventData[0].id);
      }
    }
    if (accessData) setAccessRecords(accessData);
    if (rsvpData) setRsvps(rsvpData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="text-stone-900">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-serif font-medium">Our Wedding</h1>
            <span className="bg-stone-800 text-stone-100 text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button>
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
            <div className="space-y-8">
              <AddGuestForm guests={guests} onGuestCreated={fetchData} />
              <ManageGuestGroups guests={guests} onGroupsChanged={fetchData} />
              <CreateEventForm onEventCreated={fetchData} />
            </div>

            <div className="space-y-8">
              <ManageEventDetails
                events={events}
                onEventUpdated={fetchData}
              />
              <ManageInvitations
                guests={guests}
                events={events}
                accessRecords={accessRecords}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                onAccessChange={setAccessRecords}
              />
              <RSVPOverview
                guests={guests}
                accessRecords={accessRecords}
                rsvps={rsvps}
                selectedEventId={selectedEventId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
