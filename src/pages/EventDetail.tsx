import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, MapPin, Shirt, Clock, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface WeddingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  dress_code?: string;
}

interface EventFAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

interface EventItineraryItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  sort_order: number;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [faqs, setFaqs] = useState<EventFAQ[]>([]);
  const [itinerary, setItinerary] = useState<EventItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      // Check if this guest has access to this event
      const { data: accessData } = await supabase
        .from('access')
        .select('id')
        .eq('event_id', id)
        .eq('guest_id', session.user.id)
        .single();

      if (!accessData) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      // Fetch event, FAQs, and itinerary in parallel
      const [eventRes, faqRes, itineraryRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('event_faqs').select('*').eq('event_id', id).order('sort_order'),
        supabase.from('event_itinerary_items').select('*').eq('event_id', id).order('sort_order'),
      ]);

      if (eventRes.data) setEvent(eventRes.data);
      if (faqRes.data) setFaqs(faqRes.data);
      if (itineraryRes.data) setItinerary(itineraryRes.data);

      setLoading(false);
    };

    fetchEventDetails();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-500 animate-pulse">Loading event details...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-stone-500">You do not have access to this event.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-stone-500">Event not found.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="text-stone-900">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-serif font-medium">{event.name}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Event Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">{event.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-stone-600">
              <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-start gap-2 text-stone-600">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{event.location}</span>
            </div>
            {event.description && (
              <p className="text-stone-700 pt-2 border-t border-stone-100">
                {event.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Dress Code */}
        {event.dress_code && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Shirt className="w-5 h-5" />
                Dress Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-stone-700">{event.dress_code}</p>
            </CardContent>
          </Card>
        )}

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Itinerary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {itinerary.map((item, index) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-stone-800 shrink-0 mt-1.5" />
                      {index < itinerary.length - 1 && (
                        <div className="w-px flex-1 bg-stone-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-semibold text-stone-500">{item.time}</p>
                      <p className="font-medium text-stone-900">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-stone-600 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                FAQs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-stone-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
