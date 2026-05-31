/**
 * WildcardMatcher compiles and caches wildcard permissions into regular expressions.
 * It ensures optimized evaluation of patterns like 'patient.*' or '*' without recompilation overhead.
 */
export class WildcardMatcher {
  private readonly cache = new Map<string, RegExp>();

  /**
   * Checks if a target permission matches a granted permission pattern.
   * If the pattern does not contain '*', it does a simple equality check.
   *
   * @param pattern The permission pattern (e.g. "patient.*", "*", "user.create")
   * @param target The target permission being checked (e.g. "patient.create")
   * @returns true if the target matches the pattern, false otherwise
   */
  public match(pattern: string, target: string): boolean {
    if (pattern === target) {
      return true;
    }

    if (!pattern.includes('*')) {
      return false;
    }

    const regex = this.getOrCompile(pattern);
    return regex.test(target);
  }

  /**
   * Retrieves a compiled RegExp from cache or compiles and caches a new one.
   *
   * @param pattern The wildcard pattern containing '*'
   * @returns The compiled RegExp
   */
  private getOrCompile(pattern: string): RegExp {
    let cached = this.cache.get(pattern);
    if (!cached) {
      cached = this.compile(pattern);
      this.cache.set(pattern, cached);
    }
    return cached;
  }

  /**
   * Compiles a wildcard permission string to a RegExp.
   * Escapes standard RegExp characters and translates '*' to '.*'.
   */
  private compile(pattern: string): RegExp {
    // Escape all special regex characters except '*'
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Replace '*' with '.*' to match any characters in that segment/suffix
    const regexStr = `^${escaped.replace(/\*/g, '.*')}$`;
    return new RegExp(regexStr);
  }
}
