import { useMemo, useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { X, Users, UserPlus } from 'lucide-react';
import type { Guest } from '@/types/admin';

interface ManageGuestGroupsProps {
  guests: Guest[];
  onGroupsChanged: () => void;
}

export function ManageGuestGroups({ guests, onGroupsChanged }: ManageGuestGroupsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newGroupGuest1, setNewGroupGuest1] = useState('');
  const [newGroupGuest2, setNewGroupGuest2] = useState('');
  // Per-group state for the "add guest" dropdown
  const [addToGroupSelections, setAddToGroupSelections] = useState<Record<string, string>>({});

  const groups = useMemo(() => {
    const groupMap: Record<string, Guest[]> = {};
    guests.forEach(g => {
      if (g.group_id) {
        if (!groupMap[g.group_id]) groupMap[g.group_id] = [];
        groupMap[g.group_id].push(g);
      }
    });
    return Object.entries(groupMap).map(([id, members]) => ({ id, members }));
  }, [guests]);

  const ungroupedGuests = useMemo(() => guests.filter(g => !g.group_id), [guests]);

  const handleRemoveFromGroup = async (guest: Guest) => {
    if (!guest.group_id) return;
    setLoading(true);

    await supabaseAdmin.from('guests').update({ group_id: null }).eq('id', guest.id);

    const remainingMembers = guests.filter(g => g.group_id === guest.group_id && g.id !== guest.id);
    if (remainingMembers.length === 1) {
      // Only one member left — dissolve the group
      await supabaseAdmin.from('guests').update({ group_id: null }).eq('id', remainingMembers[0].id);
      await supabaseAdmin.from('guest_groups').delete().eq('id', guest.group_id);
      toast({ title: 'Group dissolved', description: 'The group only had one member remaining and has been removed.' });
    } else if (remainingMembers.length === 0) {
      await supabaseAdmin.from('guest_groups').delete().eq('id', guest.group_id);
    } else {
      toast({ title: `${guest.full_name} removed from group` });
    }

    setLoading(false);
    onGroupsChanged();
  };

  const handleAddToGroup = async (groupId: string) => {
    const guestId = addToGroupSelections[groupId];
    if (!guestId) return;
    setLoading(true);

    await supabaseAdmin.from('guests').update({ group_id: groupId }).eq('id', guestId);

    setAddToGroupSelections(prev => ({ ...prev, [groupId]: '' }));
    toast({ title: 'Guest added to group' });
    setLoading(false);
    onGroupsChanged();
  };

  const handleCreateGroup = async () => {
    if (!newGroupGuest1 || !newGroupGuest2 || newGroupGuest1 === newGroupGuest2) return;
    setLoading(true);

    const { data: newGroup, error } = await supabaseAdmin
      .from('guest_groups')
      .insert({})
      .select()
      .single();

    if (error || !newGroup) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message });
      setLoading(false);
      return;
    }

    await supabaseAdmin
      .from('guests')
      .update({ group_id: newGroup.id })
      .in('id', [newGroupGuest1, newGroupGuest2]);

    setNewGroupGuest1('');
    setNewGroupGuest2('');
    toast({ title: 'Group created' });
    setLoading(false);
    onGroupsChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Family Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Existing groups */}
        {groups.length === 0 ? (
          <p className="text-sm text-stone-500">No groups yet.</p>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.id} className="border border-stone-200 rounded-lg p-3 space-y-2">
                <div className="space-y-1">
                  {group.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <span className="text-stone-800 font-medium">{member.full_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-stone-400 hover:text-red-600"
                        disabled={loading}
                        onClick={() => handleRemoveFromGroup(member)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {ungroupedGuests.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t border-stone-100">
                    <select
                      className="flex-1 border border-stone-200 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                      value={addToGroupSelections[group.id] ?? ''}
                      onChange={e => setAddToGroupSelections(prev => ({ ...prev, [group.id]: e.target.value }))}
                    >
                      <option value="">Add a guest...</option>
                      {ungroupedGuests.map(g => (
                        <option key={g.id} value={g.id}>{g.full_name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={loading || !addToGroupSelections[group.id]}
                      onClick={() => handleAddToGroup(group.id)}
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create a new group from two ungrouped guests */}
        {ungroupedGuests.length >= 2 && (
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <p className="text-sm font-medium text-stone-700">Create New Group</p>
            <div className="flex gap-2">
              <select
                className="flex-1 border border-stone-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                value={newGroupGuest1}
                onChange={e => setNewGroupGuest1(e.target.value)}
              >
                <option value="">Guest 1...</option>
                {ungroupedGuests.filter(g => g.id !== newGroupGuest2).map(g => (
                  <option key={g.id} value={g.id}>{g.full_name}</option>
                ))}
              </select>
              <select
                className="flex-1 border border-stone-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                value={newGroupGuest2}
                onChange={e => setNewGroupGuest2(e.target.value)}
              >
                <option value="">Guest 2...</option>
                {ungroupedGuests.filter(g => g.id !== newGroupGuest1).map(g => (
                  <option key={g.id} value={g.id}>{g.full_name}</option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              disabled={loading || !newGroupGuest1 || !newGroupGuest2}
              onClick={handleCreateGroup}
            >
              Link Guests
            </Button>
          </div>
        )}

        {ungroupedGuests.length === 0 && groups.length === 0 && (
          <p className="text-sm text-stone-500">Add guests first to create groups.</p>
        )}
      </CardContent>
    </Card>
  );
}
