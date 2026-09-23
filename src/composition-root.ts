import { CliApp } from "./cli/cli-app.ts";
import type { Command, Output } from "./cli/command.ts";
import { DoctorCommand } from "./cli/commands/doctor-command.ts";
import { usage } from "./cli/usage.ts";
import { FixedClock, SystemClock, type Clock } from "./domain/clock.ts";
import type { Settings } from "./settings.ts";

export function createCli(settings: Settings, output: Output): CliApp {
  const clock: Clock = settings.fixedToday
    ? new FixedClock(settings.fixedToday)
    : new SystemClock();
  return new CliApp({
    usage: usage(settings),
    launcher: settings.launcher,
    output,
    commands: buildCommands(settings, output, clock),
  });
}

function buildCommands(settings: Settings, output: Output, _clock: Clock): Command[] {
  return [new DoctorCommand(settings, output)];
}
