# Contributing to Access Control Kit

Thank you for your interest in contributing to **Access Control Kit**! We welcome and appreciate contributions of all forms, including bug fixes, feature implementations, and documentation enhancements.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read and respect these principles.

---

## Development Setup

To configure the workspace locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Akshad11/access-control-kit.git
   cd access-control-kit
   ```

2. **Install Dependencies**:
   Navigate into the core package or root workspace and install dependencies:
   ```bash
   cd packages/core
   npm install
   ```

3. **Verify Your Local Build**:
   Ensure all checks compile cleanly:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

---

## Verification and Standards

All code submissions must satisfy the following criteria:

- **Strict Type Checking**: Runs with zero errors under strict TypeScript configurations (`npm run typecheck`).
- **Pristine Linting**: Free of styles and pattern violations (`npm run lint`).
- **Complete Test Coverage**: Ensures 90%+ (ideally 100%) statement and branch coverages are maintained on execution (`npm run test:coverage`).
- **Deterministic Builds**: Build targets generate ESM and CommonJS bundles successfully (`npm run build`).

---

## Pull Request Process

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit with Intention**:
   Write descriptive commit messages detailing *what* changed and *why*.
3. **Open a Pull Request**:
   Describe the context, reference any linked issues, and provide evidence of pass checks (e.g. test results).
