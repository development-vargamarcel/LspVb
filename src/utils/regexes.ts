/**
 * Centralized regular expression definitions for parsing, validation, and formatting.
 * Keeping regexes here ensures consistency across different features.
 */

/** Pattern for matching access modifiers (Public, Private, Friend, Protected). */
export const MODIFIER_PATTERN = '(?:Public|Private|Friend|Protected)';

// Patterns
// Updated BLOCK_START_PATTERN to optionally capture arguments in parens.
// Groups: 1=Modifier, 2=Type, 3=Name, 4=Args
const BLOCK_START_PATTERN = `^\\s*(?:(${MODIFIER_PATTERN})\\s+)?(Sub|Function|Class|Module|Property|Structure|Interface|Enum)\\s+(\\w+)(?:\\s*\\(([^)]*)\\))?`;
const DIM_PATTERN = `^\\s*Dim\\s+(\\w+)(?:\\s+As\\s+(\\w+))?`;
const CONST_PATTERN = `^\\s*(?:(${MODIFIER_PATTERN})\\s+)?Const\\s+(\\w+)(?:\\s+As\\s+(\\w+))?`;
const FIELD_PATTERN = `^\\s*(${MODIFIER_PATTERN})\\s+(\\w+)(?:\\s+As\\s+(\\w+))?`;

// For Parser (Global + Multiline + Case Insensitive)

/** Regex for parsing block starts (Sub, Function, Class, Module, Property, Structure, Interface, Enum). */
export const PARSER_BLOCK_REGEX = new RegExp(BLOCK_START_PATTERN, 'i');
/** Regex for parsing Dim statements. */
export const PARSER_DIM_REGEX = new RegExp(DIM_PATTERN, 'i');
/** Regex for parsing Const statements. */
export const PARSER_CONST_REGEX = new RegExp(CONST_PATTERN, 'i');
/** Regex for parsing fields (module-level variables). */
export const PARSER_FIELD_REGEX = new RegExp(FIELD_PATTERN, 'i');

// For Validation (Line by Line)

/** Regex for validating the start of a block. */
export const VAL_BLOCK_START_REGEX = new RegExp(
    `^\\s*(?:(?:${MODIFIER_PATTERN})\\s+)?(Sub|Function|Class|Module|Property|Structure|Interface|Enum)\\b`,
    'i'
);
/** Regex for validating the start of an If statement. */
export const VAL_IF_START_REGEX = /^\s*If\b/i;
/** Regex for validating the start of a For loop. */
export const VAL_FOR_START_REGEX = /^\s*For\b/i;
/** Regex for validating the start of a Select Case block. */
export const VAL_SELECT_CASE_START_REGEX = /^\s*Select\s+Case\b/i;
/** Regex for validating the start of a Do loop. */
export const VAL_DO_START_REGEX = /^\s*Do\b/i;
/** Regex for validating the start of a While loop. */
export const VAL_WHILE_START_REGEX = /^\s*While\b/i;

/** Regex for validating the end of a block (End Sub, End If, etc.). */
export const VAL_BLOCK_END_REGEX = /^\s*End\s+(Sub|Function|Class|Module|Property|If|Select|Structure|Interface|Enum)\b/i;
/** Regex for validating Next statement. */
export const VAL_NEXT_REGEX = /^\s*Next\b/i;
/** Regex for validating Loop statement. */
export const VAL_LOOP_REGEX = /^\s*Loop\b/i;
/** Regex for validating Wend statement. */
export const VAL_WEND_REGEX = /^\s*Wend\b/i;

/** Regex for detecting Dim statements without an 'As' clause. */
export const VAL_DIM_REGEX = /^\s*Dim\s+\w+\s*$/i; // Detect Dim x (without As)
/** Regex for detecting Const statements, optionally checking for value assignment. */
export const VAL_CONST_REGEX = new RegExp(
    `^\\s*(?:(${MODIFIER_PATTERN})\\s+)?Const\\s+(\\w+)(?:\\s+As\\s+(\\w+))?\\s*(?:'.*)?$`,
    'i'
);
/** Regex for detecting Return statements. */
export const VAL_RETURN_REGEX = /^\s*Return\b/i;
/** Regex for detecting Exit statements. Group 1: Sub|Function|... */
export const VAL_EXIT_REGEX = /^\s*Exit\s+(Sub|Function|Property|Do|For|Select|While)\b/i;

/** Regex for identifying an If statement line. */
export const VAL_IF_LINE_REGEX = /^\s*If\s+.*$/i;
/** Regex for identifying the 'Then' keyword. */
export const VAL_THEN_REGEX = /\bThen\b/i;

// For Formatting (Additional)

/** Regex for identifying an If...Then start line for formatting. */
export const FMT_IF_THEN_START_REGEX = /^\s*If\b.*\bThen\s*(?:'.*)?$/i;
/** Regex for identifying Else or ElseIf statements. */
export const FMT_ELSE_REGEX = /^\s*Else(?:If)?\b/i;
/** Regex for identifying Case statements. */
export const FMT_CASE_REGEX = /^\s*Case\b/i;

// For Folding

/** Regex for identifying block ends for folding. */
export const FOLD_BLOCK_END_REGEX = /^\s*End\s+(Sub|Function|If|Class|Module|Structure|Interface|Enum)\b/i;
/** Regex for identifying Next for folding. */
export const FOLD_NEXT_REGEX = /^\s*Next(\s+|$)/i;
/** Regex for identifying Wend for folding. */
export const FOLD_WEND_REGEX = /^\s*Wend(\s+|$)/i;
/** Regex for identifying Loop for folding. */
export const FOLD_LOOP_REGEX = /^\s*Loop(\s+|$)/i;
/** Regex for identifying block starts for folding. */
export const FOLD_BLOCK_START_REGEX = new RegExp(
    `^(?:(?:${MODIFIER_PATTERN})\\s+)?(Sub|Function|Class|Module|Structure|Interface|Enum)\\b`,
    'i'
);
/** Regex for identifying If...Then starts for folding. */
export const FOLD_IF_START_REGEX = /^\s*If\b.*?\bThen\s*$/i;
/** Regex for identifying For loops for folding. */
export const FOLD_FOR_START_REGEX = /^\s*For\b/i;
/** Regex for identifying While loops for folding. */
export const FOLD_WHILE_START_REGEX = /^\s*While\b/i;
/** Regex for identifying Do loops for folding. */
export const FOLD_DO_START_REGEX = /^\s*Do\b/i;
