// An HTTP history response may arrive after a live event. Merge both sources so
// refreshing/reconnecting cannot discard a step that was already displayed.
export function mergeTerminalLogs(current, incoming, limit = 300) {
  const entries = new Map();
  for (const entry of [...current, ...incoming]) if (entry?.id) entries.set(entry.id, entry);
  const time = entry => Date.parse(entry.createdAt) || Number(entry.id?.split('_')[1]) || 0;
  return [...entries.values()].sort((a, b) => time(a) - time(b)).slice(-limit);
}
