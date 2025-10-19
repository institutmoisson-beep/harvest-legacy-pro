import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Facebook, MessageCircle, ExternalLink } from 'lucide-react';

interface ShareButtonsProps {
  referralCode: string;
}

export default function ShareButtons({ referralCode }: ShareButtonsProps) {
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
  
  const shareMessage = `Rejoignez Les Moissonneurs avec mon code de parrainage: ${referralCode}\n${referralLink}`;

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShopLink = () => {
    window.open('https://institutmoisson.net', '_blank');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-secondary" />
          Partager & Boutique
        </CardTitle>
        <CardDescription>Partagez votre lien de parrainage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleFacebookShare} className="w-full" variant="outline">
          <Facebook className="h-4 w-4 mr-2" />
          Partager sur Facebook
        </Button>
        
        <Button onClick={handleWhatsAppShare} className="w-full" variant="outline">
          <MessageCircle className="h-4 w-4 mr-2" />
          Partager sur WhatsApp
        </Button>

        <div className="pt-4 border-t border-border">
          <Button onClick={handleShopLink} className="w-full" variant="cosmic">
            <ExternalLink className="h-4 w-4 mr-2" />
            Visiter la Boutique
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}