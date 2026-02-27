import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, ShoppingCart, AlertCircle, HelpCircle, Video } from 'lucide-react';
import VoiceCall from '@/components/VoiceCall';

const CALL_CENTER_NUMBERS = [
  { code: 'MSN6161', label: 'Commandes & Services', icon: ShoppingCart, description: 'Pour passer des commandes et demander des services' },
  { code: 'MSN9191', label: 'Réclamations & Support', icon: AlertCircle, description: 'Pour les réclamations et l\'assistance technique' },
];

export default function CallCenterSection() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Centre d'Appel & Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Call Center Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CALL_CENTER_NUMBERS.map((num) => (
            <button
              key={num.code}
              onClick={() => setSelectedCode(num.code)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedCode === num.code
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <num.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{num.code}</p>
                  <p className="text-sm text-muted-foreground">{num.label}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{num.description}</p>
            </button>
          ))}
        </div>

        {/* Appel entre membres */}
        <div className="pt-2 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Appeler un autre Moissonneur
          </p>
          <VoiceCall prefilledCode={selectedCode || undefined} />
        </div>
      </CardContent>
    </Card>
  );
}
