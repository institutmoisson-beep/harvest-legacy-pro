import { useUserCurrency } from '@/hooks/useUserCurrency';

interface Props {
  value: number; // en FCFA
  withMsn?: boolean;
  className?: string;
}

export const Price = ({ value, withMsn = false, className }: Props) => {
  const { format, formatWithMsn } = useUserCurrency();
  return <span className={className}>{withMsn ? formatWithMsn(value) : format(value)}</span>;
};

export default Price;
