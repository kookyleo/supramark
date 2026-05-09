.PHONY: test lint fmt check-all setup-hooks

# Rust checks
.PHONY: rust-test rust-clippy rust-fmt
rust-test:
	cargo test -p graphviz-anywhere --lib

rust-clippy:
	cargo clippy -p graphviz-anywhere --lib

rust-fmt:
	cargo fmt --check

# Web checks
.PHONY: web-test web-lint web-fmt web-typecheck
web-test:
	cd packages/web && npm test -- --run && cd ../..

web-lint:
	cd packages/web && npm run lint && cd ../..

web-fmt:
	cd packages/web && npm run fmt && cd ../..

web-typecheck:
	cd packages/web && npm run typecheck && cd ../..

# React Native checks
.PHONY: rn-typecheck rn-lint rn-fmt
rn-typecheck:
	cd packages/react-native && npm run typescript && cd ../..

rn-lint:
	cd packages/react-native && npm run lint && cd ../..

rn-fmt:
	cd packages/react-native && npm run fmt && cd ../..

# Combined targets
test: rust-test web-test
	@echo "✓ All tests passed"

lint: rust-clippy web-lint rn-lint
	@echo "✓ All lints passed"

fmt: rust-fmt web-fmt rn-fmt
	@echo "✓ All formatters checked"

check-all: rust-test rust-clippy rust-fmt web-test web-lint web-fmt web-typecheck rn-typecheck rn-lint rn-fmt
	@echo "✓ All checks passed!"

setup-hooks:
	git config core.hooksPath .githooks
	@echo "✓ Git hooks configured"

help:
	@echo "graphviz-anywhere - Available make targets:"
	@echo "  test         - Run all tests"
	@echo "  lint         - Run clippy + eslint"
	@echo "  fmt          - Check formatting (non-destructive)"
	@echo "  check-all    - Run all tests, lints, and format checks"
	@echo "  setup-hooks  - Install git pre-commit hooks"
	@echo ""
	@echo "Individual targets:"
	@echo "  rust-test, rust-clippy, rust-fmt"
	@echo "  web-test, web-lint, web-fmt, web-typecheck"
	@echo "  rn-typecheck, rn-lint, rn-fmt"
