import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  getIngestStatus,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  triggerIngest,
} from '../lib/api.js';
import type { IngestStatus, WatchlistEntry } from '@babylon/shared';

export function registerIngestCommands(program: Command): void {
  const ingest = program
    .command('ingest')
    .description('Manage the ingest daemon');

  // ── status ────────────────────────────────────────────────────────────────
  ingest
    .command('status')
    .description('Show current ingest daemon status')
    .action(async () => {
      const spinner = ora('Fetching ingest status...').start();
      try {
        const status = await getIngestStatus();
        spinner.stop();
        printIngestStatus(status);
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  // ── watchlist ─────────────────────────────────────────────────────────────
  ingest
    .command('watchlist')
    .description('List all shows on the ingest watchlist')
    .action(async () => {
      const spinner = ora('Fetching watchlist...').start();
      try {
        const entries = await getWatchlist();
        spinner.stop();
        printWatchlist(entries);
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  // ── add ───────────────────────────────────────────────────────────────────
  ingest
    .command('add <title>')
    .description('Add a show to the ingest watchlist')
    .option('--alias <alias>', 'Alternative search title (can repeat)', (v, acc: string[]) => [...acc, v], [] as string[])
    .option('--season <n>', 'Season number to monitor', '1')
    .action(async (title: string, opts: { alias?: string[]; season?: string }) => {
      const spinner = ora(`Adding "${title}" to watchlist...`).start();
      try {
        await addToWatchlist({
          title,
          aliases: opts.alias ?? [],
          season: parseInt(opts.season ?? '1', 10),
        });
        spinner.succeed(chalk.green(`Added "${title}" to watchlist.`));
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  // ── remove ────────────────────────────────────────────────────────────────
  ingest
    .command('remove <title>')
    .description('Remove a show from the ingest watchlist')
    .action(async (title: string) => {
      const spinner = ora(`Removing "${title}" from watchlist...`).start();
      try {
        await removeFromWatchlist(title);
        spinner.succeed(chalk.green(`Removed "${title}" from watchlist.`));
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  // ── trigger ───────────────────────────────────────────────────────────────
  ingest
    .command('trigger')
    .description('Force an immediate ingest poll cycle')
    .action(async () => {
      const spinner = ora('Triggering poll cycle...').start();
      try {
        await triggerIngest();
        spinner.succeed(chalk.green('Poll cycle triggered. Check `babylon ingest status` for progress.'));
      } catch (err) {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });
}

// ── Display helpers ───────────────────────────────────────────────────────────

function printIngestStatus(status: IngestStatus): void {
  const runningLabel = status.running
    ? chalk.green('RUNNING')
    : chalk.dim('STOPPED');

  console.log();
  console.log(`Daemon:      ${runningLabel}`);
  console.log(`Last poll:   ${status.lastPollAt ? new Date(status.lastPollAt).toLocaleString() : chalk.dim('never')}`);

  if (status.currentTask) {
    const t = status.currentTask;
    const stateColor =
      t.state === 'done'
        ? chalk.green
        : t.state === 'downloading'
        ? chalk.cyan
        : t.state === 'transcoding'
        ? chalk.magenta
        : t.state === 'uploading'
        ? chalk.yellow
        : chalk.white;
    console.log();
    console.log(chalk.bold('Current task:'));
    console.log(`  ${chalk.bold(t.title)}`);
    console.log(`  State:    ${stateColor(t.state)}`);
    console.log(`  Progress: ${renderProgress(t.progress)}`);
  }

  if (status.queue.length > 0) {
    console.log();
    console.log(chalk.bold('Queue:'));
    for (const item of status.queue) {
      const stateLabel =
        item.state === 'done'
          ? chalk.green(item.state)
          : item.state === 'failed'
          ? chalk.red(item.state)
          : item.state === 'pending'
          ? chalk.dim(item.state)
          : chalk.cyan(item.state);
      const prog = item.progress > 0 ? ` ${renderProgress(item.progress)}` : '';
      console.log(`  ${stateLabel.padEnd(14)} ${item.title}${prog}`);
    }
  }

  console.log();
}

function printWatchlist(entries: WatchlistEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.dim('Watchlist is empty.'));
    return;
  }

  const TITLE_W = 40;
  const MODE_W = 8;
  const SEASON_W = 7;

  console.log();
  console.log([
    chalk.bold('Title'.padEnd(TITLE_W)),
    chalk.bold('Mode'.padEnd(MODE_W)),
    chalk.bold('Season'.padEnd(SEASON_W)),
    chalk.bold('Added'),
  ].join('  '));
  console.log(chalk.dim('─'.repeat(TITLE_W + MODE_W + SEASON_W + 25)));

  for (const e of entries) {
    const modeColor = e.mode === 'rss' ? chalk.cyan : chalk.yellow;
    const aliasNote = e.aliases.length > 0 ? chalk.dim(` (${e.aliases.join(', ')})`) : '';
    const added = new Date(e.addedAt).toLocaleDateString();
    console.log([
      (e.title + aliasNote).padEnd(TITLE_W),
      modeColor(e.mode.padEnd(MODE_W)),
      String(e.season).padEnd(SEASON_W),
      chalk.dim(added),
    ].join('  '));
  }

  console.log(chalk.dim(`\n${entries.length} show(s) on watchlist`));
}

function renderProgress(pct: number): string {
  const filled = Math.round(pct / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  return `[${bar}] ${pct}%`;
}
