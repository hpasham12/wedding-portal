import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Guest Dashboard</CardTitle>
            <CardDescription>
              Welcome to your personalized wedding dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-stone-600 text-center py-8">
              Dashboard content coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
