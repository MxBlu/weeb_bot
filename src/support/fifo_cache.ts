// Derived from https://stackoverflow.com/a/46432113/13336913
export class FIFOCache<K, V> extends Map<K, V>  {
  // Number of elements the cache can hold
  max: number;

  constructor(max = 10) {
    super()
    this.max = max;
  }
  
  public override set(key: K, val: V): this {
    if (this.has(key)) {
      // refresh key
      this.delete(key);
    } else if (this.size == this.max) {
      // Cache full, remove oldest
      this.delete(this.first());
    }
    return super.set(key, val);
  }

  public first(): K {
    return this.keys().next().value;
  }
}