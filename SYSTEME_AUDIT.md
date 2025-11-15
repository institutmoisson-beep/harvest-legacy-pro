# Système de Logs d'Audit - Les Moissonneurs

## Vue d'ensemble

Le système de logs d'audit fournit une **traçabilité complète** de toutes les modifications critiques effectuées sur la plateforme, notamment les changements de permissions, rôles, et accès utilisateur.

## Architecture

### Table `audit_logs`

Stocke tous les événements d'audit avec les informations suivantes :

```sql
- id: Identifiant unique
- user_id: UUID de l'utilisateur qui a effectué l'action
- user_email: Email de l'utilisateur
- action: Type d'action (INSERT, UPDATE, DELETE)
- table_name: Table concernée
- record_id: ID de l'enregistrement modifié
- old_data: Données avant modification (JSONB)
- new_data: Données après modification (JSONB)
- ip_address: Adresse IP de l'utilisateur
- user_agent: Informations sur le navigateur
- created_at: Horodatage de l'action
```

### Tables Auditées Automatiquement

Les triggers PostgreSQL capturent automatiquement les modifications sur :

1. **`role_permissions`** - Permissions assignées aux rôles
2. **`user_roles`** - Rôles assignés aux utilisateurs  
3. **`permissions`** - Définitions des permissions

## Fonctions SQL

### 1. `log_audit_change()` (Automatique)

Fonction trigger qui capture automatiquement les changements :

```sql
CREATE TRIGGER audit_role_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_change();
```

**Capture automatiquement** :
- L'utilisateur qui fait la modification
- Le type d'action (INSERT/UPDATE/DELETE)
- Les anciennes et nouvelles valeurs
- L'horodatage précis

### 2. `log_manual_audit()` (Manuel avec IP)

Pour enregistrer manuellement des événements avec IP et user agent :

```sql
SELECT log_manual_audit(
  'PERMISSION_CHANGE',
  'user_roles',
  user_id::text,
  old_data := '{"role": "user"}',
  new_data := '{"role": "admin"}',
  ip_address := '192.168.1.1',
  user_agent := 'Mozilla/5.0...'
);
```

## Interface de Visualisation

### Composant `AuditLogsViewer`

Interface admin complète avec :

#### Filtres disponibles
- **Recherche textuelle** : Par email, IP, ou ID d'enregistrement
- **Filtre par action** : INSERT, UPDATE, DELETE
- **Filtre par table** : Permissions, Rôles, etc.

#### Statistiques en temps réel
- Nombre total d'événements
- Répartition par type d'action
- Visualisation graphique

#### Affichage détaillé
Pour chaque log :
- 🔵 Badge coloré selon l'action
- 👤 Email de l'utilisateur
- 📅 Date et heure précises
- 🌐 Adresse IP
- 🖥️ User Agent (navigateur)
- 📝 Résumé des modifications
- 🔍 Détails techniques dépliables

#### Temps réel
Le composant s'abonne aux changements via Realtime Supabase et se met à jour automatiquement.

## Politiques de Sécurité (RLS)

```sql
-- Seuls les super admins peuvent consulter les logs
CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Le système peut toujours insérer des logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

## Cas d'Usage

### 1. Enquête de Sécurité
Rechercher toutes les actions d'un utilisateur spécifique sur une période donnée.

### 2. Conformité Légale
Fournir un historique complet des modifications pour les audits réglementaires.

### 3. Détection d'Anomalies
Identifier des patterns suspects (ex: modifications massives, accès depuis IP inhabituelles).

### 4. Résolution de Conflits
Comprendre qui a modifié quoi et pourquoi en cas de litige.

## Intégration dans le Code

### Depuis React (Frontend)

```typescript
import { supabase } from '@/integrations/supabase/client';

// Les logs sont créés automatiquement par les triggers
// Mais vous pouvez ajouter des logs manuels :

const logAction = async (action: string, details: any) => {
  await supabase.rpc('log_manual_audit', {
    p_action: action,
    p_table_name: 'custom_action',
    p_record_id: details.id,
    p_new_data: details,
    p_ip_address: await getUserIP(), // Fonction custom
    p_user_agent: navigator.userAgent
  });
};
```

### Depuis Edge Functions (Backend)

```typescript
// Dans une edge function
const { data, error } = await supabaseClient
  .rpc('log_manual_audit', {
    p_action: 'BULK_PERMISSION_UPDATE',
    p_table_name: 'role_permissions',
    p_record_id: roleId,
    p_new_data: { count: updatedCount },
    p_ip_address: request.headers.get('x-forwarded-for'),
    p_user_agent: request.headers.get('user-agent')
  });
```

## Accès à l'Interface

1. Se connecter en tant que **Super Admin**
2. Aller dans **Admin Dashboard**
3. Cliquer sur l'onglet **"Audit Logs"**
4. Utiliser les filtres pour affiner la recherche

## Performance

- **Indexation optimisée** sur `user_id`, `table_name`, `created_at`, `action`
- Limite de 500 logs récents chargés par défaut
- Requêtes filtrées côté base de données
- Mise à jour temps réel uniquement sur les changements

## Rétention des Données

Par défaut, tous les logs sont conservés indéfiniment.

Pour nettoyer les anciens logs (optionnel) :

```sql
-- Supprimer les logs de plus de 2 ans
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '2 years';
```

## Évolutions Futures Suggérées

1. **Export CSV/PDF** des logs
2. **Alertes email** sur actions critiques
3. **Dashboard analytique** avec graphiques temporels
4. **Comparaison visuelle** avant/après pour les UPDATE
5. **Archivage automatique** des logs anciens
6. **API REST** pour intégrations externes

## Conformité et Bonnes Pratiques

✅ **RGPD** : Les logs contiennent des données personnelles (emails, IP) - prévoir consentement  
✅ **Immuabilité** : Les logs ne peuvent pas être modifiés ou supprimés (sauf admin)  
✅ **Horodatage précis** : Timezone UTC pour cohérence internationale  
✅ **Traçabilité complète** : Qui, Quoi, Quand, Où, Comment

---

**Note importante** : Les logs d'audit sont critiques pour la sécurité. Ne jamais désactiver les triggers sans raison valable.
