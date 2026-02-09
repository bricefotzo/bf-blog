---
title: "Le pattern Sidecar dans Kubernetes : quand et comment l'utiliser"
date: 2025-01-15
authors:
  - brice
tags:
  - containers
  - kubernetes
  - cloud-native
excerpt: "Le pattern Sidecar est l'un des design patterns les plus utilisés dans Kubernetes. Découvrez quand l'utiliser et comment l'implémenter proprement avec des exemples concrets."
---

Le pattern **Sidecar** est un des design patterns fondamentaux de l'écosystème Kubernetes. Il consiste à déployer un conteneur auxiliaire aux côtés du conteneur principal dans un même Pod, afin de lui fournir des fonctionnalités complémentaires sans modifier son code.

## Pourquoi un Sidecar ?

Dans une architecture microservices, chaque service a des besoins transverses : logging, monitoring, gestion des certificats TLS, proxy réseau... Plutôt que d'embarquer toute cette logique dans chaque service, on la délègue à un conteneur sidecar.

Les avantages sont clairs :

- **Séparation des responsabilités** : chaque conteneur a un rôle précis
- **Réutilisabilité** : le même sidecar peut être utilisé pour plusieurs services
- **Indépendance du cycle de vie** : on met à jour le sidecar sans toucher au service principal

## Exemple concret : un sidecar de logging

Imaginons un service qui écrit ses logs dans un fichier. On veut les envoyer vers un système centralisé comme Elasticsearch.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-logging
spec:
  containers:
    - name: app
      image: my-app:1.0
      volumeMounts:
        - name: logs
          mountPath: /var/log/app

    - name: log-shipper
      image: fluent/fluent-bit:latest
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
      env:
        - name: ELASTICSEARCH_HOST
          value: "elasticsearch.monitoring.svc.cluster.local"

  volumes:
    - name: logs
      emptyDir: {}
```

Les deux conteneurs partagent un volume `emptyDir`. L'application écrit ses logs, et Fluent Bit les lit et les envoie vers Elasticsearch.

## Le cas Istio / Envoy

Le cas d'usage le plus répandu du pattern Sidecar est celui des **service meshes**. Istio injecte automatiquement un proxy Envoy en sidecar de chaque Pod. Ce proxy intercepte tout le trafic réseau et fournit :

- Le **mTLS** automatique entre services
- Le **load balancing** intelligent
- L'**observabilité** (métriques, traces distribuées)
- Le **circuit breaking** et les **retries**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  labels:
    app: my-service
spec:
  template:
    metadata:
      labels:
        app: my-service
        sidecar.istio.io/inject: "true"  # Injection automatique
    spec:
      containers:
        - name: my-service
          image: my-service:2.0
          ports:
            - containerPort: 8080
```

## Kubernetes 1.28+ : les Sidecar Containers natifs

Depuis Kubernetes 1.28, les **sidecar containers natifs** sont supportés via les `initContainers` avec `restartPolicy: Always`. Cela résout un problème historique : les sidecars démarrés en tant que conteneurs normaux n'avaient pas de garantie d'ordre de démarrage ni d'arrêt.

```yaml
spec:
  initContainers:
    - name: log-shipper
      image: fluent/fluent-bit:latest
      restartPolicy: Always  # C'est un sidecar natif
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
  containers:
    - name: app
      image: my-app:1.0
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
```

Avec cette approche :
- Le sidecar démarre **avant** le conteneur principal
- Il s'arrête **après** le conteneur principal
- Il est **redémarré** automatiquement s'il crashe

## Quand ne PAS utiliser un Sidecar

Le pattern Sidecar n'est pas toujours la bonne réponse :

- **Overhead de ressources** : chaque sidecar consomme du CPU et de la mémoire
- **Complexité de debugging** : plus de conteneurs = plus de logs à analyser
- **Latence réseau** : un proxy sidecar ajoute un hop réseau

Si votre besoin est simple (par exemple juste du logging stdout), les fonctionnalités natives de Kubernetes (comme `kubectl logs`) suffisent souvent.

## Conclusion

Le pattern Sidecar est un outil puissant quand il est bien utilisé. La règle d'or : **l'utiliser quand la fonctionnalité ajoutée est orthogonale au service principal** et quand on veut découpler les cycles de vie. Avec les sidecar containers natifs de Kubernetes 1.28+, le pattern est désormais un citoyen de première classe dans l'orchestrateur.
