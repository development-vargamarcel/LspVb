# Development Guide

This guide describes how to set up the development environment, run tests, and contribute to the SimpleVB Language Server.

## Environment Setup

1.  **Install Node.js**: Ensure you have Node.js and npm installed.
2.  **Clone Repo**:
    ```bash
    git clone <repository-url>
    cd simple-vb-language-server
    ```
3.  **Install Dependencies**:
    ```bash
    npm install
    ```

## Building

The project uses TypeScript. To compile the source code into the `out/` directory:

```bash
npm run build
```

To run the build in watch mode (auto-recompile on change):

```bash
npm run watch
```

## Testing

The project uses [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) for testing.

### Running Tests

```bash
npm test
```

### Adding Tests

Test files are located in the `tests/` directory.
- `validation.test.ts`: Tests for the validator and diagnostics.
- `parser.test.ts`: Tests for symbol extraction.
- `formatting.test.ts`: Tests for the auto-formatter.

When adding a new feature or fixing a bug, please add a corresponding test case to ensure regression testing.

## Project Structure

- **`src/`**: Source code.
- **`tests/`**: Test suites.
- **`out/`**: Compiled JavaScript (ignored by git).

## Contribution Workflow

1.  Create a new branch for your feature or fix.
2.  Make your changes.
3.  Add tests to verify your changes.
4.  Run `npm test` to ensure all tests pass.
5.  Submit a Pull Request.

## Adding a New Feature

1.  **Create Feature File**: Create a new file in `src/features/` (e.g., `rename.ts`).
2.  **Implement Logic**: Write the logic for the feature.
3.  **Register Handler**: In `src/server.ts`, register the LSP handler (e.g., `connection.onRenameRequest`).
4.  **Update Capabilities**: In `src/server-capabilities.ts`, enable the corresponding capability.
5.  **Add Tests**: Create a test file in `tests/`.
