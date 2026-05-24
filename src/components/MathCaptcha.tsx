import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export interface MathCaptchaHandle {
  validate: () => boolean;
  reset: () => void;
}

interface Props {
  onValidChange?: (valid: boolean) => void;
}

const gen = () => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer = 0;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else answer = a * b;
  return { a, b, op, answer };
};

export const MathCaptcha = forwardRef<MathCaptchaHandle, Props>(({ onValidChange }, ref) => {
  const [q, setQ] = useState(gen());
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const valid = parseInt(value, 10) === q.answer;
    onValidChange?.(valid);
    if (valid) setError('');
  }, [value, q]);

  useImperativeHandle(ref, () => ({
    validate: () => {
      const ok = parseInt(value, 10) === q.answer;
      if (!ok) {
        setError('Réponse incorrecte. Essayez à nouveau.');
        setQ(gen());
        setValue('');
      }
      return ok;
    },
    reset: () => {
      setQ(gen());
      setValue('');
      setError('');
    },
  }));

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <Label className="flex items-center gap-2 text-sm">
        <ShieldCheck className="w-4 h-4 text-primary" />
        Vérification anti-robot
      </Label>
      <div className="flex items-center gap-2">
        <div className="font-mono text-lg font-bold px-3 py-2 rounded bg-background border min-w-[110px] text-center">
          {q.a} {q.op} {q.b} = ?
        </div>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Réponse"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1"
          autoComplete="off"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => { setQ(gen()); setValue(''); setError(''); }}
          title="Changer le calcul"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
});

MathCaptcha.displayName = 'MathCaptcha';
