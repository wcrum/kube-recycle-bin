# kube-recycle-bin Helm Chart

A Helm chart for deploying kube-recycle-bin, a Kubernetes resource recycle bin operator.

## Introduction

This chart deploys the kube-recycle-bin operator on a Kubernetes cluster using the Helm package manager.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+

## Installing the Chart

To install the chart with the release name `kube-recycle-bin`:

```bash
helm install kube-recycle-bin ./helm/kube-recycle-bin
```

## Uninstalling the Chart

To uninstall/delete the `kube-recycle-bin` deployment:

```bash
helm uninstall kube-recycle-bin
```

## Configuration

The following table lists the configurable parameters and their default values:

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imageRegistry` | Global Docker image registry | `""` |
| `namespace.create` | Create the namespace | `true` |
| `namespace.name` | Namespace to deploy to | `krb-system` |

### Controller Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `controller.enabled` | Enable controller component | `true` |
| `controller.image.repository` | Controller image repository | `wcrum/krb-controller` |
| `controller.image.tag` | Controller image tag | `latest` |
| `controller.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `controller.replicaCount` | Number of controller replicas | `1` |
| `controller.serviceAccount.create` | Create service account | `true` |
| `controller.serviceAccount.name` | Service account name | `krb-controller` |
| `controller.resources.requests.memory` | Memory request | `64Mi` |
| `controller.resources.requests.cpu` | CPU request | `50m` |
| `controller.resources.limits.memory` | Memory limit | `256Mi` |
| `controller.resources.limits.cpu` | CPU limit | `200m` |

### Webhook Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `webhook.enabled` | Enable webhook component | `true` |
| `webhook.image.repository` | Webhook image repository | `wcrum/krb-webhook` |
| `webhook.image.tag` | Webhook image tag | `latest` |
| `webhook.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `webhook.replicaCount` | Number of webhook replicas | `1` |
| `webhook.serviceAccount.create` | Create service account | `true` |
| `webhook.serviceAccount.name` | Service account name | `krb-webhook` |
| `webhook.service.type` | Service type | `ClusterIP` |
| `webhook.service.port` | Service port | `443` |
| `webhook.service.targetPort` | Service target port | `443` |
| `webhook.resources.requests.memory` | Memory request | `64Mi` |
| `webhook.resources.requests.cpu` | CPU request | `50m` |
| `webhook.resources.limits.memory` | Memory limit | `256Mi` |
| `webhook.resources.limits.cpu` | CPU limit | `200m` |

### Server Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `server.enabled` | Enable server component | `true` |
| `server.image.repository` | Server image repository | `wcrum/krb-server` |
| `server.image.tag` | Server image tag | `latest` |
| `server.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `server.replicaCount` | Number of server replicas | `1` |
| `server.serviceAccount.create` | Create service account | `true` |
| `server.serviceAccount.name` | Service account name | `krb-server` |
| `server.service.type` | Service type | `ClusterIP` |
| `server.service.port` | Service port | `80` |
| `server.service.targetPort` | Service target port | `8080` |
| `server.env.PORT` | Server port environment variable | `8080` |
| `server.env.WEB_DIR` | Web directory environment variable | `/run/web` |
| `server.resources.requests.memory` | Memory request | `64Mi` |
| `server.resources.requests.cpu` | CPU request | `50m` |
| `server.resources.limits.memory` | Memory limit | `256Mi` |
| `server.resources.limits.cpu` | CPU limit | `200m` |

### CRDs Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `crds.install` | Install CRDs | `true` |

## Example Installation

### Basic Installation

```bash
helm install kube-recycle-bin ./helm/kube-recycle-bin
```

### Installation with Custom Values

```bash
helm install kube-recycle-bin ./helm/kube-recycle-bin \
  --set controller.image.tag=v1.0.0 \
  --set webhook.image.tag=v1.0.0 \
  --set server.image.tag=v1.0.0 \
  --set namespace.name=my-namespace
```

### Installation from Values File

Create a custom values file `my-values.yaml`:

```yaml
controller:
  image:
    tag: "v1.0.0"
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

webhook:
  image:
    tag: "v1.0.0"

server:
  image:
    tag: "v1.0.0"
```

Then install with:

```bash
helm install kube-recycle-bin ./helm/kube-recycle-bin -f my-values.yaml
```

## Upgrading the Chart

To upgrade the chart with the release name `kube-recycle-bin`:

```bash
helm upgrade kube-recycle-bin ./helm/kube-recycle-bin
```

Or with a values file:

```bash
helm upgrade kube-recycle-bin ./helm/kube-recycle-bin -f my-values.yaml
```

## Notes

- The chart includes Custom Resource Definitions (CRDs) for `RecycleItem` and `RecyclePolicy`
- The ValidatingWebhookConfiguration resources are created dynamically by the controller based on RecyclePolicy resources
- All components are deployed in the `krb-system` namespace by default
- The server component serves a web UI on port 80 via ClusterIP service

