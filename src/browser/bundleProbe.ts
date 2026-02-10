import type { Page } from "playwright";

export type CapturedBundle = {
  calls: Array<{ contractAddress: string; entrypoint: string; calldata: any[] }>;
  txHash?: string;
};

// Installs an interceptor that captures the next account.execute(calls) payload
// and then prevents the tx from being sent (by throwing).
export async function installExecuteInterceptor(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    const provider = w.starknet_controller;
    if (!provider?.account) return;
    const acct = provider.account;
    if (acct.__ls2_interceptorInstalled) return;

    acct.__ls2_interceptorInstalled = true;
    acct.__ls2_capturedBundles = [];

    const orig = acct.execute.bind(acct);

    acct.execute = async (...args: any[]) => {
      const t = Date.now();
      const calls = args?.[0];
      // capture
      acct.__ls2_capturedBundles.push({ t, calls });
      // prevent actual send
      throw new Error("LS2_INTERCEPTED_EXECUTE");
    };

    // keep original accessible for manual recovery
    acct.__ls2_origExecute = orig;
  });
}

export async function popLastCapturedBundle(page: Page): Promise<CapturedBundle | null> {
  return await page.evaluate(() => {
    const w = window as any;
    const acct = w.starknet_controller?.account;
    const arr = acct?.__ls2_capturedBundles;
    if (!arr || arr.length === 0) return null;
    const last = arr[arr.length - 1];
    const calls = (last.calls || []).map((c: any) => ({
      contractAddress: c.contractAddress,
      entrypoint: c.entrypoint,
      calldata: c.calldata,
    }));
    return { calls };
  });
}
