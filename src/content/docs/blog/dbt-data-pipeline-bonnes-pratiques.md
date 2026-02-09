---
title: "dbt : structurer ses pipelines de données avec les bonnes pratiques"
date: 2025-02-01
authors:
  - brice
tags:
  - data
  - dbt
  - backend
excerpt: "dbt (data build tool) a révolutionné la façon dont on transforme les données dans le data warehouse. Voici comment structurer vos projets dbt pour qu'ils restent maintenables à l'échelle."
cover:
  image: ../../../assets/covers/data.svg
  alt: "Data Engineering"
---

**dbt** (data build tool) s'est imposé comme l'outil standard pour la transformation de données dans le modern data stack. Mais comme tout outil puissant, une mauvaise utilisation peut vite mener à un projet inmaintenable. Voyons les bonnes pratiques pour structurer un projet dbt proprement.

## La structure de répertoires recommandée

Un projet dbt bien organisé suit une structure en couches qui reflète le flux de transformation des données :

```
models/
├── staging/          # Couche d'entrée : 1 modèle = 1 source
│   ├── stripe/
│   │   ├── _stripe__models.yml
│   │   ├── _stripe__sources.yml
│   │   ├── stg_stripe__payments.sql
│   │   └── stg_stripe__customers.sql
│   └── postgres/
│       ├── _postgres__models.yml
│       ├── _postgres__sources.yml
│       └── stg_postgres__orders.sql
├── intermediate/     # Transformations intermédiaires
│   └── int_orders_payments_joined.sql
└── marts/            # Modèles métier finaux
    ├── finance/
    │   └── fct_revenue.sql
    └── marketing/
        └── dim_customers.sql
```

### Les principes clés :

1. **Staging** : un modèle par source, renommage des colonnes, casting des types. Jamais de logique métier.
2. **Intermediate** : jointures et agrégations intermédiaires. Matérialisés en `ephemeral` par défaut.
3. **Marts** : les tables finales consommées par les outils BI ou les data analysts.

## Conventions de nommage

La cohérence du nommage est ce qui fait la différence entre un projet lisible et un projet chaotique :

| Couche | Préfixe | Exemple |
|--------|---------|---------|
| Staging | `stg_` | `stg_stripe__payments` |
| Intermediate | `int_` | `int_orders_payments_joined` |
| Fact tables | `fct_` | `fct_revenue` |
| Dimension tables | `dim_` | `dim_customers` |

Le double underscore `__` sépare la source du nom de la table. C'est une convention de la communauté dbt qui améliore la lisibilité.

## Les tests : votre filet de sécurité

dbt offre deux types de tests qu'il faut utiliser systématiquement :

### Tests génériques (dans les fichiers YAML)

```yaml
# _stripe__models.yml
models:
  - name: stg_stripe__payments
    columns:
      - name: payment_id
        tests:
          - unique
          - not_null
      - name: amount
        tests:
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: ['success', 'failed', 'pending']
```

### Tests singuliers (fichiers SQL)

```sql
-- tests/assert_positive_revenue.sql
SELECT *
FROM {{ ref('fct_revenue') }}
WHERE total_revenue < 0
```

Si cette requête retourne des lignes, le test échoue.

## Matérialisation : choisir la bonne stratégie

```yaml
# dbt_project.yml
models:
  my_project:
    staging:
      +materialized: view       # Léger, toujours frais
    intermediate:
      +materialized: ephemeral  # Pas de table créée, juste un CTE
    marts:
      +materialized: table      # Performance pour les consommateurs
      finance:
        +materialized: incremental  # Pour les gros volumes
```

### Quand utiliser l'incrémental ?

Le mode `incremental` est tentant mais ajoute de la complexité. Utilisez-le quand :
- La table source est **volumineuse** (millions de lignes)
- Vous avez une **colonne de date fiable** pour identifier les nouvelles lignes
- Le coût de recalcul complet est **prohibitif**

```sql
-- models/marts/finance/fct_revenue.sql
{{
  config(
    materialized='incremental',
    unique_key='order_id'
  )
}}

SELECT
    o.order_id,
    o.customer_id,
    p.amount as revenue,
    o.ordered_at

FROM {{ ref('stg_postgres__orders') }} o
JOIN {{ ref('stg_stripe__payments') }} p
    ON o.order_id = p.order_id

{% if is_incremental() %}
WHERE o.ordered_at > (SELECT MAX(ordered_at) FROM {{ this }})
{% endif %}
```

## Documentation intégrée

dbt permet de documenter directement dans les fichiers YAML. Faites-le systématiquement pour les modèles de la couche `marts` :

```yaml
models:
  - name: fct_revenue
    description: >
      Table de faits contenant le revenu par commande.
      Grain : une ligne par commande payée.
      Mise à jour : incrémentale quotidienne.
    columns:
      - name: order_id
        description: "Identifiant unique de la commande"
      - name: revenue
        description: "Montant du paiement en euros (centimes)"
```

## Conclusion

Un projet dbt bien structuré, c'est un projet où n'importe quel membre de l'équipe peut comprendre le flux de données en 5 minutes. Les conventions de nommage, la séparation en couches, les tests systématiques et la documentation ne sont pas du luxe — c'est ce qui fait la différence entre un projet data qui scale et un qui s'effondre.
