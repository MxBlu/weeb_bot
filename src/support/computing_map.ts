// A super simple map that can compute missing values

type FutureValueFunction<K, V> = (key: K) => Promise<V>;

export class FutureComputingMap<K, V> extends Map {

  // Function to compute missing values
  computeFunction: FutureValueFunction<K, V>;

  public constructor(computeFunction: FutureValueFunction<K, V>) {
    super();
    this.computeFunction = computeFunction;
  }

  public override async get(key: K): Promise<V> {
    // Attempt to get value from map
    let val = super.get(key);
    // If not present, compute then store
    if (val == null) {
      val = await this.computeFunction(key);
      super.set(key, val);
    }

    return val;
  }
}
