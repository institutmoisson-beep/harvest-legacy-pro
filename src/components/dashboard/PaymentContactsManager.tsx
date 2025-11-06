import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Phone, Trash2, Plus } from 'lucide-react';

const PAYMENT_METHODS = [
  'Orange Money',
  'MTN Money',
  'Wave',
  'Push CI',
  'Moov Money'
];

export default function PaymentContactsManager() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [newMethod, setNewMethod] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from('payment_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setContacts(data);
  };

  const handleAddContact = async () => {
    if (!newMethod || !newContact) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('payment_contacts')
        .insert({
          payment_method: newMethod,
          contact_number: newContact,
          contact_name: newName || null,
          is_active: true
        });

      if (error) throw error;

      toast({ title: 'Succès', description: 'Contact ajouté avec succès' });
      setNewMethod('');
      setNewContact('');
      setNewName('');
      fetchContacts();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('payment_contacts')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      fetchContacts();
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Supprimer ce contact?')) return;

    const { error } = await supabase
      .from('payment_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Contact supprimé' });
      fetchContacts();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Gestion des contacts de paiement
        </CardTitle>
        <CardDescription>
          Gérez les numéros affichés aux utilisateurs pour les dépôts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Contact Form */}
        <div className="p-4 border rounded-lg space-y-4 bg-accent/5">
          <h3 className="font-semibold text-sm">Ajouter un nouveau contact</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Moyen de paiement</Label>
              <Select value={newMethod} onValueChange={setNewMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Numéro / Lien</Label>
              <Input
                placeholder="0507348685 ou lien Wave"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
              />
            </div>
            <div>
              <Label>Nom (optionnel)</Label>
              <Input
                placeholder="Nom du compte"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAddContact} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Contacts List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Contacts actifs</h3>
          {contacts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucun contact configuré
            </p>
          ) : (
            <div className="space-y-2">
              {contacts.map(contact => (
                <div
                  key={contact.id}
                  className={`p-4 border rounded-lg flex items-center justify-between ${
                    !contact.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold">{contact.payment_method}</p>
                    <p className="text-sm text-muted-foreground">{contact.contact_number}</p>
                    {contact.contact_name && (
                      <p className="text-xs text-muted-foreground">{contact.contact_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={contact.is_active ? 'outline' : 'default'}
                      onClick={() => handleToggleActive(contact.id, contact.is_active)}
                    >
                      {contact.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}