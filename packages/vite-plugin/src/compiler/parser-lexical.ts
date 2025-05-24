type ImportBinding = [name: string, alias?: string];

enum TokenType {
  Import = 'import',
  Identifier = 'identifier',
  String = 'string',
  LeftBrace = '{',
  RightBrace = '}',
  Comma = ',',
  Star = '*',
  As = 'as',
  From = 'from',
  Default = 'default',
  Whitespace = 'whitespace',
  EOF = 'eof',
}

interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

/**
 * Lexical analyzer for tokenizing import statements
 */
class ImportLexer {
  private input: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    // Remove comments while preserving position information
    this.input = this.removeComments(input);
  }

  /**
   * Removes comments from input while preserving string content
   */
  private removeComments(input: string): string {
    return input
      .replace(/\/\*[\s\S]*?\*\//g, ' ') // Block comments
      .replace(/\/\/.*$/gm, ' '); // Line comments
  }

  /**
   * Peeks at character at current position plus offset
   */
  private peek(offset: number = 0): string {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : '';
  }

  /**
   * Advances position and returns current character
   */
  private advance(): string {
    return this.input[this.position++] || '';
  }

  /**
   * Skips whitespace characters
   */
  private skipWhitespace(): void {
    while (/\s/.test(this.peek())) {
      this.advance();
    }
  }

  /**
   * Reads identifier including Unicode characters
   */
  private readIdentifier(): string {
    const start = this.position;
    // Support Unicode identifiers including Chinese, Greek letters, etc.
    while (/[\p{L}\p{N}_$]/u.test(this.peek())) {
      this.advance();
    }
    return this.input.slice(start, this.position);
  }

  /**
   * Reads string literal handling escape sequences
   */
  private readString(): string {
    const quote = this.advance(); // Skip opening quote
    const start = this.position;

    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance(); // Skip escape character
      }
      this.advance();
    }

    const value = this.input.slice(start, this.position);
    this.advance(); // Skip closing quote
    return value;
  }

  /**
   * Tokenizes the input string into an array of tokens
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) break;

      const start = this.position;
      const char = this.peek();

      if (char === '{') {
        this.advance();
        this.tokens.push({
          type: TokenType.LeftBrace,
          value: '{',
          start,
          end: this.position,
        });
      } else if (char === '}') {
        this.advance();
        this.tokens.push({
          type: TokenType.RightBrace,
          value: '}',
          start,
          end: this.position,
        });
      } else if (char === ',') {
        this.advance();
        this.tokens.push({
          type: TokenType.Comma,
          value: ',',
          start,
          end: this.position,
        });
      } else if (char === '*') {
        this.advance();
        this.tokens.push({
          type: TokenType.Star,
          value: '*',
          start,
          end: this.position,
        });
      } else if (char === '"' || char === "'") {
        const value = this.readString();
        this.tokens.push({
          type: TokenType.String,
          value,
          start,
          end: this.position,
        });
      } else if (/[\p{L}_$]/u.test(char)) {
        const value = this.readIdentifier();
        let type: TokenType;

        switch (value) {
          case 'import':
            type = TokenType.Import;
            break;
          case 'as':
            type = TokenType.As;
            break;
          case 'from':
            type = TokenType.From;
            break;
          case 'default':
            type = TokenType.Default;
            break;
          default:
            type = TokenType.Identifier;
            break;
        }

        this.tokens.push({ type, value, start, end: this.position });
      } else {
        // Skip unknown characters
        this.advance();
      }
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      start: this.position,
      end: this.position,
    });
    return this.tokens;
  }
}

/**
 * Parser for analyzing tokenized import statements
 */
