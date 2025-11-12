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

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/wcrum/kube-recycle-bin/internal/api"
	krbclient "github.com/wcrum/kube-recycle-bin/internal/client"
	"github.com/wcrum/kube-recycle-bin/pkg/kube"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type Server struct {
	webDir string
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	webDir := os.Getenv("WEB_DIR")
	if webDir == "" {
		webDir = "./web"
	}

	s := &Server{
		webDir: webDir,
	}

	mux := http.NewServeMux()

	// API endpoints
	mux.HandleFunc("/api/v1/recycle-items", s.handleListRecycleItems)
	mux.HandleFunc("/api/v1/recycle-items/", s.handleRecycleItem)
	mux.HandleFunc("/api/v1/recycle-policies", s.handleRecyclePolicies)
	mux.HandleFunc("/api/v1/recycle-policies/", s.handleRecyclePolicy)

	// Static file server for SPA
	// Serve index.html for all non-API routes (SPA fallback)
	mux.HandleFunc("/", s.handleSPA)

	log.Printf("Starting server on :%s", port)
	log.Printf("Serving web files from: %s", webDir)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(mux)))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleListRecycleItems(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	list, err := krbclient.RecycleItem().List(context.Background(), client.ListOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list recycle items: %v", err), http.StatusInternalServerError)
		return
	}

	// Transform to API response format
	items := make([]RecycleItemResponse, len(list.Items))
	for i, item := range list.Items {
		items[i] = RecycleItemResponse{
			Name:             item.Name,
			ObjectKey:        item.Object.Key(),
			ObjectAPIVersion: item.Object.GroupVersion().String(),
			ObjectKind:       item.Object.Kind,
			ObjectNamespace:  item.Object.Namespace,
			ObjectName:       item.Object.Name,
			ObjectResource:   item.Object.Resource,
			Age:              time.Since(item.CreationTimestamp.Time).String(),
			CreatedAt:        item.CreationTimestamp.Time.Format(time.RFC3339),
		}
	}

	response := RecycleItemListResponse{
		Items: items,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleRecycleItem(w http.ResponseWriter, r *http.Request) {
	// Extract path after /api/v1/recycle-items/
	path := r.URL.Path[len("/api/v1/recycle-items/"):]

	// Check if it's a restore request: /api/v1/recycle-items/{name}/restore
	if r.Method == http.MethodPost && strings.HasSuffix(path, "/restore") {
		name := strings.TrimSuffix(path, "/restore")
		if name == "" {
			http.Error(w, "Name is required", http.StatusBadRequest)
			return
		}
		s.handleRestore(w, r, name)
		return
	}

	// For other requests, treat the path as the name
	name := path
	if name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Check if it's a YAML request
		if r.URL.Query().Get("format") == "yaml" {
			s.handleGetYAML(w, r, name)
			return
		}
		s.handleGetRecycleItem(w, r, name)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleGetRecycleItem(w http.ResponseWriter, r *http.Request, name string) {
	item, err := krbclient.RecycleItem().Get(context.Background(), name, client.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get recycle item: %v", err), http.StatusNotFound)
		return
	}

	response := RecycleItemDetailResponse{
		Name:             item.Name,
		ObjectKey:        item.Object.Key(),
		ObjectAPIVersion: item.Object.GroupVersion().String(),
		ObjectKind:       item.Object.Kind,
		ObjectNamespace:  item.Object.Namespace,
		ObjectName:       item.Object.Name,
		ObjectResource:   item.Object.Resource,
		Age:              time.Since(item.CreationTimestamp.Time).String(),
		CreatedAt:        item.CreationTimestamp.Time.Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleGetYAML(w http.ResponseWriter, r *http.Request, name string) {
	item, err := krbclient.RecycleItem().Get(context.Background(), name, client.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get recycle item: %v", err), http.StatusNotFound)
		return
	}

	yaml, err := item.Object.YAML()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to convert to YAML: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/yaml")
	fmt.Fprint(w, yaml)
}

func (s *Server) handleRestore(w http.ResponseWriter, r *http.Request, name string) {
	item, err := krbclient.RecycleItem().Get(context.Background(), name, client.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get recycle item: %v", err), http.StatusNotFound)
		return
	}

	unstructuredObj, err := item.Object.Unstructured()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get unstructured object: %v", err), http.StatusInternalServerError)
		return
	}

	_, err = kube.DynamicClient().Resource(item.Object.GroupVersionResource()).Namespace(item.Object.Namespace).Create(context.Background(), unstructuredObj, metav1.CreateOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to restore resource: %v", err), http.StatusInternalServerError)
		return
	}

	// Delete the recycle item after successful restore
	if err := krbclient.RecycleItem().Delete(context.Background(), name, client.DeleteOptions{}); err != nil {
		log.Printf("Warning: Failed to delete RecycleItem [%s] after restore: %v", name, err)
	}

	response := RestoreResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully restored %s", item.Object.Key()),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// API Response types
type RecycleItemResponse struct {
	Name             string `json:"name"`
	ObjectKey        string `json:"objectKey"`
	ObjectAPIVersion string `json:"objectAPIVersion"`
	ObjectKind       string `json:"objectKind"`
	ObjectNamespace  string `json:"objectNamespace"`
	ObjectName       string `json:"objectName"`
	ObjectResource   string `json:"objectResource"`
	Age              string `json:"age"`
	CreatedAt        string `json:"createdAt"`
}

type RecycleItemListResponse struct {
	Items []RecycleItemResponse `json:"items"`
}

type RecycleItemDetailResponse struct {
	Name             string `json:"name"`
	ObjectKey        string `json:"objectKey"`
	ObjectAPIVersion string `json:"objectAPIVersion"`
	ObjectKind       string `json:"objectKind"`
	ObjectNamespace  string `json:"objectNamespace"`
	ObjectName       string `json:"objectName"`
	ObjectResource   string `json:"objectResource"`
	Age              string `json:"age"`
	CreatedAt        string `json:"createdAt"`
}

type RestoreResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func (s *Server) handleRecyclePolicies(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleListRecyclePolicies(w, r)
	case http.MethodPost:
		s.handleCreateRecyclePolicy(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleListRecyclePolicies(w http.ResponseWriter, r *http.Request) {
	list, err := krbclient.RecyclePolicy().List(context.Background(), client.ListOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list recycle policies: %v", err), http.StatusInternalServerError)
		return
	}

	// Transform to API response format
	policies := make([]RecyclePolicyResponse, len(list.Items))
	for i, policy := range list.Items {
		policies[i] = RecyclePolicyResponse{
			Name:       policy.Name,
			Group:      policy.Target.Group,
			Resource:   policy.Target.Resource,
			Namespaces: policy.Target.Namespaces,
			Age:        time.Since(policy.CreationTimestamp.Time).String(),
			CreatedAt:  policy.CreationTimestamp.Time.Format(time.RFC3339),
		}
	}

	response := RecyclePolicyListResponse{
		Policies: policies,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleCreateRecyclePolicy(w http.ResponseWriter, r *http.Request) {
	var req CreateRecyclePolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Failed to decode request: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	if req.Resource == "" {
		http.Error(w, "Resource is required", http.StatusBadRequest)
		return
	}

	// Create the RecyclePolicy
	policy := &api.RecyclePolicy{
		TypeMeta: metav1.TypeMeta{
			APIVersion: api.GroupVersion.String(),
			Kind:       api.RecyclePolicyKind,
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: req.Name,
		},
		Target: api.RecycleTarget{
			Group:      req.Group,
			Resource:   req.Resource,
			Namespaces: req.Namespaces,
		},
	}

	if err := krbclient.RecyclePolicy().Create(context.Background(), policy, client.CreateOptions{}); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create recycle policy: %v", err), http.StatusInternalServerError)
		return
	}

	// Fetch the created policy to get the timestamp set by Kubernetes
	createdPolicy, err := krbclient.RecyclePolicy().Get(context.Background(), policy.Name, client.GetOptions{})
	if err != nil {
		// If we can't fetch it, still return success but with default timestamp
		response := CreateRecyclePolicyResponse{
			Success: true,
			Message: fmt.Sprintf("Successfully created RecyclePolicy %s", policy.Name),
			Policy: RecyclePolicyResponse{
				Name:       policy.Name,
				Group:      policy.Target.Group,
				Resource:   policy.Target.Resource,
				Namespaces: policy.Target.Namespaces,
				Age:        "0s",
				CreatedAt:  time.Now().Format(time.RFC3339),
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(response)
		return
	}

	response := CreateRecyclePolicyResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully created RecyclePolicy %s", createdPolicy.Name),
		Policy: RecyclePolicyResponse{
			Name:       createdPolicy.Name,
			Group:      createdPolicy.Target.Group,
			Resource:   createdPolicy.Target.Resource,
			Namespaces: createdPolicy.Target.Namespaces,
			Age:        time.Since(createdPolicy.CreationTimestamp.Time).String(),
			CreatedAt:  createdPolicy.CreationTimestamp.Time.Format(time.RFC3339),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleRecyclePolicy(w http.ResponseWriter, r *http.Request) {
	// Extract path after /api/v1/recycle-policies/
	path := r.URL.Path[len("/api/v1/recycle-policies/"):]
	if path == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.handleGetRecyclePolicy(w, r, path)
	case http.MethodDelete:
		s.handleDeleteRecyclePolicy(w, r, path)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleSPA serves static files and index.html for SPA routing
func (s *Server) handleSPA(w http.ResponseWriter, r *http.Request) {
	// Try to serve the requested file first (for assets like JS, CSS, etc.)
	filePath := s.webDir + r.URL.Path
	if f, err := os.Open(filePath); err == nil {
		defer f.Close()
		if stat, err := f.Stat(); err == nil && !stat.IsDir() {
			http.ServeFile(w, r, filePath)
			return
		}
	}

	// For all other routes (including root), serve index.html
	indexPath := s.webDir + "/index.html"
	http.ServeFile(w, r, indexPath)
}

func (s *Server) handleGetRecyclePolicy(w http.ResponseWriter, r *http.Request, name string) {
	policy, err := krbclient.RecyclePolicy().Get(context.Background(), name, client.GetOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get recycle policy: %v", err), http.StatusNotFound)
		return
	}

	response := RecyclePolicyResponse{
		Name:       policy.Name,
		Group:      policy.Target.Group,
		Resource:   policy.Target.Resource,
		Namespaces: policy.Target.Namespaces,
		Age:        time.Since(policy.CreationTimestamp.Time).String(),
		CreatedAt:  policy.CreationTimestamp.Time.Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleDeleteRecyclePolicy(w http.ResponseWriter, r *http.Request, name string) {
	if err := krbclient.RecyclePolicy().Delete(context.Background(), name, client.DeleteOptions{}); err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete recycle policy: %v", err), http.StatusInternalServerError)
		return
	}

	response := DeleteRecyclePolicyResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully deleted RecyclePolicy %s", name),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// RecyclePolicy API Response types
type RecyclePolicyResponse struct {
	Name       string   `json:"name"`
	Group      string   `json:"group"`
	Resource   string   `json:"resource"`
	Namespaces []string `json:"namespaces"`
	Age        string   `json:"age"`
	CreatedAt  string   `json:"createdAt"`
}

type RecyclePolicyListResponse struct {
	Policies []RecyclePolicyResponse `json:"policies"`
}

type CreateRecyclePolicyRequest struct {
	Name       string   `json:"name"`
	Group      string   `json:"group"`
	Resource   string   `json:"resource"`
	Namespaces []string `json:"namespaces"`
}

type CreateRecyclePolicyResponse struct {
	Success bool                  `json:"success"`
	Message string                `json:"message"`
	Policy  RecyclePolicyResponse `json:"policy"`
}

type DeleteRecyclePolicyResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
