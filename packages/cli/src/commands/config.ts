import type { Command } from 'commander';
import chalk from 'chalk';
import { readConfig, writeConfig } from '../lib/config.js';

export function registerConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('Manage CLI configuration');

  config
    .command('set-url <url>')
    .description('Set the Babylon API base URL')
    .action(async (url: string) => {
      await writeConfig({ apiUrl: url });
      console.log(chalk.green(`API URL set to: ${url}`));
    });

  config
    .command('set-pin <pin>')
    .description('Set the Babylon PIN for authentication')
    .action(async (pin: string) => {
      await writeConfig({ pin });
      console.log(chalk.green('PIN saved.'));
    });

  config
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const cfg = await readConfig();
      console.log(chalk.bold('Current config:'));
      console.log(`  apiUrl: ${chalk.cyan(cfg.apiUrl)}`);
      console.log(`  pin:    ${cfg.pin ? chalk.yellow('(set)') : chalk.dim('(not set)')}`);
      console.log(chalk.dim(`  config file: ~/.babylon/config.json`));
    });
}
