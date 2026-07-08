const LOGO = [
  ' __      __   _     __      ___    _          _   ',
  ' \\ \\    / /__| |__  \\ \\    / (_)__| |__ _ ___| |_ ',
  "  \\ \\/\\/ / -_) '_ \\  \\ \\/\\/ /| / _` / _` / -_)  _|",
  '   \\_/\\_/\\___|_.__/   \\_/\\_/ |_\\__,_\\__, \\___|\\__|',
  '                                    |___/         ',
] as const;

const ANSI = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
} as const;

export function formatDevWelcome(): string {
  const c = ANSI.cyan;
  const r = ANSI.reset;
  const logo = LOGO.map((line) => `${c}${line}${r}`).join('\n');
  return ['', logo, ''].join('\n');
}

export function printDevWelcome(): void {
  console.info(formatDevWelcome());
}
