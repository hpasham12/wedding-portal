import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Heart } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-stone-100 rounded-full">
              <Heart className="w-12 h-12 text-stone-700" fill="currentColor" />
            </div>
          </div>
          <CardTitle className="text-3xl font-serif">
            Welcome to Our Wedding
          </CardTitle>
          <CardDescription className="text-base">
            Join us in celebrating our special day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-stone-600">
            We're thrilled to have you here. Please sign in to access your
            personalized guest dashboard.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
            size="lg"
          >
            Continue to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
