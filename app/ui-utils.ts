export function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function classByState(active: boolean, activeClass: string, idleClass: string) {
  return active ? activeClass : idleClass;
}
