import { useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AddGuestFormProps {
  onGuestCreated: () => void;
}

export function AddGuestForm({ onGuestCreated }: AddGuestFormProps) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [creating, setCreating] = useState(false);

  const generatePasscode = () => setPasscode(Math.random().toString(36).slice(-6).toUpperCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: passcode,
      email_confirm: true,
      user_metadata: { full_name: fullName, passcode },
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Guest created!', description: `${fullName} added.` });
      setFullName('');
      setEmail('');
      setPasscode('');
      onGuestCreated();
    }
    setCreating(false);
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
          <Button type="submit" className="w-full" disabled={creating}>
            {creating ? 'Creating...' : 'Create Guest'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