class ImportBindingParser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Peeks at token at current position plus offset
   */
  private peek(offset: number = 0): Token | null {
    const pos = this.position + offset;
    return pos < this.tokens.length ? this.tokens[pos] : null;
  }

  /**
   * Advances position and returns current token
   */
  private advance(): Token | null {
    return this.position < this.tokens.length
      ? this.tokens[this.position++]
      : null;
  }

  /**
   * Expects specific token type and advances if found
   */
  private expect(type: TokenType): Token | null {
    const token = this.peek();
    if (token && token.type === type) {
      return this.advance();
    }
    return null;
  }

  /**
   * Parses tokens into import bindings
   */
  parse(): ImportBinding[] {
    const bindings: ImportBinding[] = [];

    // Expect import keyword
    if (!this.expect(TokenType.Import)) {
      return bindings;
    }

    // Parse default and namespace imports
    this.parseDefaultAndNamespaceBindings(bindings);

    // Parse named imports
    if (this.peek()?.type === TokenType.LeftBrace) {
      this.parseNamedBindings(bindings);
    }

    return bindings;
  }

  /**
   * Parses default and namespace import bindings
   */
  private parseDefaultAndNamespaceBindings(bindings: ImportBinding[]): void {
    const token = this.peek();

    if (token?.type === TokenType.Identifier) {
      // Default import binding
      const defaultImport = this.advance()!;
      bindings.push(['default', defaultImport.value]);

      // Check for comma (indicating named imports follow)
      if (this.peek()?.type === TokenType.Comma) {
        this.advance(); // Skip comma
      }
    }

    // Namespace import binding
    if (this.peek()?.type === TokenType.Star) {
      this.advance(); // Skip *

      if (this.expect(TokenType.As)) {
        const alias = this.expect(TokenType.Identifier);
        if (alias) {
          bindings.push(['*', alias.value]);
        }
      }
    }
  }

  /**
   * Parses named import bindings within braces
   */
  private parseNamedBindings(bindings: ImportBinding[]): void {
    this.expect(TokenType.LeftBrace); // Skip {

    while (
      this.peek()?.type !== TokenType.RightBrace &&
      this.peek()?.type !== TokenType.EOF
    ) {
      // Handle import names: can be Identifier, Default, or As (when 'as' is used as import name)
      const nameToken = this.peek();
      if (
        nameToken?.type === TokenType.Identifier ||
        nameToken?.type === TokenType.Default ||
        nameToken?.type === TokenType.As
      ) {
        this.advance();
      } else {
        break;
      }

      let alias: string | undefined;

      // Check for 'as' keyword followed by any token that can be an alias
      if (this.peek()?.type === TokenType.As) {
        this.advance(); // Skip 'as'
        const aliasToken = this.peek();
        if (
          aliasToken?.type === TokenType.Identifier ||
          aliasToken?.type === TokenType.As ||
          aliasToken?.type === TokenType.Default
        ) {
          this.advance();
          alias = aliasToken.value;
        }
      }

      bindings.push(alias ? [nameToken.value, alias] : [nameToken.value]);

      // Skip possible comma
      if (this.peek()?.type === TokenType.Comma) {
        this.advance();
      }
    }

    this.expect(TokenType.RightBrace); // Skip }
  }
}

/**
 * Extracts all import bindings from an import statement using lexical analysis.
 * Provides more robust parsing compared to regex-based approaches.
 *
 * @param importStatement - The import statement to parse
 * @returns Array of import bindings as [originalName, alias?] tuples
 *
 * @example
 * ```typescript
 * extractImportBindingsLexical('import { html, css as litCss } from "lit"')
 * // => [['html'], ['css', 'litCss']]
 *
 * extractImportBindingsLexical('import React from "react"')
 * // => [['default', 'React']]
 * ```
 */
export function extractImportBindingsLexical(
  importStatement: string
): ImportBinding[] {
  try {
    const lexer = new ImportLexer(importStatement);
    const tokens = lexer.tokenize();
    const parser = new ImportBindingParser(tokens);
    return parser.parse();
  } catch (error) {
    // Fallback handling for parsing errors
    console.warn('Lexical analysis failed, fallback handling:', error);
    return [];
  }
}
