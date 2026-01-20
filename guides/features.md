# Features

SimpleVB provides a set of essential features to improve the editing experience for Visual Basic code.

## 1. Code Completion
Context-aware suggestions for:
- **Keywords**: Standard VB keywords (`If`, `Select`, `Function`, `Dim`, etc.).
- **Symbols**: User-defined Subroutines, Functions, Variables, and Constants found in the current document.
- **Snippets**: Pre-defined templates for common structures (`If...Then`, `For...Next`, `Try...Catch`).

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

## 3. Document Outline (Symbols)
Provides a hierarchical, tree-based view of the symbols in the file.
- **Hierarchy**: Methods, properties, and fields are nested under their parent Class or Module. Variables are nested under their containing Method.
- **Supported Symbols**:
    - Classes / Modules
    - Methods (Sub, Function)
    - Properties
    - Variables (Dim)
    - Constants (Const)
    - Fields

## 4. Formatting
Automatically formats the document by adjusting indentation.
- Indents code inside blocks (`If`, `For`, `Sub`, `Select Case`, etc.).
- Dedents closing statements (`End If`, `Next`, `End Sub`).
- Handles complex nesting.

## 5. Folding
Allows collapsing of code blocks to improve readability. Supported blocks:
- `Sub` / `Function` / `Property`
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
