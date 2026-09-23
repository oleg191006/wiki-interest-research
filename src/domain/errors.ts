export const ExitCode = {
  Ok: 0,
  Usage: 1, // wrong arguments or input the caller can fix
  Environment: 2, // Node or dependencies missing
  DataSource: 3, // a source failed, or data is not cached in offline mode
} as const;

export class SkillError extends Error {
  readonly hint?: string;
  readonly exitCode: number;

  constructor(message: string, hint: string | undefined, exitCode: number) {
    super(message);
    this.name = new.target.name;
    this.hint = hint;
    this.exitCode = exitCode;
  }
}

export class InputError extends SkillError {
  constructor(message: string, hint?: string) {
    super(message, hint, ExitCode.Usage);
  }
}

export class SourceError extends SkillError {
  constructor(message: string, hint?: string) {
    super(message, hint, ExitCode.DataSource);
  }
}
