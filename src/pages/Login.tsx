import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Guest Login</CardTitle>
          <CardDescription>
            Enter your passcode to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-stone-600 text-center py-8">
            Login form coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
