import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import type { WeddingEvent, EventFAQ, EventItineraryItem } from '@/types/admin';

interface ManageEventDetailsProps {
  events: WeddingEvent[];
  onEventUpdated: () => void;
}

export function ManageEventDetails({ events, onEventUpdated }: ManageEventDetailsProps) {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [faqs, setFaqs] = useState<EventFAQ[]>([]);
  const [itinerary, setItinerary] = useState<EventItineraryItem[]>([]);
  const [saving, setSaving] = useState(false);

  // New item forms
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newItineraryTime, setNewItineraryTime] = useState('');
  const [newItineraryTitle, setNewItineraryTitle] = useState('');
  const [newItineraryDesc, setNewItineraryDesc] = useState('');

  useEffect(() => {
    if (!selectedEventId) return;
    fetchEventDetails();
  }, [selectedEventId]);

  const fetchEventDetails = async () => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    setDressCode(selectedEvent?.dress_code || '');

    const [faqRes, itineraryRes] = await Promise.all([
      supabaseAdmin.from('event_faqs').select('*').eq('event_id', selectedEventId).order('sort_order'),
      supabaseAdmin.from('event_itinerary_items').select('*').eq('event_id', selectedEventId).order('sort_order'),
    ]);

    if (faqRes.data) setFaqs(faqRes.data);
    if (itineraryRes.data) setItinerary(itineraryRes.data);
  };

  const handleSaveDressCode = async () => {
    setSaving(true);
    const { error } = await supabaseAdmin
      .from('events')
      .update({ dress_code: dressCode })
      .eq('id', selectedEventId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Saved', description: 'Dress code updated.' });
      onEventUpdated();
    }
    setSaving(false);
  };

  const handleAddFaq = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const nextOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.sort_order)) + 1 : 0;
    const { error } = await supabaseAdmin.from('event_faqs').insert({
      event_id: selectedEventId,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim(),
      sort_order: nextOrder,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      fetchEventDetails();
      toast({ title: 'FAQ added' });
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    const { error } = await supabaseAdmin.from('event_faqs').delete().eq('id', faqId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setFaqs(prev => prev.filter(f => f.id !== faqId));
      toast({ title: 'FAQ removed' });
    }
  };

  const handleAddItineraryItem = async () => {
    if (!newItineraryTime.trim() || !newItineraryTitle.trim()) return;

    const nextOrder = itinerary.length > 0 ? Math.max(...itinerary.map(i => i.sort_order)) + 1 : 0;
    const { error } = await supabaseAdmin.from('event_itinerary_items').insert({
      event_id: selectedEventId,
      time: newItineraryTime.trim(),
      title: newItineraryTitle.trim(),
      description: newItineraryDesc.trim() || null,
      sort_order: nextOrder,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setNewItineraryTime('');
      setNewItineraryTitle('');
      setNewItineraryDesc('');
      fetchEventDetails();
      toast({ title: 'Itinerary item added' });
    }
  };

  const handleDeleteItineraryItem = async (itemId: string) => {
    const { error } = await supabaseAdmin.from('event_itinerary_items').delete().eq('id', itemId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setItinerary(prev => prev.filter(i => i.id !== itemId));
      toast({ title: 'Itinerary item removed' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Event Details</CardTitle>
        <CardDescription>Add dress code, itinerary, and FAQs for each event.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Event Selector */}
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an event" />
          </SelectTrigger>
          <SelectContent>
            {events.map(event => (
              <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedEventId && (
          <div className="space-y-8">
            {/* Dress Code Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Dress Code</h3>
              <Textarea
                placeholder="e.g., Black tie optional. Ladies in floor-length gowns or cocktail dresses, gentlemen in dark suits or tuxedos."
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                rows={3}
              />
              <Button size="sm" onClick={handleSaveDressCode} disabled={saving}>
                {saving ? 'Saving...' : 'Save Dress Code'}
              </Button>
            </div>

            {/* Itinerary Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Itinerary</h3>

              {itinerary.length > 0 && (
                <div className="space-y-2">
                  {itinerary.map(item => (
                    <div key={item.id} className="flex items-start gap-2 p-3 bg-stone-50 rounded-lg">
                      <GripVertical className="w-4 h-4 mt-1 text-stone-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-500">{item.time}</p>
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.description && <p className="text-xs text-stone-500">{item.description}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteItineraryItem(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Time (e.g., 5:00 PM)"
                  value={newItineraryTime}
                  onChange={(e) => setNewItineraryTime(e.target.value)}
                />
                <Input
                  placeholder="Title (e.g., Cocktail Hour)"
                  value={newItineraryTitle}
                  onChange={(e) => setNewItineraryTitle(e.target.value)}
                />
              </div>
              <Input
                placeholder="Description (optional)"
                value={newItineraryDesc}
                onChange={(e) => setNewItineraryDesc(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={handleAddItineraryItem}>
                <Plus className="w-4 h-4 mr-1" /> Add Itinerary Item
              </Button>
            </div>

            {/* FAQs Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">FAQs</h3>

              {faqs.length > 0 && (
                <div className="space-y-2">
                  {faqs.map(faq => (
                    <div key={faq.id} className="flex items-start gap-2 p-3 bg-stone-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{faq.question}</p>
                        <p className="text-xs text-stone-500 mt-1">{faq.answer}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(faq.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Input
                placeholder="Question"
                value={newFaqQuestion}
                onChange={(e) => setNewFaqQuestion(e.target.value)}
              />
              <Textarea
                placeholder="Answer"
                value={newFaqAnswer}
                onChange={(e) => setNewFaqAnswer(e.target.value)}
                rows={2}
              />
              <Button size="sm" variant="outline" onClick={handleAddFaq}>
                <Plus className="w-4 h-4 mr-1" /> Add FAQ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
