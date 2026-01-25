# Features

SimpleVB provides a set of essential features to improve the editing experience for Visual Basic code.

## 1. Code Completion
Context-aware suggestions for:
- **Keywords**: Standard VB keywords (`If`, `Select`, `Function`, `Dim`, etc.).
- **Symbols**: User-defined Subroutines, Functions, Variables, and Constants found in the current document.
- **Snippets**: Pre-defined templates for common structures (`If...Then`, `For...Next`, `Try...Catch`).
- **End Logic**: Intelligent suggestions for closing statements (e.g., typing `End` suggests `If`, `Sub`, `Class`, etc. based on context).

## 2. Diagnostics (Validation)
Real-time error checking for:
- **Syntax Errors**:
    - Missing `Then` in `If` statements.
    - `Dim` declarations missing the `As Type` clause.
    - `Const` declarations missing a value.
- **Structural Errors**:
    - Unclosed blocks (e.g., `If` without `End If`).
    - Mismatched blocks (e.g., closing a `For` loop with `End Sub`).
    - Unexpected closing statements.
    - **Empty Blocks**: Warns about empty control flow blocks (e.g., `If ... End If` with no content).
- **Flow Control**:
    - `Return`: Validates that `Return` is used within a Function, Sub, or Property. Checks if a value is returned (required for Function/Property, forbidden for Sub).
    - `Exit`: Validates that `Exit Sub`, `Exit For`, etc., are used within the correct block type.
- **Scope**:
    - Duplicate Declarations: Warns if a symbol name is reused within the same scope.
    - Unused Variables: Warns if a local variable is declared but never used.

## 3. Document Outline (Symbols)
Provides a hierarchical, tree-based view of the symbols in the file.
- **Hierarchy**: Methods, properties, and fields are nested under their parent Class, Module, Structure, Interface, or Enum. Variables are nested under their containing Method.
- **Supported Symbols**:
    - Classes / Modules
    - Methods (Sub, Function)
    - Properties
    - Structures
    - Interfaces
    - Enums
    - Variables (Dim)
    - Constants (Const)
    - Fields

## 4. Formatting
Automatically formats the document by adjusting indentation.
- Indents code inside blocks (`If`, `For`, `Sub`, `Select Case`, etc.).
- Dedents closing statements (`End If`, `Next`, `End Sub`).
- Handles complex nesting.
- **Range Formatting**: Supports formatting a specific selection of code.

## 5. Folding
Allows collapsing of code blocks to improve readability. Supported blocks:
- `Sub` / `Function` / `Property`
- `Class` / `Module` / `Structure` / `Interface` / `Enum`
- `If...End If`
- `For...Next`
- `Do...Loop`
- `While...Wend`
- `Select...End Select`

## 6. Hover
Shows basic information when hovering over keywords or symbols.
- Displays the type of symbol (e.g., "Function", "Variable").
- Shows documentation for built-in keywords.

## 7. Definition
Supports "Go to Definition" for symbols defined within the same file.
- Ctrl+Click on a symbol usage to jump to its declaration.

## 8. References
Finds all occurrences of a symbol in the current document.
- Right-click on a symbol and select "Find All References".

## 9. Rename
Renames a symbol and all its occurrences in the current document.
- Right-click on a symbol and select "Rename Symbol" (or press F2).

## 10. Code Actions (Quick Fixes)
Provides quick fixes for common errors:
- Add missing `Then` to `If` statements.
- Add `As Object` to `Dim` declarations.
- Initialize `Const` with a value.
- Add missing closing statements (e.g. `End If`, `Next`).

## 11. Signature Help
Shows parameter information when typing a function call.
- Triggered automatically when typing `(` or `,`.

## 12. Semantic Tokens
Provides semantic highlighting for symbols to enable better colorization in the editor.
- Distinguishes between Classes, Methods, Variables, Keywords, etc.

## 13. Inlay Hints
Displays parameter names inline for function and subroutine calls.
- Helps identify arguments in long or complex function calls.
- Example: `MyFunction(x: 10, y: "test")`

## 14. Code Lens
Displays the number of references for classes, methods, and properties above their definition.
- Currently informational only (displays count).
