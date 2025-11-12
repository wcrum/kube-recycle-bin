/*
Copyright 2025 The Ketches Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"unicode"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/rand"
	"sigs.k8s.io/yaml"
)

type RecycleItem struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata"`

	Object RecycledObject `json:"object"`
}

type RecycledObject struct {
	Group     string `json:"group,omitempty"`
	Version   string `json:"version"`
	Kind      string `json:"kind"`
	Resource  string `json:"resource"`
	Namespace string `json:"namespace,omitempty"`
	Name      string `json:"name"`
	Raw       []byte `json:"raw"`
}

type RecycleItemList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata"`
	Items           []RecycleItem `json:"items"`
}

// sanitizeResourceName sanitizes a string to be a valid Kubernetes resource name (RFC 1123 subdomain).
// It converts to lowercase, replaces invalid characters with hyphens, and ensures it starts/ends with alphanumeric.
func sanitizeResourceName(name string) string {
	if name == "" {
		return "unnamed"
	}

	// Convert to lowercase
	result := strings.ToLower(name)

	// Replace invalid characters (anything not alphanumeric, hyphen, or dot) with hyphens
	var builder strings.Builder
	for _, r := range result {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '.' {
			builder.WriteRune(r)
		} else {
			builder.WriteRune('-')
		}
	}
	result = builder.String()

	// Replace consecutive hyphens/dots with single hyphen
	result = strings.ReplaceAll(result, "..", ".")
	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}
	for strings.Contains(result, "-.") {
		result = strings.ReplaceAll(result, "-.", "-")
	}
	for strings.Contains(result, ".-") {
		result = strings.ReplaceAll(result, ".-", "-")
	}

	// Remove leading/trailing hyphens and dots, ensure it starts/ends with alphanumeric
	result = strings.Trim(result, "-.")
	if result == "" {
		return "unnamed"
	}

	// Ensure it starts with alphanumeric
	if !unicode.IsLetter(rune(result[0])) && !unicode.IsDigit(rune(result[0])) {
		result = "x" + result
	}

	// Ensure it ends with alphanumeric
	if !unicode.IsLetter(rune(result[len(result)-1])) && !unicode.IsDigit(rune(result[len(result)-1])) {
		result = result + "x"
	}

	// Truncate to 253 characters (Kubernetes resource name max length)
	if len(result) > 253 {
		result = result[:253]
		// Ensure it still ends with alphanumeric after truncation
		if !unicode.IsLetter(rune(result[len(result)-1])) && !unicode.IsDigit(rune(result[len(result)-1])) {
			result = result[:len(result)-1] + "x"
		}
	}

	return result
}

// sanitizeLabelValue sanitizes a string to be a valid Kubernetes label value.
// It replaces invalid characters with hyphens and ensures it starts/ends with alphanumeric.
func sanitizeLabelValue(value string) string {
	if value == "" {
		return "unnamed"
	}

	// Replace invalid characters (anything not alphanumeric, hyphen, underscore, or dot) with hyphens
	var builder strings.Builder
	for _, r := range value {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' || r == '.' {
			builder.WriteRune(r)
		} else {
			builder.WriteRune('-')
		}
	}
	result := builder.String()

	// Replace consecutive invalid characters with single hyphen
	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}

	// Remove leading/trailing hyphens, ensure it starts/ends with alphanumeric
	result = strings.Trim(result, "-_.")
	if result == "" {
		return "unnamed"
	}

	// Ensure it starts with alphanumeric
	if !unicode.IsLetter(rune(result[0])) && !unicode.IsDigit(rune(result[0])) {
		result = "x" + result
	}

	// Ensure it ends with alphanumeric
	if !unicode.IsLetter(rune(result[len(result)-1])) && !unicode.IsDigit(rune(result[len(result)-1])) {
		result = result + "x"
	}

	// Truncate to 63 characters (Kubernetes label value max length)
	if len(result) > 63 {
		result = result[:63]
		// Ensure it still ends with alphanumeric after truncation
		if !unicode.IsLetter(rune(result[len(result)-1])) && !unicode.IsDigit(rune(result[len(result)-1])) {
			result = result[:len(result)-1] + "x"
		}
	}

	return result
}

func NewRecycleItem(recycledObj *RecycledObject) *RecycleItem {
	// Sanitize the resource name for use in RecycleItem metadata.name
	sanitizedName := sanitizeResourceName(recycledObj.Name)

	// Sanitize label values to ensure they're valid Kubernetes label values
	labels := map[string]string{
		"krb.wcrum.dev/object-name": sanitizeLabelValue(recycledObj.Name),
		"krb.wcrum.dev/object-gr":   sanitizeLabelValue(recycledObj.GroupResource().String()),
		"krb.wcrum.dev/recycled-at": fmt.Sprintf("%d", metav1.Now().Unix()),
	}
	if recycledObj.Namespace != "" {
		labels["krb.wcrum.dev/object-namespace"] = sanitizeLabelValue(recycledObj.Namespace)
	}

	return &RecycleItem{
		TypeMeta: metav1.TypeMeta{
			APIVersion: GroupVersion.String(),
			Kind:       RecycleItemKind,
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:   sanitizedName + "-" + rand.String(8),
			Labels: labels,
		},
		Object: *recycledObj,
	}
}

func (obj *RecycledObject) Key() string {
	if obj.Namespace == "" {
		return obj.Name
	}
	return obj.Namespace + "/" + obj.Name
}

func (obj *RecycledObject) GroupVersionKind() schema.GroupVersionKind {
	return schema.GroupVersionKind{
		Group:   obj.Group,
		Version: obj.Version,
		Kind:    obj.Kind,
	}
}

func (obj *RecycledObject) GroupVersionResource() schema.GroupVersionResource {
	return schema.GroupVersionResource{
		Group:    obj.Group,
		Version:  obj.Version,
		Resource: obj.Resource,
	}
}

func (obj *RecycledObject) GroupResource() schema.GroupResource {
	return schema.GroupResource{
		Group:    obj.Group,
		Resource: obj.Resource,
	}
}

func (obj *RecycledObject) GroupVersion() schema.GroupVersion {
	return schema.GroupVersion{
		Group:   obj.Group,
		Version: obj.Version,
	}
}

func (obj *RecycledObject) ObjectGroupKind() schema.GroupKind {
	return schema.GroupKind{
		Group: obj.Group,
		Kind:  obj.Kind,
	}
}

func (obj *RecycledObject) Unstructured() (*unstructured.Unstructured, error) {
	unstructuredObj := &unstructured.Unstructured{}
	if err := json.Unmarshal(obj.Raw, unstructuredObj); err != nil {
		return nil, err
	}

	// Remove the resourceVersion field from the metadata, so it
	// doesn't cause conflicts when creating a new object.
	unstructured.RemoveNestedField(unstructuredObj.Object, "metadata", "resourceVersion")

	return unstructuredObj, nil
}

func (obj *RecycledObject) JSON() string {
	return string(obj.Raw)
}

func (obj *RecycledObject) IndentedJSON() (string, error) {
	var out bytes.Buffer
	if err := json.Indent(&out, obj.Raw, "", "  "); err != nil {
		return "", err
	}

	return out.String(), nil
}

func (obj *RecycledObject) YAML() (string, error) {
	b, err := yaml.JSONToYAML(obj.Raw)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
