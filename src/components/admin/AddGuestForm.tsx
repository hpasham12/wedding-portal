import { useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Guest } from '@/types/admin';

interface AddGuestFormProps {
  guests: Guest[];
  onGuestCreated: () => void;
}

export function AddGuestForm({ guests, onGuestCreated }: AddGuestFormProps) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [linkToGuestId, setLinkToGuestId] = useState('');
  const [creating, setCreating] = useState(false);

  const generatePasscode = () => setPasscode(Math.random().toString(36).slice(-6).toUpperCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: passcode,
      email_confirm: true,
      user_metadata: { full_name: fullName, passcode },
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setCreating(false);
      return;
    }

    if (linkToGuestId && data.user) {
      const newUserId = data.user.id;

      // Find the target guest's current group
      const targetGuest = guests.find(g => g.id === linkToGuestId);
      let groupId: string | null = targetGuest?.group_id ?? null;

      if (!groupId) {
        // Neither guest is in a group yet — create a new group
        const { data: newGroup, error: groupError } = await supabaseAdmin
          .from('guest_groups')
          .insert({})
          .select()
          .single();

        if (groupError || !newGroup) {
          toast({ variant: 'destructive', title: 'Guest created but could not link', description: groupError?.message });
          setCreating(false);
          onGuestCreated();
          return;
        }

        groupId = newGroup.id;

        // Add the target guest to the new group
        await supabaseAdmin.from('guests').update({ group_id: groupId }).eq('id', linkToGuestId);
      }

      // Add the new guest to the group
      await supabaseAdmin.from('guests').update({ group_id: groupId }).eq('id', newUserId);
    }

    toast({ title: 'Guest created!', description: `${fullName} added.` });
    setFullName('');
    setEmail('');
    setPasscode('');
    setLinkToGuestId('');
    setCreating(false);
    onGuestCreated();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Guest</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input placeholder="e.g. Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Unique Passcode</label>
            <div className="flex gap-2">
              <Input type="text" placeholder="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} required />
              <Button type="button" variant="outline" onClick={generatePasscode}>Generate</Button>
            </div>
          </div>
          {guests.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Link to Family Group <span className="text-stone-400 font-normal">(optional)</span></label>
              <select
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                value={linkToGuestId}
                onChange={(e) => setLinkToGuestId(e.target.value)}
              >
                <option value="">None</option>
                {guests.map(g => (
                  <option key={g.id} value={g.id}>{g.full_name}</option>
                ))}
              </select>
              <p className="text-xs text-stone-500">
                This guest will be able to RSVP on behalf of the linked guest, and vice versa.
              </p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={creating}>
            {creating ? 'Creating...' : 'Create Guest'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
