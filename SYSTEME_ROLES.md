# Système de Rôles Hiérarchisés - Les Moissonneurs

## Vue d'ensemble

Le système de rôles des Moissonneurs est conçu avec une hiérarchie stricte de niveaux d'accès. Chaque rôle dispose de permissions spécifiques et d'un niveau d'accès numérique qui détermine ce que l'utilisateur peut voir et faire dans l'application.

## Hiérarchie des Rôles

### 1. Super Administrateur (Niveau 100)
**Rôle**: `super_admin`
- **Accès**: Complet et illimité
- **Permissions**:
  - Gestion complète de tous les modules
  - Attribution et révocation de tous les rôles
  - Accès à toutes les données sensibles
  - Paramétrage système avancé
  - Supervision de tous les administrateurs

### 2. Administrateur Opérationnel (Niveau 90)
**Rôles**: `operational_admin`, `admin`
- **Accès**: Élevé sur les opérations quotidiennes
- **Permissions**:
  - Supervision des utilisateurs (vendeurs, relais, clients)
  - Validation des inscriptions et boutiques
  - Modification des contenus (produits/services)
  - Suivi des commandes
  - Gestion des membres
  - Validation des transactions

### 3. Manager Financier (Niveau 80)
**Rôles**: `financial_manager`, `financier`
- **Accès**: Modules financiers
- **Permissions**:
  - Supervision des retraits et paiements
  - Gestion des commissions
  - Génération de rapports financiers
  - Validation des opérations comptables
  - Accès au trésor et aux fonds
  - Gestion des codes promo

### 4. Manager Tontine/MLM (Niveau 75)
**Rôle**: `tontine_manager`
- **Accès**: Section Tontine & Parrainage
- **Permissions**:
  - Gestion des participants aux tontines
  - Administration des tirages
  - Gestion des retraits de tontine
  - Administration des plans de carrière
  - Gestion des bonus et commissions MLM
  - Suivi des réseaux de parrainage

### 5. Modérateur (Niveau 70)
**Rôle**: `moderator`
- **Accès**: Modération de contenu
- **Permissions**:
  - Modération des produits et boutiques
  - Gestion des signalements
  - Validation du contenu utilisateur
  - Support client avancé

### 6. Responsable Boutique (Niveau 60)
**Rôles**: `shop_manager`, `merchant`
- **Accès**: Boutique personnelle
- **Permissions**:
  - Ajout/modification de produits
  - Consultation des clients et commandes
  - Gestion des commissions personnelles
  - Accès aux statistiques de boutique
  - Configuration de la boutique

### 7. Agent Relais (Niveau 50)
**Rôles**: `relay_agent`, `agent`
- **Accès**: Point de commande
- **Permissions**:
  - Saisie des commandes clients
  - Transmission au système
  - Suivi des livraisons
  - Consultation des gains
  - Gestion des transactions membres
  - Accès au tableau de bord agent

### 8. Moissonneur (Niveau 30)
**Rôles**: `moissonneur`, `user`
- **Accès**: Utilisateur standard
- **Permissions**:
  - Passer des commandes
  - Parrainer d'autres utilisateurs
  - Gérer son portefeuille
  - Participer aux tontines
  - Accès à la boutique personnelle (si activée)
  - Consultation du réseau de parrainage

### 9. Développeur Technique (Niveau 10)
**Rôle**: `developer`
- **Accès**: Technique uniquement
- **Permissions**:
  - Accès aux API
  - Consultation des logs système
  - Accès au code et configuration technique
  - **Aucune** action commerciale ou utilisateur

## Attribution Automatique

### Inscription
Lors de l'inscription, chaque nouvel utilisateur reçoit automatiquement le rôle **Moissonneur** (niveau 30). Ce rôle est attribué par le trigger `on_auth_user_created_role` dans la base de données.

### Progression
Les utilisateurs peuvent recevoir des rôles supplémentaires par :
1. Promotion par un administrateur
2. Atteinte d'objectifs spécifiques
3. Attribution manuelle via l'interface de gestion des rôles

## Gestion des Rôles

### Interface Admin
Les administrateurs avec un niveau d'accès suffisant (≥90) peuvent :
- Voir tous les utilisateurs et leurs rôles
- Attribuer de nouveaux rôles
- Retirer des rôles existants
- Filtrer et rechercher des utilisateurs
- Visualiser les niveaux d'accès

### Fonctions de Sécurité

#### Vérification de Rôle
```typescript
has_role(_user_id uuid, _role app_role) -> boolean
```
Vérifie si un utilisateur possède un rôle spécifique.

#### Vérification de Niveau
```typescript
has_access_level(_user_id uuid, _required_level integer) -> boolean
```
Vérifie si un utilisateur a un niveau d'accès suffisant.

#### Niveau d'Accès par Rôle
```typescript
get_role_access_level(role_name app_role) -> integer
```
Retourne le niveau d'accès numérique d'un rôle.

## Protection des Accès

### Row Level Security (RLS)
Chaque table est protégée par des politiques RLS qui utilisent les fonctions de vérification de rôle :

```sql
-- Exemple : Seuls les admins peuvent voir toutes les commandes
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (has_access_level(auth.uid(), 90));
```

### Middleware Frontend
Les routes et composants sont protégés côté client en vérifiant les rôles :

```typescript
// Vérification du niveau d'accès
const { data: roles } = await supabase
  .from('user_roles')
  .select('access_level')
  .eq('user_id', user.id);

const maxLevel = Math.max(...roles.map(r => r.access_level));
if (maxLevel < 90) {
  navigate('/dashboard');
}
```

## Vue des Utilisateurs avec Rôles

Une vue SQL facilite la consultation des utilisateurs et leurs rôles :

```sql
SELECT * FROM users_with_roles;
```

Cette vue retourne :
- Informations de profil
- Liste des rôles (JSON)
- Niveau d'accès maximum

## Bonnes Pratiques

1. **Principe du moindre privilège** : N'attribuer que les permissions nécessaires
2. **Séparation des responsabilités** : Un utilisateur peut avoir plusieurs rôles complémentaires
3. **Audit régulier** : Vérifier périodiquement les attributions de rôles
4. **Formation** : S'assurer que les utilisateurs comprennent leurs permissions
5. **Documentation** : Maintenir à jour la liste des rôles et permissions

## Évolutions Futures

- Rôles temporaires avec expiration
- Logs d'audit des changements de rôles
- Notifications lors de changement de rôle
- Workflow d'approbation pour promotions
- Rôles personnalisés par organisation
