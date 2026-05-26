import { Button } from '@/components/ui/button';
import { FileText, ShieldCheck, Truck } from 'lucide-react';
import { generateReceipt } from '@/lib/documents/receipt';
import { generateWarrantyContract } from '@/lib/documents/warrantyContract';
import { generateDeliveryContract } from '@/lib/documents/deliveryContract';
import type { DocBuyer, DocPack, DocPurchase, DocRelay } from '@/lib/documents/types';

interface Props {
  purchase: DocPurchase;
  buyer: DocBuyer;
  pack: DocPack;
  relay?: DocRelay | null;
  size?: 'sm' | 'default';
}

export default function PackDocumentsActions({ purchase, buyer, pack, relay, size = 'default' }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Button variant="outline" size={size} onClick={() => generateReceipt(purchase, buyer, pack)}>
        <FileText className="w-4 h-4 mr-2" /> Reçu
      </Button>
      <Button variant="outline" size={size} onClick={() => generateWarrantyContract(purchase, buyer, pack)}>
        <ShieldCheck className="w-4 h-4 mr-2" /> Garantie
      </Button>
      <Button variant="outline" size={size} onClick={() => generateDeliveryContract(purchase, buyer, pack, relay)}>
        <Truck className="w-4 h-4 mr-2" /> Livraison
      </Button>
    </div>
  );
}
