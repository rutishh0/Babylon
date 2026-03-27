#!/usr/bin/env node
import { Command } from 'commander';
import { registerConfigCommands } from './commands/config.js';
import { registerUploadCommand } from './commands/upload.js';
import { registerLibraryCommands } from './commands/library.js';
import { registerIngestCommands } from './commands/ingest.js';

const program = new Command();

program
  .name('babylon')
  .description('Babylon — personal streaming platform CLI')
  .version('0.1.0');

registerConfigCommands(program);
registerUploadCommand(program);
registerLibraryCommands(program);
registerIngestCommands(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error((err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
