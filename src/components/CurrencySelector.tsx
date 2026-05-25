import { useUserCurrency } from '@/hooks/useUserCurrency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins } from 'lucide-react';

export default function CurrencySelector({ compact = false }: { compact?: boolean }) {
  const { rates, current, setCurrency } = useUserCurrency();

  return (
    <div className="flex items-center gap-2">
      {!compact && <Coins className="w-4 h-4 text-muted-foreground" />}
      <Select value={current?.code || 'XOF'} onValueChange={setCurrency}>
        <SelectTrigger className={compact ? 'h-8 w-[110px] text-xs' : 'w-[200px]'}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {rates.map(r => (
            <SelectItem key={r.code} value={r.code}>
              {r.symbol} — {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
