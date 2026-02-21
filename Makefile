.PHONY: build build-all clean test help test-deno-cache-install

# Default target
.DEFAULT_GOAL := help

# Build flags for minimal binary size
LDFLAGS := -ldflags="-s -w"
CGO := CGO_ENABLED=0

# Output directories
DIST_DIR := dist

# Deno test cache: installs local binary as version "dev"
DENO_CACHE_DIR := $(HOME)/.cache/sh-style/dev

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

clean: ## Remove all built binaries
	rm -rf $(DIST_DIR)

build-all: ## Build binaries for all platforms
	@echo "Building binaries for all platforms..."
	@mkdir -p $(DIST_DIR)
	
	@echo "  - linux/amd64"
	@$(CGO) GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(DIST_DIR)/bin-x86_64-Linux ./cli
	
	@echo "  - linux/arm64"
	@$(CGO) GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(DIST_DIR)/bin-aarch64-Linux ./cli
	
	@echo "  - darwin/amd64"
	@$(CGO) GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(DIST_DIR)/bin-x86_64-Darwin ./cli
	
	@echo "  - darwin/arm64"
	@$(CGO) GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(DIST_DIR)/bin-aarch64-Darwin ./cli
	
	@echo "  - windows/amd64"
	@$(CGO) GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(DIST_DIR)/bin-x86_64-Windows.exe ./cli
	
	@echo "  - windows/arm64"
	@$(CGO) GOOS=windows GOARCH=arm64 go build $(LDFLAGS) -o $(DIST_DIR)/bin-aarch64-Windows.exe ./cli

	@echo "Building for current platform for convenience with tests..."
	@make build
	
	@echo "Build complete!"

build: ## Build binary for current platform only (faster for local development)
	@echo "Building for current platform..."
	@go build -o log ./cli
	@echo "Build complete: ./log"

test-deno-cache-install: build ## Build local binary and install into Deno test cache (version: dev)
	@echo "Installing local binary into Deno test cache at $(DENO_CACHE_DIR)..."
	@mkdir -p $(DENO_CACHE_DIR)
	@GOOS=$$(go env GOOS); GOARCH=$$(go env GOARCH); \
	case "$$GOOS" in \
	  darwin) OS="Darwin" ;; \
	  linux)  OS="Linux"  ;; \
	  windows) OS="Windows" ;; \
	  *) echo "Unsupported OS: $$GOOS"; exit 1 ;; \
	esac; \
	case "$$GOARCH" in \
	  amd64) ARCH="x86_64"  ;; \
	  arm64) ARCH="aarch64" ;; \
	  *) echo "Unsupported arch: $$GOARCH"; exit 1 ;; \
	esac; \
	EXT=""; if [ "$$GOOS" = "windows" ]; then EXT=".exe"; fi; \
	ASSET="bin-$${ARCH}-$${OS}$${EXT}"; \
	cp log $(DENO_CACHE_DIR)/$$ASSET; \
	chmod +x $(DENO_CACHE_DIR)/$$ASSET; \
	echo "Installed: $(DENO_CACHE_DIR)/$$ASSET"

test: build-all test-deno-cache-install ## Run all tests (builds all binaries and installs Deno test cache first)
	@echo "Running integration tests..."
	@go test -v .
	@echo ""
	@echo "Running wrapper tests..."
	@BINARY_VERSION=dev go test -v ./tests/

test-junit: build-all test-deno-cache-install
	@mkdir -p reports
	@BINARY_VERSION=dev gotestsum --junitfile reports/junit.xml -- -v . ./tests/