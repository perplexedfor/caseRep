import { trace, debug, info, warn, error } from '@tauri-apps/plugin-log';

/**
 * Forwards console methods to Tauri logger.
 */
function forwardConsole(
  fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
  logger: (message: string) => Promise<void>
) {
  const original = console[fnName];
  console[fnName] = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    original.apply(console, args);
    logger(message).catch((err) =>
      console.warn(`Failed to send log to Tauri: ${err}`)
    );
  };
}
let loggerInitialized = false;

export function setupLogger() {
  if (loggerInitialized) return;
  loggerInitialized = true;

  forwardConsole('log', trace);   // console.log → trace
  forwardConsole('debug', debug);
  forwardConsole('info', info);
  forwardConsole('warn', warn);
  forwardConsole('error', error);
}