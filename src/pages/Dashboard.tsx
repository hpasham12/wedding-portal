import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, MapPin, CheckCircle2, XCircle } from 'lucide-react';

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
}

export default function Dashboard() {
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [rsvps, setRsvps] = useState<Record<string, string>>({}); // Maps event_id -> status
  const [loading, setLoading] = useState(true);
  const [updatingRsvp, setUpdatingRsvp] = useState<string | null>(null); // Tracks which event is currently saving
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. Get current logged-in user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        navigate('/login');
        return;
      }

      const userId = session.user.id;

      // 2. Fetch the guest's profile name
      const { data: profileData } = await supabase
        .from('guests')
        .select('id, full_name, is_admin')
        .eq('id', userId)
        .single();
        
      if (profileData) setProfile(profileData);

      // 3. Fetch ONLY the events this guest has access to
      const { data: accessData, error: accessError } = await supabase
        .from('access')
        .select(`
          events (
            id,
            name,
            date,
            location,
            description
          )
        `);

      if (!accessError && accessData) {
        // @ts-ignore - Flattening the join response
        const formattedEvents = accessData.map(record => record.events).filter(Boolean) as WeddingEvent[];
        formattedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(formattedEvents);
      }

      // 4. Fetch the guest's existing RSVPs
      const { data: rsvpData } = await supabase
        .from('rsvps')
        .select('event_id, status')
        .eq('guest_id', userId);

      if (rsvpData) {
        // Convert array of RSVPs into an easy lookup object: { "event_id_123": "attending" }
        const rsvpMap = rsvpData.reduce((acc, curr) => {
          return { ...acc, [curr.event_id]: curr.status };
        }, {});
        setRsvps(rsvpMap);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [navigate]);

  const handleRSVP = async (eventId: string, status: 'attending' | 'declined') => {
    if (!profile?.id) return;
    setUpdatingRsvp(eventId);

    // Upsert will insert a new row if one doesn't exist, or update it if it does
    // It uses the UNIQUE(guest_id, event_id) constraint you set up in your migration
    const { error } = await supabase
      .from('rsvps')
      .upsert({
        guest_id: profile.id,
        event_id: eventId,
        status: status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'guest_id, event_id' });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error saving RSVP",
        description: "Please try again or contact the couple.",
      });
    } else {
      // Instantly update the UI to reflect the new choice
      setRsvps(prev => ({ ...prev, [eventId]: status }));
      toast({
        title: status === 'attending' ? "Can't wait to see you!" : "We'll miss you!",
        description: "Your RSVP has been safely recorded.",
      });
    }
    
    setUpdatingRsvp(null);
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
              const currentStatus = rsvps[event.id];
              const isUpdating = updatingRsvp === event.id;

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
                  
                  {/* RSVP Section */}
                  <CardFooter className="flex flex-col gap-3 pt-4 border-t border-stone-100 bg-stone-50/50 rounded-b-xl">
                    <p className="text-sm font-medium w-full text-center text-stone-700">
                      Will you be attending?
                    </p>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button
                        variant={currentStatus === 'attending' ? 'default' : 'outline'}
                        className={`w-full ${currentStatus === 'attending' ? 'bg-green-700 hover:bg-green-800 text-white' : ''}`}
                        onClick={() => handleRSVP(event.id, 'attending')}
                        disabled={isUpdating}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Yes
                      </Button>
                      
                      <Button
                        variant={currentStatus === 'declined' ? 'default' : 'outline'}
                        className={`w-full ${currentStatus === 'declined' ? 'bg-stone-800 hover:bg-stone-900 text-white' : ''}`}
                        onClick={() => handleRSVP(event.id, 'declined')}
                        disabled={isUpdating}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        No
                      </Button>
                    </div>
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