# Plenum — Document d'exigences produit (PRD)

Version 1.0 · 27 octobre 2026 · Auteur : Claude pour SS · Statut : à jour avec `main` après l'étape 13 (l'étape 14, refonte visuelle, est en cours).

Sources : spec v1 (https://claude.ai/artifact/WATd1yFPALLumVtMGvJpFC), backlog (https://claude.ai/artifact/ECRyy95hQ61qijLAFst7vf), `docs/spec-gaps.md` et le code de `cang53/plenum`.

---

## 1. Vision

Plenum est une application web (plus un onglet Microsoft Teams) où une équipe projet industrielle voit, dans **une seule chronologie**, tous les messages Teams et emails du projet. Elle les transforme en tâches, décisions, risques et rapports avec l'aide de l'IA, et pilote le planning, les feuilles de temps et les récompenses d'équipe au même endroit.

Phrase de positionnement : *« Un seul fil de projet pour les équipes industrielles : les messages deviennent des tâches, des décisions et des rapports, et les personnes valident chaque suggestion de l'IA. »*

Trois frontières structurent tout le produit :

1. **Pas un nouveau chat.** Les messages arrivent de Teams et de l'email, les réponses repartent par ces canaux.
2. **Pas un remplaçant de P6 ou MS Project.** Les planificateurs gardent leur planning maître ; Plenum l'importe et offre une vue simple aux autres.
3. **L'IA n'agit jamais seule.** Toute modification proposée par l'IA attend un clic humain et renvoie au message source.

## 2. Utilisateurs et rôles

Quatre rôles, définis par projet (une personne peut avoir des rôles différents selon les projets).

| Rôle | Qui | Peut | Siège payant |
|---|---|---|---|
| Admin | IT ou PMO du client | Gérer l'espace de travail, la connexion, l'export de données, activer/désactiver les récompenses par site | Oui |
| Chef de projet | Pilote un ou plusieurs projets | Créer des projets, éditer le plan, approuver les suggestions IA, approuver les feuilles de temps, envoyer les rapports | Oui |
| Membre | Ingénieurs, chefs de site, spécialistes | Mettre à jour ses tâches, répondre depuis la chronologie, approuver les suggestions IA sur ses tâches, saisir ses heures | Oui |
| Contributeur | Sous-traitants, partenaires, souvent hors du tenant Microsoft du client | Mettre à jour les tâches qui lui sont assignées, répondre, saisir ses heures ; ne voit que les projets où il est invité | Non (gratuit) |

Les contributeurs se connectent par lien email, sans compte Microsoft.

**Personas de référence**
- *Chef de projet multi-sites* : noyé dans les emails et fils Teams, il veut un état fiable et un rapport hebdomadaire sans le rédiger à la main.
- *Chef de site / ingénieur* : veut savoir ce qu'il doit faire cette semaine, saisir ses heures vite, et ne pas ressaisir ce qui est déjà dans un email.
- *Sous-traitant* : veut répondre et voir ses tâches sans installer ni créer de compte.
- *Admin IT* : veut un accès limité (pas de lecture de boîtes mail entières), des exports et une piste d'audit.

## 3. Problèmes à résoudre

- Les décisions et demandes sont dispersées entre Teams, emails et pièces jointes ; l'information se perd et personne ne retrouve « qui a dit quoi, quand ».
- Le planning (P6, MS Project) est inaccessible ou illisible pour la plupart des intervenants ; le suivi quotidien vit dans des tableurs.
- Les feuilles de temps sont saisies tard, de mémoire, et approuvées à la main.
- Les outils existants imposent un nouveau canal de discussion ou un accès large aux boîtes mail, ce qui bloque l'adoption (IT, comités d'entreprise).
- L'IA est perçue comme un risque quand elle modifie des données sans contrôle.

## 4. Périmètre

### Dans le périmètre de la v1
Chronologie des messages, tâches (tableau, Gantt, liste), inspecteur de tâche, suggestions IA validées, réponses et traduction, feuilles de temps, récompenses d'équipe, import de planning, rapport hebdomadaire, journal de chantier, notifications, recherche, rôles et accès, export/suppression, audit, application hors ligne (PWA), anglais et néerlandais.

### Hors périmètre (non-objectifs)
- WhatsApp, Slack et autres canaux.
- Un chat propre à Plenum.
- Ressources : nivellement de charge, prévision des coûts. (Chemin critique et baselines : hors spec initiale mais **construits** et conservés, voir §6.)
- Réécriture du planning vers P6 ou MS Project (import seul).
- Liens directs ERP ou paie (export CSV uniquement).
- Applications mobiles natives (le web fonctionne sur téléphone ; PWA).
- Hébergement sur site ou hors UE.
- Points, scores ou classements individuels ; toute analyse par personne.

