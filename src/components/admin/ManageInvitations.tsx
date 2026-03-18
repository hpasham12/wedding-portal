import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Guest, WeddingEvent, AccessRecord } from '@/types/admin';

interface ManageInvitationsProps {
  guests: Guest[];
  events: WeddingEvent[];
  accessRecords: AccessRecord[];
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
  onAccessChange: (updated: AccessRecord[]) => void;
}

export function ManageInvitations({
  guests,
  events,
  accessRecords,
  selectedEventId,
  onSelectEvent,
  onAccessChange,
}: ManageInvitationsProps) {
  const { toast } = useToast();

  const handleToggleAccess = async (guestId: string, eventId: string, hasAccess: boolean) => {
    if (hasAccess) {
      const { error } = await supabaseAdmin
        .from('access')
        .delete()
        .match({ guest_id: guestId, event_id: eventId });

      if (!error) {
        onAccessChange(accessRecords.filter(a => !(a.guest_id === guestId && a.event_id === eventId)));
      } else {
        toast({ variant: 'destructive', title: 'Error revoking access', description: error.message });
      }
    } else {
      const { error } = await supabaseAdmin
        .from('access')
        .insert([{ guest_id: guestId, event_id: eventId }]);

      if (!error) {
        onAccessChange([...accessRecords, { guest_id: guestId, event_id: eventId }]);
      } else {
        toast({ variant: 'destructive', title: 'Error granting access', description: error.message });
      }
    }
  };

  return (
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
                onChange={(e) => onSelectEvent(e.target.value)}
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
                return (
                  <div key={guest.id} className="flex items-center space-x-3 bg-stone-800 p-2 rounded-md hover:bg-stone-700 transition-colors">
                    <input
                      type="checkbox"
                      id={`guest-${guest.id}`}
                      checked={hasAccess}
                      onChange={() => handleToggleAccess(guest.id, selectedEventId, hasAccess)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-500"
                    />
                    <label htmlFor={`guest-${guest.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1 py-1">
                      {guest.full_name}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
