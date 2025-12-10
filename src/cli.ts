#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { HookRClient } from './client.js';

const program = new Command();

program
  .name('hookr')
  .description('Quick webhook listener via WebSocket')
  .version('1.0.1');

program
  .command('listen')
  .description('Listen for incoming webhooks via hookR WebSocket')
  .option('-f, --format <format>', 'Output format (json|pretty)', 'pretty')
  .option('--save <file>', 'Save requests to file')
  .option('--url <url>', 'hookR service URL', 'wss://web.hookr.cloud/events')
  .argument('<client-key>', 'Your hookR client API key')
  .action(async (clientKey, options) => {
    await listenToHookrService(clientKey, options);
  });

async function listenToHookrService(clientKey: string, options: any) {
  console.log(chalk.blue('🎣 Connecting to hookR service...'));
  console.log(chalk.gray(`   Client Key: ${clientKey.substring(0, 8)}...`));
  console.log(chalk.gray(`   Service URL: ${options.url}`));
  console.log('');

  try {
    const client = new HookRClient(clientKey, {
      apiUrl: options.url.replace('wss://', 'https://').replace('ws://', 'http://').replace('/events', '/api/v1'),
      wsUrl: options.url
    });

    // Connect to WebSocket
    await client.connect();
    console.log(chalk.green('✅ Connected to hookR service'));
    console.log(chalk.gray('Waiting for webhook events...'));
    console.log(chalk.gray('Press Ctrl+C to stop'));
    console.log('');

    // Listen for hook events
    client.onHookCalled((event) => {
      const timestamp = new Date().toLocaleTimeString();
      
      if (options.format === 'json') {
        console.log(JSON.stringify({
          timestamp,
          event
        }, null, 2));
      } else {
        console.log(chalk.green(`🪝 [${timestamp}] Hook Called`));
        console.log(chalk.gray('   Event ID:'), event.eventId);
        console.log(chalk.gray('   Hook ID:'), event.hookId);
        console.log(chalk.gray('   Received At:'), event.receivedAt);
        console.log(chalk.gray('   Payload:'), formatPayload(event.payload));
        console.log('');
      }
      
      if (options.save) {
        // TODO: Implement file saving
      }
    });

    // Handle connection events
    client.onConnected(() => {
      console.log(chalk.blue('🔗 WebSocket connected'));
    });

    client.onError((error) => {
      console.log(chalk.red('❌ Error:'), error.message);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n👋 Shutting down...'));
      client.close();
      process.exit(0);
    });

    // Keep process alive
    process.stdin.resume();

  } catch (error: any) {
    console.log(chalk.red('❌ Failed to connect:'), error.message);
    process.exit(1);
  }
}

function formatPayload(payload: any) {
  if (!payload) return 'N/A';
  
  try {
    if (typeof payload === 'string') {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    }
    return JSON.stringify(payload, null, 2);
  } catch {
    return payload.toString();
  }
}



program.parse();