## 5. Règles de confiance (exigences, pas politique)

Chacune est construite et testée comme une fonctionnalité.

| # | Règle | Mise en œuvre |
|---|---|---|
| T1 | Ne lire que ce qui est adressé au projet | Adresse email du projet ; canaux Teams où l'app est ajoutée ; jamais de boîte entière ni de chats privés |
| T2 | Aucune analyse par personne | Récompenses et indicateurs au niveau équipe uniquement |
| T3 | Chaque changement IA exige un clic humain et un lien vers le message source | Statuts proposé / accepté / refusé ; motif affiché |
| T4 | Contrôle d'accès dans la base | Row-level security Postgres, testée |
| T5 | Hébergement UE | Supabase (UE-Ouest, Irlande), Vercel `dub1`, AWS SES et Bedrock en régions UE |
| T6 | Connexion | Microsoft Entra ID pour le personnel ; lien email pour les contributeurs |
| T7 | Export et suppression | Un admin exporte (JSON/CSV, pièces jointes incluses) et supprime un projet définitivement |
| T8 | Journal d'audit | Qui a approuvé quelle suggestion, envoyé quelle réponse, modifié quelle tâche (export CSV) |
| T9 | Les données client n'entraînent jamais de modèle | Fournisseur IA unique, listé comme sous-traitant |
| T10 | Textes d'interface en anglais simple et prêts à traduire | Aucune chaîne en dur dans les composants ; `messages.en` / `messages.nl`, vérifié par `check-strings` |

## 6. Fonctionnalités par module

L'état indiqué est celui de `main`. « Derrière un interrupteur » = construit, fonctionne en mode simulé, bascule en réel quand les comptes existent.

### 6.1 Chronologie des messages (`/app/stream`)
Fil unique, du plus récent au plus ancien, de tous les messages et changements du projet.
- **Entrée** : adresse email du projet (`projet@in.plenum.[domaine]`, via AWS SES + SNS) ; pièces jointes stockées avec le message et leur texte indexé (PDF, Word). Canaux Teams : pas encore (voir §11).
- **Actions** : transformer un message en tâche, décision, risque ou demande de changement (à la main ou en acceptant une suggestion IA) ; le nouvel élément garde le lien vers le message.
- **Répondre** par le canal d'origine avec lien vers l'élément lié ; avertissement si l'audience est plus large que l'original.
- **Traduire** dans la langue du lecteur, original à un clic.
- **Rechercher** par mot, expéditeur, date, tâche liée ; filtres sur la chronologie.
- **Critères d'acceptation** : un email en copie apparaît en moins d'1 minute ; un message devient une tâche en 2 clics ; une réponse arrive dans la boîte ou le fil Teams de l'expéditeur ; la recherche trouve par mot, expéditeur, date ou tâche.
- État : construit (`stream`, `search`, `reply`, `translate`, `inbound-email`).

### 6.2 Tableau (Board) (`/app/board`)
- Colonnes par statut : À faire, En cours, Bloqué, Terminé ; glisser-déposer ; filtres par phase, responsable, site.
- Même jeu de tâches que le Gantt : déplacer sur l'un met à jour l'autre.
- État : construit.

### 6.3 Chronologie planning / Gantt (`/app/gantt`)
- Barres par phase, déplacement et redimensionnement, dépendances fin-début en flèches, ligne « aujourd'hui », jalons.
- Construits au-delà de la spec initiale : **chemin critique** (mis en évidence, conservé volontairement) et **baselines**.
- Ressources importées avec le planning.
- État : construit.

### 6.4 Éléments / Items (`/app/items`)
- Liste unique des tâches, décisions, risques et demandes de changement, filtrable et éditable ; numéros de tâche lisibles ; création et édition avec dates, code de coût, phase, sous-tâches (un niveau), responsable, dépendances.
- Modèles de projet : démarrer un projet à partir d'un précédent.
- Import : P6 XER/XML et MS Project XML (phases, tâches, dépendances, ressources) ; au rafraîchissement le planning maître gagne sur les dates, les liens et responsables ajoutés dans Plenum sont conservés.
- Critère : un fichier de 300 tâches s'importe en moins d'1 minute, dépendances intactes.
- État : construit (import, `items`, `import/resources`).

### 6.5 Inspecteur de tâche (`/app/tasks/[id]`)
- Panneau/fiche : titre, responsable, dates, statut, priorité, code de coût, phase, sous-tâches, dépendances, messages et décisions liés, historique.
- Raccourcis clavier et ouverture en volet depuis le Gantt, le tableau et la liste.
- État : construit.

### 6.6 Suggestions IA
Cinq tâches étroites ; chacune se termine par une suggestion que la personne accepte, modifie ou refuse.

