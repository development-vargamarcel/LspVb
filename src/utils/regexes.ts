
// Access Modifiers
export const MODIFIER_PATTERN = '(?:Public|Private|Friend|Protected)';

// Patterns
const BLOCK_START_PATTERN = `^\\s*(?:(${MODIFIER_PATTERN})\\s+)?(Sub|Function|Class|Module|Property)\\s+(\\w+)`;
const DIM_PATTERN = `^\\s*Dim\\s+(\\w+)(?:\\s+As\\s+(\\w+))?`;
const CONST_PATTERN = `^\\s*(?:(${MODIFIER_PATTERN})\\s+)?Const\\s+(\\w+)(?:\\s+As\\s+(\\w+))?`;
const FIELD_PATTERN = `^\\s*(${MODIFIER_PATTERN})\\s+(\\w+)(?:\\s+As\\s+(\\w+))?`;

// For Parser (Global + Multiline + Case Insensitive)
export const PARSER_BLOCK_REGEX = new RegExp(BLOCK_START_PATTERN, 'i');
export const PARSER_DIM_REGEX = new RegExp(DIM_PATTERN, 'i');
export const PARSER_CONST_REGEX = new RegExp(CONST_PATTERN, 'i');
export const PARSER_FIELD_REGEX = new RegExp(FIELD_PATTERN, 'i');

// For Validation (Line by Line)
export const VAL_BLOCK_START_REGEX = new RegExp(`^\\s*(?:(?:${MODIFIER_PATTERN})\\s+)?(Sub|Function|Class|Module|Property)\\b`, 'i');
export const VAL_IF_START_REGEX = /^\s*If\b/i;
export const VAL_FOR_START_REGEX = /^\s*For\b/i;
export const VAL_SELECT_CASE_START_REGEX = /^\s*Select\s+Case\b/i;
export const VAL_DO_START_REGEX = /^\s*Do\b/i;
export const VAL_WHILE_START_REGEX = /^\s*While\b/i;

export const VAL_BLOCK_END_REGEX = /^\s*End\s+(Sub|Function|Class|Module|Property|If|Select)\b/i;
export const VAL_NEXT_REGEX = /^\s*Next\b/i;
export const VAL_LOOP_REGEX = /^\s*Loop\b/i;
export const VAL_WEND_REGEX = /^\s*Wend\b/i;

export const VAL_DIM_REGEX = /^\s*Dim\s+\w+\s*$/i; // Detect Dim x (without As)
export const VAL_CONST_REGEX = new RegExp(`^\\s*(?:(${MODIFIER_PATTERN})\\s+)?Const\\s+(\\w+)(?:\\s+As\\s+(\\w+))?\\s*(?:'.*)?$`, 'i');

export const VAL_IF_LINE_REGEX = /^\s*If\s+.*$/i;
export const VAL_THEN_REGEX = /\bThen\b/i;

// For Formatting (Additional)
export const FMT_IF_THEN_START_REGEX = /^\s*If\b.*\bThen\s*(?:'.*)?$/i;
export const FMT_ELSE_REGEX = /^\s*Else(?:If)?\b/i;
export const FMT_CASE_REGEX = /^\s*Case\b/i;

// For Folding
export const FOLD_BLOCK_END_REGEX = /^\s*End\s+(Sub|Function|If|Class|Module)\b/i;
export const FOLD_NEXT_REGEX = /^\s*Next(\s+|$)/i;
export const FOLD_WEND_REGEX = /^\s*Wend(\s+|$)/i;
export const FOLD_LOOP_REGEX = /^\s*Loop(\s+|$)/i;
export const FOLD_BLOCK_START_REGEX = new RegExp(`^(?:(?:${MODIFIER_PATTERN})\\s+)?(Sub|Function|Class|Module)\\b`, 'i');
export const FOLD_IF_START_REGEX = /^\s*If\b.*?\bThen\s*$/i;
export const FOLD_FOR_START_REGEX = /^\s*For\b/i;
export const FOLD_WHILE_START_REGEX = /^\s*While\b/i;
export const FOLD_DO_START_REGEX = /^\s*Do\b/i;
