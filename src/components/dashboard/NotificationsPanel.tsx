import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Check, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NotificationsPanelProps {
  userId: string;
}

export default function NotificationsPanel({ userId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erreur notifications:', error);
        const errorMessage = error?.message || JSON.stringify(error) || 'Une erreur inconnue est survenue';
        console.error('Message d\'erreur complet:', errorMessage);
        toast({
          title: 'Erreur',
          description: `Erreur lors de la récupération des notifications: ${errorMessage}`,
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des notifications:', error);
      const errorMessage = error?.message || JSON.stringify(error) || 'Une erreur est survenue';
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error) || 'Une erreur est survenue';
      toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      toast({ title: 'Succès', description: 'Toutes les notifications marquées comme lues' });
      fetchNotifications();
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error) || 'Une erreur est survenue';
      toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error) || 'Une erreur est survenue';
      toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Tout marquer lu
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune notification</p>
            ) : (
              notifications.map((notif) => (
                <Card 
                  key={notif.id} 
                  className={`${!notif.is_read ? 'border-primary' : 'opacity-75'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getTypeColor(notif.type)}`} />
                      <div className="flex-1">
                        <h4 className="font-semibold">{notif.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notif.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notif.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notif.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notif.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
