# Release Guide

This document outlines the process for releasing a new version of the SimpleVB Language Server.

## Prerequisites

- Access to the npm registry (if publishing to npm).
- Write access to the git repository.

## Steps

1.  **Update Version**:
    - Bump the version number in `package.json`.
    - Follow [Semantic Versioning](https://semver.org/).

    ```bash
    npm version patch # or minor, major
    ```

2.  **Build**:
    - Ensure the project builds cleanly.

    ```bash
    npm run build
    ```

3.  **Test**:
    - Run the full test suite.

    ```bash
    npm test
    ```

4.  **Publish**:
    - If publishing to npm:

    ```bash
    npm publish
    ```

    - If creating a GitHub release:
        1. Push the tags: `git push --follow-tags`.
        2. Go to GitHub Releases and draft a new release from the new tag.
        3. Attach the compiled `out/` folder or a zipped archive if necessary (though usually, consumers build from source or install via npm).

## VS Code Extension

If this server is part of a VS Code extension:
1.  Ensure the `out/server.js` is up to date.
2.  Package the extension using `vsce`.
    ```bash
    vsce package
    ```
3.  Publish to the Marketplace.
    ```bash
    vsce publish
    ```
