{{/*
Expand the name of the chart.
*/}}
{{- define "kube-recycle-bin.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "kube-recycle-bin.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kube-recycle-bin.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kube-recycle-bin.labels" -}}
helm.sh/chart: {{ include "kube-recycle-bin.chart" . }}
{{ include "kube-recycle-bin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kube-recycle-bin.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kube-recycle-bin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the namespace name
*/}}
{{- define "kube-recycle-bin.namespace" -}}
{{- default .Values.namespace.name .Values.namespace.name }}
{{- end }}

{{/*
Create the image name
*/}}
{{- define "kube-recycle-bin.image" -}}
{{- $registry := .root.Values.global.imageRegistry }}
{{- $repository := .image.repository }}
{{- $tag := default .root.Chart.AppVersion .image.tag }}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

{{/*
Controller labels
*/}}
{{- define "kube-recycle-bin.controller.labels" -}}
{{ include "kube-recycle-bin.labels" . }}
app: krb-controller
{{- end }}

{{/*
Controller selector labels
*/}}
{{- define "kube-recycle-bin.controller.selectorLabels" -}}
{{ include "kube-recycle-bin.selectorLabels" . }}
app: krb-controller
{{- end }}

{{/*
Webhook labels
*/}}
{{- define "kube-recycle-bin.webhook.labels" -}}
{{ include "kube-recycle-bin.labels" . }}
app: krb-webhook
{{- end }}

{{/*
Webhook selector labels
*/}}
{{- define "kube-recycle-bin.webhook.selectorLabels" -}}
{{ include "kube-recycle-bin.selectorLabels" . }}
app: krb-webhook
{{- end }}

{{/*
Server labels
*/}}
{{- define "kube-recycle-bin.server.labels" -}}
{{ include "kube-recycle-bin.labels" . }}
app: krb-server
{{- end }}

{{/*
Server selector labels
*/}}
{{- define "kube-recycle-bin.server.selectorLabels" -}}
{{ include "kube-recycle-bin.selectorLabels" . }}
app: krb-server
{{- end }}

