import { useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Create the user in Supabase Auth
    // Because of our SQL trigger, this will automatically create the row in public.guests!
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: passcode,
      email_confirm: true, // Skips the email verification step
      user_metadata: {
        full_name: fullName,
        passcode: passcode,
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating guest",
        description: error.message,
      });
    } else {
      toast({
        title: "Guest created!",
        description: `${fullName} can now log in with their email and passcode.`,
      });
      // Clear the form
      setFullName('');
      setEmail('');
      setPasscode('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-stone-900">Admin Dashboard</h1>
          <p className="text-stone-600 mt-2">Manage your wedding guests and portal settings.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Guest</CardTitle>
            <CardDescription>
              Generate a secure login for a new guest. This will automatically sync with your database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGuest} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input 
                    placeholder="e.g. Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input 
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Unique Passcode</label>
                <div className="flex gap-2">
                  <Input 
                    type="text"
                    placeholder="Enter a secure passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setPasscode(Math.random().toString(36).slice(-6).toUpperCase())}
                  >
                    Generate
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Guest...' : 'Create Guest Access'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}