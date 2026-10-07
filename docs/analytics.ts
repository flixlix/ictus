type Stonks = {
  event: (
    name: string,
    pathOrProps?: string | Record<string, string>,
    props?: Record<string, string>,
  ) => void;
};

declare global {
  interface Window {
    stonks?: Stonks;
  }
}

export function track(name: string, props?: Record<string, string>): void {
  try {
    window.stonks?.event(name, props);
  } catch {
    return;
  }
}
