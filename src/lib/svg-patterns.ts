export function generateFestivalPattern(name: string): string {
  // Simple hash function to generate a deterministic number from the string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate colors based on hash
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  const color1 = `hsl(${hue1}, 70%, 60%)`;
  const color2 = `hsl(${hue2}, 70%, 40%)`;

  // Generate a geometric pattern
  // We'll use a simple circle pattern for now, but this can be expanded
  const id = `pattern-${Math.abs(hash)}`;

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 800 400"><defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${encodeURIComponent(color1)}" /><stop offset="100%" stop-color="${encodeURIComponent(color2)}" /></linearGradient></defs><rect width="100%" height="100%" fill="url(%23${id})" /><circle cx="0" cy="0" r="400" fill="white" fill-opacity="0.1" /><circle cx="800" cy="400" r="300" fill="white" fill-opacity="0.1" /></svg>`;
}

export function generateJoinedPattern(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const color = `hsla(${hue}, 70%, 50%, 0.1)`;

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="${encodeURIComponent(color)}" /><path d="M0 100 L100 0" stroke="currentColor" stroke-width="1" stroke-opacity="0.1" /></svg>`;
}
