KRB_VERSION := v0.2.1

.PHONY: install
install:
	@echo "» installing krb-cli..."
	go install -ldflags="-s -w -X github.com/wcrum/kube-recycle-bin/cmd/krb-cli/cmd.Version=${KRB_VERSION}" ./cmd/krb-cli

.PHONY: build
build: build-binary build-binary build-docker

build-binary: build-controller-binary build-webhook-binary build-server-binary

build-controller-binary:
	@echo "» building krb binary..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/amd64/krb-controller cmd/krb-controller/main.go
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o bin/arm64/krb-controller cmd/krb-controller/main.go

build-webhook-binary:
	@echo "» building krb binary..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/amd64/krb-webhook cmd/krb-webhook/main.go
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o bin/arm64/krb-webhook cmd/krb-webhook/main.go

build-server-binary:
	@echo "» building krb-server binary..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/amd64/krb-server cmd/krb-server/main.go
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o bin/arm64/krb-server cmd/krb-server/main.go

.PHONY: run-server
run-server:
	@echo "» running krb-server..."
	@go run cmd/krb-server/main.go

.PHONY: build-server-local
build-server-local:
	@echo "» building krb-server for local..."
	@go build -o bin/krb-server cmd/krb-server/main.go

docker-buildx-init:
	@echo "» initializing docker buildx..."
	docker buildx create --use --name gobuilder 2>/dev/null || docker buildx use gobuilder

build-docker: docker-buildx-init build-docker-controller build-docker-webhook

build-docker-controller:
	@echo "» building krb-controller docker image..."
	docker buildx build --platform linux/amd64,linux/arm64 \
	--build-arg KRB_APPNAME=krb-controller \
	-t wcrum/krb-controller:${KRB_VERSION} \
	-t wcrum/krb-controller:latest \
	--push . -f Dockerfile.local

build-docker-webhook:
	@echo "» building krb-webhook docker image..."
	docker buildx build --platform linux/amd64,linux/arm64 \
	--build-arg KRB_APPNAME=krb-webhook \
	-t wcrum/krb-webhook:${KRB_VERSION} \
	-t wcrum/krb-webhook:latest \
	--push . -f Dockerfile.local

.PHONY: build-docker-local
build-docker-local: build-controller-binary build-webhook-binary build-server-binary build-docker-controller-local build-docker-webhook-local build-docker-server-local

build-docker-controller-local:
	@echo "» building krb-controller docker image locally..."
	docker build --build-arg KRB_APPNAME=krb-controller \
	--build-arg TARGETARCH=amd64 \
	-t wcrum/krb-controller:latest \
	. -f Dockerfile.local

build-docker-webhook-local:
	@echo "» building krb-webhook docker image locally..."
	docker build --build-arg KRB_APPNAME=krb-webhook \
	--build-arg TARGETARCH=amd64 \
	-t wcrum/krb-webhook:latest \
	. -f Dockerfile.local

build-docker-server-local: build-server-binary build-web-frontend
	@echo "» building krb-server docker image locally..."
	docker build --build-arg KRB_APPNAME=krb-server \
	--build-arg TARGETARCH=amd64 \
	-t wcrum/krb-server:latest \
	. -f Dockerfile.server

.PHONY: build-web-frontend
build-web-frontend:
	@echo "» building web frontend..."
	@cd web && npm install && npm run build

.PHONY: kind-load-images
kind-load-images:
	@echo "» loading images into kind cluster..."
	@kind load docker-image wcrum/krb-controller:latest --name kube-recycle-bin || true
	@kind load docker-image wcrum/krb-webhook:latest --name kube-recycle-bin || true
	@kind load docker-image wcrum/krb-server:latest --name kube-recycle-bin || true

.PHONY: deploy-kind
deploy-kind: build-docker-local kind-load-images deploy
	@echo "» deployment to kind cluster complete!"

.PHONY: deploy
deploy: deploy-crds
	@echo "» deploying krb controller and webhook..."
	kubectl apply -f manifests/deploy.yaml

deploy-crds:
	@echo "» deploying krb crds..."
	kubectl apply -f manifests/crds.yaml

.PHONY: undeploy
undeploy: undeploy-crds
	@echo "» undeploying krb controller and webhook..."
	kubectl delete -f manifests/deploy.yaml

undeploy-crds:
	@echo "» undeploying krb crds..."
	kubectl delete -f manifests/crds.yaml

.PHONY: release
release:
	@if [ -z "${KRB_VERSION}" ]; then \
		echo "KRB_VERSION is not set"; \
		exit 1; \
	fi
	@if git rev-parse "refs/tags/${KRB_VERSION}" >/dev/null 2>&1; then \
        echo "Git tag ${KRB_VERSION} already exists, please use a new version."; \
        exit 1; \
    fi
	@sed -E -i '' 's/(var Version = ")[^"]+(")/\1${KRB_VERSION}\2/' cmd/krb-cli/cmd/version.go
	@git add Makefile cmd/krb-cli/cmd/version.go
	@git commit -m "Release ${KRB_VERSION}"
	@git push
	git tag -a "${KRB_VERSION}" -m "release ${KRB_VERSION}"
	git push origin "${KRB_VERSION}"