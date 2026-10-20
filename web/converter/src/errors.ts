export interface Loc {
  file: string;
  line: number;
  column: number;
}

export class ConversionError extends Error {
  constructor(
    readonly loc: Loc | null,
    readonly reason: string,
  ) {
    super(loc ? `${loc.file}:${loc.line}:${loc.column}: ${reason}` : reason);
    this.name = 'ConversionError';
  }
}
