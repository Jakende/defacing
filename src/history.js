export class History {
  constructor(initial, limit = 100) { this.limit = limit; this.reset(initial); }
  reset(value) { this.entries = [structuredClone(value)]; this.index = 0; }
  push(value) {
    if (JSON.stringify(value) === JSON.stringify(this.entries[this.index])) return;
    this.entries.splice(this.index + 1);
    this.entries.push(structuredClone(value));
    if (this.entries.length > this.limit) this.entries.shift();
    this.index = this.entries.length - 1;
  }
  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.entries.length - 1; }
  undo() { if (this.canUndo) this.index--; return structuredClone(this.entries[this.index]); }
  redo() { if (this.canRedo) this.index++; return structuredClone(this.entries[this.index]); }
}
