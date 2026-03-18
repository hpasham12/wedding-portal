import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; // Make sure this is the NORMAL client, not the admin one!
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin } from 'lucide-react'; // Assuming you use lucide-react for icons

// --- Types ---
interface WeddingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
}

interface GuestProfile {
  full_name: string;
  is_admin: boolean;
}

export default function Dashboard() {
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        .select('full_name, is_admin')
        .eq('id', userId)
        .single();
        
      if (profileData) setProfile(profileData);

      // 3. Fetch ONLY the events this guest has access to
      // We query the 'access' table and use Supabase's foreign key joining to grab the linked event details
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
        // The data comes back nested like [{ events: { id: 1, name: '...' } }]. 
        // We map it to flatten it into a simple array of events.
        // @ts-ignore - Supabase types can be tricky with joins, so we force the mapping
        const formattedEvents = accessData.map(record => record.events).filter(Boolean) as WeddingEvent[];
        
        // Sort events by date
        formattedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(formattedEvents);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [navigate]);

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
            We are so excited to celebrate with you! Here are the events you are invited to.
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
            {events.map((event) => (
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
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 