| Agent | Entrée | Sortie à valider | Qui valide | État |
|---|---|---|---|---|
| Tri des messages | Chaque nouveau message | Tâche/décision/risque/demande préremplie, liée au message | Responsable de la tâche ou chef de projet | Construit |
| Rapport hebdomadaire | Chronologie, changements, risques, journaux de chantier | Brouillon à gabarit fixe, chaque affirmation sourcée | Chef de projet, puis envoi email/Teams | Construit |
| Brouillon de réponse | Message + éléments liés | Réponse dans la langue de l'expéditeur | La personne qui répond | Construit |
| Traduction | Tout message | Texte traduit, original à un clic | Aucun (affichage) | Construit |
| Brouillon de feuille de temps | Activité de la semaine | Feuille préremplie avec liens sources | La personne, puis le chef de projet | Construit |

Règles : rien n'est créé, modifié ou envoyé sans clic ; chaque suggestion affiche son motif et le message source ; les refus sont journalisés (comptes acceptés/refusés par projet) ; suggestions reportables (« snooze ») ; plafond d'appels par espace de travail et par jour, avec repli sur des règles hors modèle.
Qualité : jeu de 50 messages (`npm run ai:eval`), exécuté en CI sur les PR touchant le code IA.
Fournisseur : AWS Bedrock (modèle UE). Derrière l'interrupteur `AI_PROVIDER`.

### 6.7 Feuilles de temps (`/app/timesheet`, `/app/timesheets`)
- Grille hebdomadaire (tâches × jours), notes facultatives ; contributeurs inclus.
- Brouillon IA le vendredi ; la personne édite et soumet, rien n'est soumis à sa place.
- Approbation ou retour avec commentaire par le chef de projet ; semaine approuvée verrouillée.
- Export CSV par projet, personne, code de coût, semaine.
- Critères : semaine typique en moins de 2 minutes si le brouillon est juste ; approbation d'une équipe sur un seul écran ; CSV propre dans Excel.
- État : construit.

### 6.8 Récompenses d'équipe
Niveau équipe uniquement, calculées depuis des événements déjà enregistrés, masquées si désactivées pour le site.

| Récompense | Gagnée quand |
|---|---|
| Série (streak) | Aucune tâche en retard sans mise à jour, semaine après semaine |
| Alerte précoce | Un risque est signalé au moins 2 semaines avant son échéance |
| Savoir | Une décision ou leçon est rédigée et liée à sa source |
| Jalon | Un jalon est atteint à temps (bannière, confettis, post Teams) |
| Défi d'équipe | Objectif mensuel fixé par le chef de projet |

Règles : pas de points, scores ni classements individuels ; rien basé sur la ponctualité d'une personne ; interrupteur admin par site ; jamais d'effet sur la paie ou l'évaluation. Historique des récompenses disponible.
État : construit. Le post Teams réel attend le compte (`TEAMS_PROVIDER` simulé).

### 6.9 Intégrations
| Intégration | Usage | État |
|---|---|---|
| AWS SES (entrant) + SNS | Réception des emails du projet | Construit, interrupteur |
| AWS SES (sortant) | Réponses, digests, rapports | Construit, `EMAIL_PROVIDER` (simulé par défaut) |
| AWS Bedrock | IA (UE) | Construit, `AI_PROVIDER` |
| Microsoft Entra ID | SSO du personnel | Construit via Auth.js, en attente de comptes |
| Microsoft Teams | Lecture de canaux + posts de célébration | Poster simulé construit ; lecture de canaux et post réel : à faire (approbation admin) |
| P6 / MS Project | Import seul | Construit |
| Supabase | Base Postgres, stockage, RLS | En production |
| Vercel | Hébergement `dub1` | Configuré |
| ERP / paie | Export CSV | CSV uniquement |

### 6.10 Rôles, accès et administration
- Rôles par projet (`/app/members`, `/app/roles`) ; admin comme rôle à part (S11-7).
- Accès filtré par RLS ; contributeurs limités aux projets invités.
- Journal d'audit (`/app/audit`, export CSV) ; confidentialité, export et suppression (`/app/privacy`, `/app/export`) ; paramètres (`/app/settings`).
- État : construit.

### 6.11 Autres modules
- **Aperçu** (`/app`) : synthèse du projet.
- **Journal de chantier** (`/app/sitelog`) : saisie, soumission, alimente le rapport hebdomadaire.
- **Notifications** : cloche, boîte de réception, digests email.
- **Rapports** (`/app/reports`) : rapport hebdomadaire avec risques et journaux.
- **Palette de commandes et raccourcis clavier**, recherche globale.
- **Hors ligne** : PWA avec file d'attente chiffrée des modifications de tâches.
- **Langues** : interface en anglais et néerlandais (le texte d'origine est conservé, l'IA traduit les messages).
- **Accessibilité** : passe AA (contraste ≥ 4,5:1), tests axe en e2e.
- **Refonte visuelle (étape 14)** : design plat « slate et cobalt », IBM Plex Sans, thème clair/sombre, remplace la piste « Liquid Glass ».

