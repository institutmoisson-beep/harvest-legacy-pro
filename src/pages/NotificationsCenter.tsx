import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Check, Trash2, ArrowLeft, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function NotificationsCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState({
    tontine: true,
    investment: true,
    payment: true,
    commission: true,
    promo: true,
    general: true,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchNotifications();
    loadPreferences();

    // Real-time subscription
    const channel = supabase
      .channel('user-notifications-center')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchNotifications = async () => {
    const { data } = await (supabase.from as any)('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  const loadPreferences = () => {
    const saved = localStorage.getItem(`notif-prefs-${user?.id}`);
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  };

  const savePreferences = (newPrefs: any) => {
    setPreferences(newPrefs);
    localStorage.setItem(`notif-prefs-${user?.id}`, JSON.stringify(newPrefs));
    toast({ title: 'Préférences sauvegardées' });
  };

  const markAsRead = async (id: string) => {
    const { error } = await (supabase.from as any)('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) fetchNotifications();
  };

  const markAllAsRead = async () => {
    const { error } = await (supabase.from as any)('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Toutes les notifications marquées comme lues' });
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await (supabase.from as any)('notifications')
      .delete()
      .eq('id', id);

    if (!error) fetchNotifications();
  };

  const deleteAll = async () => {
    const { error } = await (supabase.from as any)('notifications')
      .delete()
      .eq('user_id', user?.id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Toutes les notifications supprimées' });
      fetchNotifications();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tontine': return 'bg-blue-500';
      case 'investment': return 'bg-green-500';
      case 'payment': return 'bg-yellow-500';
      case 'commission': return 'bg-purple-500';
      case 'promo': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const filterByType = (type: string | null) => {
    if (!type) return notifications;
    return notifications.filter(n => n.type === type);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold gradient-text-cosmic flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Centre de Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </h1>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={markAllAsRead}>
                <Check className="w-4 h-4 mr-2" />
                Tout marquer lu
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={deleteAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Tout supprimer
            </Button>
          </div>
        </header>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">Toutes ({notifications.length})</TabsTrigger>
            <TabsTrigger value="tontine">Tontines</TabsTrigger>
            <TabsTrigger value="investment">Investissements</TabsTrigger>
            <TabsTrigger value="payment">Paiements</TabsTrigger>
            <TabsTrigger value="commission">Commissions</TabsTrigger>
            <TabsTrigger value="promo">Promos</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {['all', 'tontine', 'investment', 'payment', 'commission', 'promo'].map(type => (
            <TabsContent key={type} value={type}>
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {filterByType(type === 'all' ? null : type).length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucune notification</p>
                      ) : (
                        filterByType(type === 'all' ? null : type).map((notif) => (
                          <Card 
                            key={notif.id} 
                            className={`p-4 border-l-4 ${notif.is_read ? 'opacity-60' : ''}`}
                            style={{ borderLeftColor: getTypeColor(notif.type) }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getTypeColor(notif.type)}>
                                    {notif.type}
                                  </Badge>
                                  {!notif.is_read && <Badge variant="destructive">Nouveau</Badge>}
                                </div>
                                <h4 className="font-semibold">{notif.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(notif.created_at).toLocaleString('fr-FR')}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {!notif.is_read && (
                                  <Button size="sm" variant="ghost" onClick={() => markAsRead(notif.id)}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => deleteNotification(notif.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Préférences de notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tontine">Notifications Tontines</Label>
                  <Switch
                    id="tontine"
                    checked={preferences.tontine}
                    onCheckedChange={(checked) => savePreferences({ ...preferences, tontine: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="investment">Notifications Investissements</Label>
                  <Switch
                    id="investment"
                    checked={preferences.investment}
                    onCheckedChange={(checked) => savePreferences({ ...preferences, investment: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="payment">Notifications Paiements</Label>
                  <Switch
                    id="payment"
                    checked={preferences.payment}
                    onCheckedChange={(checked) => savePreferences({ ...preferences, payment: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="commission">Notifications Commissions</Label>
                  <Switch
                    id="commission"
                    checked={preferences.commission}
                    onCheckedChange={(checked) => savePreferences({ ...preferences, commission: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="promo">Notifications Promotions</Label>
                  <Switch
                    id="promo"
                    checked={preferences.promo}
                    onCheckedChange={(checked) => savePreferences({ ...preferences, promo: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="general">Notifications Générales</Label>
                  <Switch
                    id="general"
                    checked={preferences.general}
                    onCheckedChange={(checked) => savePreferences({ ...preferences, general: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
