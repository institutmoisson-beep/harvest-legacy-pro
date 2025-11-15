import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Chargement...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full animate-pulse" />
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto relative" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">{message}</h2>
          <p className="text-sm text-muted-foreground animate-pulse">
            Optimisation des données en cours...
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