## 7. Exigences non fonctionnelles

- **Sécurité** : RLS sur chaque table avec tests ; aucun secret dans le dépôt ; en-têtes de sécurité et CSP ; limitation de débit ; sauvegarde et exercice de restauration planifiés (`restore-drill`).
- **Performance** : budgets de taille suivis en CI (`check-budget`) ; navigation rapide sur les listes de 300+ tâches.
- **Fiabilité** : `/api/health`, collecte d'erreurs (`/api/errors`), tâches planifiées (`/api/jobs`), runbook d'exploitation.
- **Qualité** : une PR par ligne de backlog, environ 400 lignes ou moins ; lint, tests unitaires (Vitest) et e2e (Playwright) verts ; tests pour toute nouvelle logique.
- **Internationalisation** : EN/NL, aucune chaîne en dur.
- **Conformité** : DPA, liste des sous-traitants et dossier d'information pour le comité d'entreprise avant le premier pilote.

## 8. Indicateurs de succès

Mesurés au niveau projet ou équipe, jamais par personne.

| Indicateur | Cible v1 (pilote) |
|---|---|
| Délai email → chronologie | < 1 min |
| Message → tâche | ≤ 2 clics |
| Taux d'acceptation des suggestions IA | ≥ 60 % par projet (et suivi du taux de refus) |
| Précision du jeu de test IA (50 messages) | Seuil à fixer (voir §10), suivi à chaque PR IA |
| Saisie d'une semaine de temps (brouillon juste) | < 2 min |
| Feuilles de temps soumises à l'heure | ≥ 90 % des équipes pilotes |
| Import de 300 tâches | < 1 min |
| Équipes pilotes actives chaque semaine | ≥ 70 % des membres invités |
| Rapports hebdomadaires envoyés depuis Plenum | ≥ 1 par semaine et par projet |
| Incidents de confiance (accès hors périmètre, action IA sans clic) | 0 |

## 9. Jalons et état d'avancement

- Étapes 1 à 13 : fondations, email entrant, tâches/tableau, Gantt, feuilles de temps, récompenses, import, hors ligne, accessibilité, chaînes : **terminées** sur `main` (voir `docs/stage*-backlog.md` et `docs/spec-gaps.md`).
- Étape 14 : refonte visuelle (`docs/stage14-backlog.md`) : en cours.
- Bloqué par des comptes : Entra ID, SES, Bedrock en réel ; lecture de canaux Teams et post réel.
- Prochaine grande étape : pilote avec un premier client (`docs/pilot-onboarding.md`, `docs/pilot-day.md`).

## 10. Questions ouvertes

1. **Nom du produit** : « Plenum » est-il définitif ? Le domaine email du projet et la fiche de l'app Teams en dépendent.
2. **Fournisseur IA** : Bedrock est utilisé ; confirmer le modèle précis, le coût par projet et la liste des sous-traitants.
3. **Seuil de précision IA** acceptable avant d'ouvrir à un pilote (aujourd'hui seulement mesuré).
4. **Premier pilote** : sans entretiens clients, comment le trouver ? (Anciens collègues chez Toyota, Engie, Umicore, Orange, selon le brief.)
5. **Teams** : calendrier de l'approbation admin du client pour la lecture de canaux, et alternative si elle est refusée (email seul).
6. **Prix** : sièges payants (admin, chef de projet, membre) et contributeurs gratuits : tarif et limites à définir.
7. **Chemin critique et baselines** : conservés alors que la spec les excluait ; à confirmer en v1 officielle ou à présenter comme « bêta ».
8. **Langues** : néerlandais livré en plus de l'anglais ; le français et l'allemand sont-ils attendus pour le pilote ?
9. **Rétention** des messages et pièces jointes par défaut (durée, après clôture d'un projet).
10. **Écriture vers P6** : à ouvrir seulement si un pilote le demande.

## 11. Risques

| Risque | Atténuation |
|---|---|
| Approbation admin Teams lente ou refusée | L'email entrant suffit pour le pilote ; Teams après |
| Suggestions IA trop souvent fausses | Suivi du taux de refus par projet, jeu de test en CI, repli par règles |
| Perception de surveillance | Aucune analyse individuelle, récompenses d'équipe désactivables par site |
| Dépendance à des comptes (Entra, SES, Bedrock) | Interrupteurs et modes simulés, guide `docs/account-ready.md` |
| Dérive du périmètre vers un remplaçant de P6 | Import seul, aucune écriture retour |
