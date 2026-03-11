.PHONY: build build-all clean test help

# Default target
.DEFAULT_GOAL := help

# Build flags for minimal binary size
LDFLAGS := -ldflags="-s -w"
CGO := CGO_ENABLED=0

# Output directories
DIST_DIR := dist
DENO_BIN_DIR := deno/bin

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

clean: ## Remove all built binaries
	rm -rf $(DIST_DIR)
	rm -rf $(DENO_BIN_DIR)

build-all: ## Build binaries for all platforms and copy to all destinations
	@echo "Building binaries for all platforms..."
	@mkdir -p $(DIST_DIR)
	@mkdir -p $(DENO_BIN_DIR)
	
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
	
	@echo "Copying binaries to Deno wrapper..."
	@cp $(DIST_DIR)/bin-x86_64-Linux $(DENO_BIN_DIR)/log-linux-amd64
	@cp $(DIST_DIR)/bin-aarch64-Linux $(DENO_BIN_DIR)/log-linux-arm64
	@cp $(DIST_DIR)/bin-x86_64-Darwin $(DENO_BIN_DIR)/log-darwin-amd64
	@cp $(DIST_DIR)/bin-aarch64-Darwin $(DENO_BIN_DIR)/log-darwin-arm64
	@cp $(DIST_DIR)/bin-x86_64-Windows.exe $(DENO_BIN_DIR)/log-windows-amd64.exe
	@cp $(DIST_DIR)/bin-aarch64-Windows.exe $(DENO_BIN_DIR)/log-windows-arm64.exe
	
	@echo "Setting execute permissions..."
	@chmod +x $(DENO_BIN_DIR)/log-*
	
	@echo "Build complete!"

build: ## Build binary for current platform only (faster for local development)
	@echo "Building for current platform..."
	@go build -o log ./cli
	@echo "Build complete: ./log"

test: build-all ## Run all tests (builds all binaries first)
	@echo "Running integration tests..."
	@go test -v .
	@echo ""
	@echo "Running wrapper tests..."
	@go test -v ./tests/

test-junit: build-all
	@mkdir -p reports
	@gotestsum --junitfile reports/junit.xml -- -v . ./tests/