import { describe, it, expect } from 'vitest'
import { parseCommand, ParseError } from '../src/commands/parser'

describe('parser — prefixes (PLAN §7: \\, /, bare)', () => {
  it('accepts the canonical backslash prefix', () => {
    const cmd = parseCommand('\\insert star')
    expect(cmd.prefix).toBe('backslash')
    expect(cmd.verb).toBe('insert')
    expect(cmd.args).toEqual(['star'])
  })
  it('accepts the slash prefix', () => {
    expect(parseCommand('/play').prefix).toBe('slash')
  })
  it('accepts the bare prefix', () => {
    const cmd = parseCommand('list')
    expect(cmd.prefix).toBe('bare')
    expect(cmd.verb).toBe('list')
  })
})

describe('parser — unit suffixes', () => {
  it('parses number + unit (10Msun)', () => {
    const cmd = parseCommand('\\insert blackhole mass=10Msun')
    expect(cmd.args).toEqual(['blackhole'])
    expect(cmd.params.mass).toEqual({ kind: 'scalar', value: 10, unit: 'Msun' })
  })
  it('parses 1AU', () => {
    expect(parseCommand('\\x a=1AU').params.a).toEqual({
      kind: 'scalar',
      value: 1,
      unit: 'AU',
    })
  })
  it('parses a unit containing a slash (5km/s)', () => {
    expect(parseCommand('\\x v=5km/s').params.v).toEqual({
      kind: 'scalar',
      value: 5,
      unit: 'km/s',
    })
  })
  it('parses a dimensionless value (no unit)', () => {
    expect(parseCommand('\\x e=0.0167').params.e).toEqual({
      kind: 'scalar',
      value: 0.0167,
    })
  })
  it('parses negative and exponent forms', () => {
    expect(parseCommand('\\x k=-1.5e3').params.k).toEqual({
      kind: 'scalar',
      value: -1500,
    })
  })
  it('accepts non-enum unit suffixes for the higher layer (1Me)', () => {
    expect(parseCommand('\\insert planet mass=1Me').params.mass).toEqual({
      kind: 'scalar',
      value: 1,
      unit: 'Me',
    })
  })
})

describe('parser — tuples', () => {
  it('parses a plain tuple', () => {
    expect(parseCommand('\\x pos=(1,0,0)').params.pos).toEqual({
      kind: 'tuple',
      items: [{ value: 1 }, { value: 0 }, { value: 0 }],
    })
  })
  it('tolerates spaces inside a tuple', () => {
    expect(parseCommand('\\x vel=(0, 6.28, 0)').params.vel).toEqual({
      kind: 'tuple',
      items: [{ value: 0 }, { value: 6.28 }, { value: 0 }],
    })
  })
  it('parses tuple elements with units', () => {
    expect(parseCommand('\\x pos=(1AU,0AU,0AU)').params.pos).toEqual({
      kind: 'tuple',
      items: [
        { value: 1, unit: 'AU' },
        { value: 0, unit: 'AU' },
        { value: 0, unit: 'AU' },
      ],
    })
  })
})

describe('parser — words and positionals', () => {
  it('parses a word value', () => {
    expect(parseCommand('\\insert planet around=sun').params.around).toEqual({
      kind: 'word',
      text: 'sun',
    })
  })
  it('collects multiple positional args', () => {
    expect(parseCommand('\\rename sun mystar').args).toEqual(['sun', 'mystar'])
  })
  it('keeps a numeric positional raw', () => {
    expect(parseCommand('\\timescale 1e6').args).toEqual(['1e6'])
  })
  it('parses a full orbital-insert command', () => {
    const cmd = parseCommand('\\insert planet mass=1Me a=1AU e=0.0167 around=sun')
    expect(cmd.verb).toBe('insert')
    expect(cmd.args).toEqual(['planet'])
    expect(Object.keys(cmd.params).sort()).toEqual(['a', 'around', 'e', 'mass'])
  })
})

describe('parser — errors name the bad token', () => {
  it('rejects empty input', () => {
    expect(() => parseCommand('   ')).toThrow(ParseError)
  })
  it('rejects a bare prefix with no verb', () => {
    expect(() => parseCommand('\\')).toThrow(/verb/)
  })
  it('rejects an invalid verb', () => {
    expect(() => parseCommand('\\3play')).toThrow(/3play/)
  })
  it('rejects an unterminated tuple', () => {
    expect(() => parseCommand('\\x pos=(1,0')).toThrow(/tuple/)
  })
  it('rejects a non-numeric tuple element', () => {
    expect(() => parseCommand('\\x pos=(1,foo,0)')).toThrow(/foo/)
  })
  it('rejects a missing value', () => {
    expect(() => parseCommand('\\set sun mass=')).toThrow(/mass/)
  })
  it('rejects a missing key before =', () => {
    expect(() => parseCommand('\\x =5')).toThrow(ParseError)
  })
  it('rejects a duplicate key', () => {
    expect(() => parseCommand('\\set sun mass=1Msun mass=2Msun')).toThrow(
      /duplicate/,
    )
  })
})
