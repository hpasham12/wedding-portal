import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, MapPin, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

// --- Types ---
interface WeddingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
}

interface GuestProfile {
  id: string;
  full_name: string;
  is_admin: boolean;
  group_id: string | null;
}

interface GroupMember {
  id: string;
  full_name: string;
}

export default function Dashboard() {
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  // rsvps[guestId][eventId] = status
  const [rsvps, setRsvps] = useState<Record<string, Record<string, string>>>({});
  // groupMemberEventIds[guestId] = Set of event IDs they have access to
  const [groupMemberEventIds, setGroupMemberEventIds] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  // tracks in-progress upserts by key `${guestId}-${eventId}`
  const [updatingRsvp, setUpdatingRsvp] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/login');
        return;
      }

      const userId = session.user.id;

      // 1. Fetch profile (including group_id)
      const { data: profileData } = await supabase
        .from('guests')
        .select('id, full_name, is_admin, group_id')
        .eq('id', userId)
        .single();

      if (profileData) setProfile(profileData);

      // 2. Fetch events this guest has access to (explicit filter to avoid picking up group members' records)
      const { data: accessData, error: accessError } = await supabase
        .from('access')
        .select('events ( id, name, date, location, description )')
        .eq('guest_id', userId);

      let fetchedEvents: WeddingEvent[] = [];
      if (!accessError && accessData) {
        // @ts-ignore
        fetchedEvents = accessData.map(r => r.events).filter(Boolean) as WeddingEvent[];
        fetchedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(fetchedEvents);
      }

      // 3. Fetch group members and their event access (if in a group)
      let members: GroupMember[] = [];
      const memberEventMap: Record<string, Set<string>> = {};

      if (profileData?.group_id) {
        const { data: membersData } = await supabase
          .from('guests')
          .select('id, full_name')
          .eq('group_id', profileData.group_id)
          .neq('id', userId);

        if (membersData && membersData.length > 0) {
          members = membersData;

          const memberIds = membersData.map(m => m.id);
          const { data: memberAccessData } = await supabase
            .from('access')
            .select('guest_id, event_id')
            .in('guest_id', memberIds);

          if (memberAccessData) {
            memberAccessData.forEach(a => {
              if (!memberEventMap[a.guest_id]) memberEventMap[a.guest_id] = new Set();
              memberEventMap[a.guest_id].add(a.event_id);
            });
          }
        }
      }

      setGroupMembers(members);
      setGroupMemberEventIds(memberEventMap);

      // 4. Fetch RSVPs for self and all group members
      const allGuestIds = [userId, ...members.map(m => m.id)];
      const { data: rsvpData } = await supabase
        .from('rsvps')
        .select('guest_id, event_id, status')
        .in('guest_id', allGuestIds);

      if (rsvpData) {
        const rsvpMap: Record<string, Record<string, string>> = {};
        rsvpData.forEach(r => {
          if (!rsvpMap[r.guest_id]) rsvpMap[r.guest_id] = {};
          rsvpMap[r.guest_id][r.event_id] = r.status;
        });
        setRsvps(rsvpMap);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [navigate]);

  const handleRSVP = async (guestId: string, eventId: string, status: 'attending' | 'declined') => {
    const key = `${guestId}-${eventId}`;
    setUpdatingRsvp(prev => new Set([...prev, key]));

    const { error } = await supabase
      .from('rsvps')
      .upsert(
        { guest_id: guestId, event_id: eventId, status, updated_at: new Date().toISOString() },
        { onConflict: 'guest_id, event_id' }
      );

    if (error) {
      toast({ variant: 'destructive', title: 'Error saving RSVP', description: 'Please try again or contact the couple.' });
    } else {
      setRsvps(prev => ({
        ...prev,
        [guestId]: { ...(prev[guestId] ?? {}), [eventId]: status },
      }));
      toast({
        title: status === 'attending' ? "Can't wait to see you!" : "We'll miss you!",
        description: 'Your RSVP has been safely recorded.',
      });
    }

    setUpdatingRsvp(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-stone-500 animate-pulse">Loading your itinerary...</p>
      </div>
    );
  }

  return (
    <div className="text-stone-900">
      {/* Navigation / Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-serif font-medium">Our Wedding</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-600 hidden md:inline-block">
              Welcome, {profile?.full_name}
            </span>
            {profile?.is_admin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin-dashboard')}>
                Admin Dashboard
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif mb-2">Your Itinerary</h2>
          <p className="text-stone-600">
            We are so excited to celebrate with you! Please let us know if you can make it to the events below.
          </p>
        </div>

        {events.length === 0 ? (
          <Card className="bg-stone-100 border-dashed border-stone-300">
            <CardContent className="py-12 text-center">
              <p className="text-stone-500">
                You haven't been assigned to any events yet. Check back closer to the wedding date!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              // Group members who also have access to this event
              const membersForEvent = groupMembers.filter(
                m => groupMemberEventIds[m.id]?.has(event.id)
              );

              // All people whose RSVP we show: current user first, then group members
              const rsvpPersons = profile
                ? [{ id: profile.id, full_name: profile.full_name }, ...membersForEvent]
                : membersForEvent;

              return (
                <Card key={event.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl">{event.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="space-y-2 text-sm text-stone-600">
                      <div className="flex items-start gap-2">
                        <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-sm text-stone-700 pt-2 border-t border-stone-100">
                        {event.description}
                      </p>
                    )}
                  </CardContent>

                  {/* View Details Link */}
                  <CardContent className="pt-0">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-stone-600 hover:text-stone-900"
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>

                  {/* RSVP Section — one row per person */}
                  <CardFooter className="flex flex-col gap-3 pt-4 border-t border-stone-100 bg-stone-50/50 rounded-b-xl">
                    {rsvpPersons.map((person, idx) => {
                      const currentStatus = rsvps[person.id]?.[event.id];
                      const isUpdating = updatingRsvp.has(`${person.id}-${event.id}`);

                      return (
                        <div key={person.id} className="w-full space-y-1">
                          {rsvpPersons.length > 1 && (
                            <p className="text-xs font-medium text-stone-500 truncate">
                              {person.full_name}
                              {idx === 0 && ' (you)'}
                            </p>
                          )}
                          {idx === 0 && rsvpPersons.length === 1 && (
                            <p className="text-sm font-medium w-full text-center text-stone-700">
                              Will you be attending?
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-2 w-full">
                            <Button
                              variant={currentStatus === 'attending' ? 'default' : 'outline'}
                              className={`w-full ${currentStatus === 'attending' ? 'bg-green-700 hover:bg-green-800 text-white' : ''}`}
                              onClick={() => handleRSVP(person.id, event.id, 'attending')}
                              disabled={isUpdating}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Yes
                            </Button>
                            <Button
                              variant={currentStatus === 'declined' ? 'default' : 'outline'}
                              className={`w-full ${currentStatus === 'declined' ? 'bg-stone-800 hover:bg-stone-900 text-white' : ''}`}
                              onClick={() => handleRSVP(person.id, event.id, 'declined')}
                              disabled={isUpdating}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              No
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
