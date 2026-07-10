// Command parser — PLAN §7 grammar, §8 0.6.
// Tokenizes `\verb target key=value key=(a,b,c) ...` into a generic
// ParsedCommand AST. This layer is SYNTAX ONLY: it does not know the set of
// legal verbs (that is the verb registry) nor the set of legal units (that is
// the Quantity boundary / zod schema). Unit suffixes are therefore captured as
// raw strings, so forms the higher layer understands — e.g. `mass=1Me`,
// `1M⊕`, `1R☉` — tokenize cleanly here and are validated later.

// Thrown on malformed input. Messages name the offending token (PLAN §8 0.6:
// "clear error messages for bad input").
export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}

export interface Scalar {
  value: number
  unit?: string
}

export type ParsedValue =
  | { kind: 'scalar'; value: number; unit?: string }
  | { kind: 'tuple'; items: Scalar[] }
  | { kind: 'word'; text: string }

// `\` is canonical; `/verb` and bare `verb` are also accepted (PLAN §7).
export type CommandPrefix = 'backslash' | 'slash' | 'bare'

export interface ParsedCommand {
  prefix: CommandPrefix
  verb: string
  args: string[] // positional targets, kept raw (e.g. type name, id, "1e6")
  params: Record<string, ParsedValue> // key=value pairs
}

// Leading number of a token: optional sign, int/decimal, optional exponent.
const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/

// Parse a token as a number with an optional unit suffix. Returns null if the
// token does not start with a number (i.e. it is a word).
function parseScalar(token: string): Scalar | null {
  const match = NUMBER_RE.exec(token)
  if (!match || match[0].length === 0) return null
  const value = Number(match[0])
  if (!Number.isFinite(value)) return null
  const unit = token.slice(match[0].length)
  return unit.length > 0 ? { value, unit } : { value }
}

function parseValue(raw: string): ParsedValue {
  const token = raw.trim()
  if (token.startsWith('(')) {
    if (!token.endsWith(')')) {
      throw new ParseError(`unterminated tuple: '${raw}'`)
    }
    const inner = token.slice(1, -1).trim()
    if (inner.length === 0) throw new ParseError(`empty tuple: '${raw}'`)
    const items = inner.split(',').map((part) => {
      const scalar = parseScalar(part.trim())
      if (!scalar) {
        throw new ParseError(`expected a number in tuple, got '${part.trim()}'`)
      }
      return scalar
    })
    return { kind: 'tuple', items }
  }
  const scalar = parseScalar(token)
  if (scalar) {
    return scalar.unit !== undefined
      ? { kind: 'scalar', value: scalar.value, unit: scalar.unit }
      : { kind: 'scalar', value: scalar.value }
  }
  return { kind: 'word', text: token }
}

// Split on whitespace, but keep parenthesised tuples (which may contain spaces
// and commas) as a single token.
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let depth = 0
  for (const ch of input) {
    if (ch === '(') {
      depth++
      current += ch
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1)
      current += ch
    } else if (/\s/.test(ch) && depth === 0) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current.length > 0) tokens.push(current)
  return tokens
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim()
  if (trimmed.length === 0) throw new ParseError('empty command')

  let prefix: CommandPrefix = 'bare'
  let rest = trimmed
  if (trimmed[0] === '\\') {
    prefix = 'backslash'
    rest = trimmed.slice(1)
  } else if (trimmed[0] === '/') {
    prefix = 'slash'
    rest = trimmed.slice(1)
  }

  const tokens = tokenize(rest)
  if (tokens.length === 0) throw new ParseError('missing command verb')

  const verb = tokens[0]
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(verb)) {
    throw new ParseError(`invalid verb '${verb}'`)
  }

  const args: string[] = []
  const params: Record<string, ParsedValue> = {}
  for (const token of tokens.slice(1)) {
    const eq = token.indexOf('=')
    if (eq === -1) {
      args.push(token)
      continue
    }
    const key = token.slice(0, eq)
    const valueText = token.slice(eq + 1)
    if (key.length === 0) {
      throw new ParseError(`missing key before '=' in '${token}'`)
    }
    if (valueText.length === 0) {
      throw new ParseError(`missing value for key '${key}'`)
    }
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      throw new ParseError(`duplicate key '${key}'`)
    }
    params[key] = parseValue(valueText)
  }

  return { prefix, verb, args, params }
}
