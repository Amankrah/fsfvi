.PHONY: help build run test clean docker-build docker-up docker-down migrate-up migrate-down security-check format lint deploy

# Default target
help:
	@echo "FSFI Backend - Available Commands"
	@echo "=================================="
	@echo "Development:"
	@echo "  make build          - Build the project"
	@echo "  make run            - Run the development server"
	@echo "  make test           - Run all tests"
	@echo "  make format         - Format code with rustfmt"
	@echo "  make lint           - Lint code with clippy"
	@echo ""
	@echo "Database:"
	@echo "  make migrate-up     - Run database migrations"
	@echo "  make migrate-down   - Rollback last migration"
	@echo "  make db-reset       - Reset database (DEV ONLY)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build   - Build Docker images"
	@echo "  make docker-up      - Start all services"
	@echo "  make docker-down    - Stop all services"
	@echo "  make docker-logs    - View service logs"
	@echo ""
	@echo "Security:"
	@echo "  make security-check - Run security audit"
	@echo "  make generate-keys  - Generate JWT and encryption keys"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-check   - Pre-deployment checks"
	@echo "  make clean          - Clean build artifacts"

# Development commands
build:
	@echo "Building project..."
	cargo build --release

run:
	@echo "Starting development server..."
	cargo run

test:
	@echo "Running tests..."
	cargo test

format:
	@echo "Formatting code..."
	cargo fmt

lint:
	@echo "Linting code..."
	cargo clippy -- -D warnings

clean:
	@echo "Cleaning build artifacts..."
	cargo clean
	rm -rf target/

# Database commands
migrate-up:
	@echo "Running migrations..."
	sqlx migrate run

migrate-down:
	@echo "Rolling back migration..."
	sqlx migrate revert

db-reset:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	sqlx database drop
	sqlx database create
	sqlx migrate run

# Docker commands
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting services with Docker..."
	docker-compose up -d
	@echo "Services started. Check status with: docker-compose ps"

docker-down:
	@echo "Stopping services..."
	docker-compose down

docker-logs:
	@echo "Following service logs..."
	docker-compose logs -f

# Security commands
security-check:
	@echo "Running security audit..."
	cargo audit
	@echo ""
	@echo "Checking for outdated dependencies..."
	cargo outdated

generate-keys:
	@echo "Generating JWT_SECRET..."
	@openssl rand -base64 64
	@echo ""
	@echo "Generating ENCRYPTION_KEY..."
	@openssl rand -base64 32
	@echo ""
	@echo "⚠️  Save these in your .env file!"

# Deployment
deploy-check:
	@echo "Running pre-deployment checks..."
	@echo "1. Checking for .env file..."
	@test -f .env && echo "✓ .env exists" || (echo "✗ .env missing" && exit 1)
	@echo "2. Running tests..."
	@cargo test --quiet
	@echo "✓ Tests passed"
	@echo "3. Running security audit..."
	@cargo audit --quiet
	@echo "✓ Security audit passed"
	@echo "4. Checking code formatting..."
	@cargo fmt -- --check
	@echo "✓ Code formatted"
	@echo "5. Running linter..."
	@cargo clippy --quiet -- -D warnings
	@echo "✓ Linter passed"
	@echo ""
	@echo "✓ All pre-deployment checks passed!"
