/** Completion of the store's existing persist read, including storage failures. */
export const createPersistHydration = <State>(name: string) => {
  let completion = Promise.resolve(true);
  return {
    wait: () => completion,
    onRehydrateStorage: () => {
      let finish!: (succeeded: boolean) => void;
      completion = new Promise<boolean>((resolve) => { finish = resolve; });
      return (_state?: State, error?: unknown) => {
        if (error) console.warn(`[${name}] Persisted state restoration failed`);
        finish(!error);
      };
    },
  };
};
