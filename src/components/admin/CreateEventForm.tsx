import { useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CreateEventFormProps {
  onEventCreated: () => void;
}

export function CreateEventForm({ onEventCreated }: CreateEventFormProps) {
  const { toast } = useToast();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { error } = await supabaseAdmin.from('events').insert([
      { name: eventName, date: eventDate, location: eventLocation, description: eventDescription },
    ]);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Event created!', description: `${eventName} has been added to the schedule.` });
      setEventName('');
      setEventDate('');
      setEventLocation('');
      setEventDescription('');
      onEventCreated();
    }
    setCreating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Event</CardTitle>
        <CardDescription>Add a new event to the wedding schedule.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={creating}>
            {creating ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
