export type NavigationCandidate = { readonly key: number; readonly score: number };

export class NavigationQueue {
  private readonly values: NavigationCandidate[] = [];

  get length(): number {
    return this.values.length;
  }

  push(value: NavigationCandidate): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const parentValue = this.values[parent];
      if (!parentValue || parentValue.score <= value.score) break;
      this.values[index] = parentValue;
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): NavigationCandidate | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;
    let index = 0;
    this.values[0] = last;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if ((this.values[left]?.score ?? Infinity) < (this.values[smallest]?.score ?? Infinity)) {
        smallest = left;
      }
      if ((this.values[right]?.score ?? Infinity) < (this.values[smallest]?.score ?? Infinity)) {
        smallest = right;
      }
      if (smallest === index) break;
      const swap = this.values[smallest];
      if (!swap) break;
      this.values[index] = swap;
      this.values[smallest] = last;
      index = smallest;
    }
    return first;
  }
}
