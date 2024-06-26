import { Format } from './format.js'
import { Has } from './has.js'

/**
 * The loosed and most flexibly magical matching strategy.
 *
 * - If the objects pass the {@link tcompare!has.Has} test, then return true.
 * - If the pattern is a regular expression, then test it against the
 *   string form of the test value.
 * - If the pattern is a string, and the test value is a string, then test
 *   that the pattern appears somewhere in the test value.
 * - If the pattern is a string, and the test value is a Date, then test
 *   parse the pattern as a Date and verify that they have the same value
 * - If the pattern is a constructor, then test that the value is an
 *   instance of the constructor. In the case of scalar constructors, like
 *   Number, Boolean, etc, also pass if the `typeof` the value matches.
 *   That is `Match(1, { expect: Number })` passes.
 * - If the pattern is the `Array` constructor, then pass for any iterable
 *   valuef.
 */

export class Match extends Has {
  test(): boolean | 'COMPLEX' {
    const obj = this.object
    const pattern = this.expect

    return (
      super.test() === true ? true
        // failures that would also fail in the super class
        // but if they didn't pass, then should fail here, too
      : pattern == null || obj == null ? false
      : pattern instanceof RegExp && obj instanceof RegExp ? false
      : Buffer.isBuffer(obj) && Buffer.isBuffer(pattern) ? false
      : typeof pattern === 'symbol' ? false
        // ok, Match-specific stuff
      : pattern instanceof RegExp ? pattern.test('' + obj)
      : (
        typeof obj === 'string' &&
        typeof pattern === 'string' &&
        pattern
      ) ?
        obj.indexOf(pattern) !== -1
      : obj instanceof Date && typeof pattern === 'string' ?
        obj.getTime() === new Date(pattern).getTime()
      : pattern === BigInt ? typeof obj === 'bigint'
      : pattern === Buffer ? Buffer.isBuffer(obj)
      : pattern === Function ? typeof obj === 'function'
      : pattern === Number ?
        typeof obj === 'number' && obj === obj && isFinite(obj)
      : pattern === String ? typeof obj === 'string'
      : pattern === Symbol ? typeof obj === 'symbol'
      : pattern === Boolean ? typeof obj === 'boolean'
      : pattern === Map ? this.isMap()
      : pattern === Set ? this.isSet()
      : pattern === Object ? obj && typeof obj === 'object'
      : pattern === Array ? new Format(obj).isArray()
      : !this.isError() && pattern instanceof Error ? false
      : (
        this.isError() &&
        ((pattern.message &&
          !new Match(obj.message, {
            expect: pattern.message,
          }).test()) ||
          (pattern.name &&
            !new Match(obj.name, {
              expect: pattern.name,
            }).test()))
      ) ?
        false
        // standard deep matching stuff, same as parent, but not simple.
      : this.isSet() && !(pattern instanceof Set) ? false
      : this.isMap() && !(pattern instanceof Map) ? false
      : typeof pattern === 'function' && typeof obj === 'object' ?
        obj instanceof pattern
      : typeof obj !== 'object' || typeof pattern !== 'object' ? false
      : 'COMPLEX'
    )
  }
}
