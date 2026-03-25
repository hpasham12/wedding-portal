import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Guest, AccessRecord, RSVPRecord } from '@/types/admin';

interface RSVPOverviewProps {
  guests: Guest[];
  accessRecords: AccessRecord[];
  rsvps: RSVPRecord[];
  selectedEventId: string;
}

function RSVPBadge({ status }: { status: string | undefined }) {
  if (status === 'attending') return <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">Attending</span>;
  if (status === 'declined') return <span className="text-xs px-2 py-1 rounded-full font-medium bg-stone-200 text-stone-700">Declined</span>;
  return <span className="text-xs px-2 py-1 rounded-full font-medium bg-stone-100 text-stone-500">Pending</span>;
}

export function RSVPOverview({ guests, accessRecords, rsvps, selectedEventId }: RSVPOverviewProps) {
  const invitedGuests = guests.filter(g =>
    accessRecords.some(a => a.guest_id === g.id && a.event_id === selectedEventId)
  );

  const attendingCount = invitedGuests.filter(g =>
    rsvps.some(r => r.guest_id === g.id && r.event_id === selectedEventId && r.status === 'attending')
  ).length;
  const declinedCount = invitedGuests.filter(g =>
    rsvps.some(r => r.guest_id === g.id && r.event_id === selectedEventId && r.status === 'declined')
  ).length;
  const pendingCount = invitedGuests.length - attendingCount - declinedCount;

  // Group invited guests by group_id; ungrouped guests each form their own "group"
  const displayGroups = useMemo(() => {
    const grouped: { groupId: string | null; members: Guest[] }[] = [];
    const seen = new Set<string>();

    invitedGuests.forEach(guest => {
      if (seen.has(guest.id)) return;
      if (guest.group_id) {
        const groupMembers = invitedGuests.filter(g => g.group_id === guest.group_id);
        groupMembers.forEach(m => seen.add(m.id));
        grouped.push({ groupId: guest.group_id, members: groupMembers });
      } else {
        seen.add(guest.id);
        grouped.push({ groupId: null, members: [guest] });
      }
    });

    return grouped;
  }, [invitedGuests]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP Overview</CardTitle>
        <CardDescription>Status for the currently selected event above.</CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedEventId ? (
          <p className="text-sm text-stone-500">Select an event to see RSVPs.</p>
        ) : invitedGuests.length === 0 ? (
          <p className="text-sm text-stone-500">No guests have been invited to this event yet.</p>
        ) : (
          <div className="space-y-6">
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

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {displayGroups.map((group, i) => (
                <div key={group.groupId ?? group.members[0].id}>
                  {group.members.length > 1 && (
                    <p className="text-xs text-stone-400 uppercase font-bold mb-1 tracking-wide">
                      Group
                    </p>
                  )}
                  <div className={group.members.length > 1 ? 'border border-stone-100 rounded-md px-3 py-1' : ''}>
                    {group.members.map(guest => {
                      const rsvp = rsvps.find(r => r.guest_id === guest.id && r.event_id === selectedEventId);
                      return (
                        <div
                          key={guest.id}
                          className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0"
                        >
                          <span className="text-sm font-medium text-stone-800">{guest.full_name}</span>
                          <RSVPBadge status={rsvp?.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
