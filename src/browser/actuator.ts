import type { Page } from "playwright";

export type ExecuteCall = {
  contractAddress: string;
  entrypoint: string;
  calldata: any[];
};

export class BrowserActuator {
  constructor(private readonly page: Page) {}

  async ensureHooksInstalled(): Promise<void> {
    await this.page.evaluate(() => {
      const w = window as any;
      const provider = w.starknet_controller;
      if (!provider?.account) return;
      const acct = provider.account;
      if (acct.__ls2_hooked) return;

      acct.__ls2_hooked = true;
      acct.__ls2_execLog = [];

      const orig = acct.execute.bind(acct);
      acct.__ls2_origExecute = orig;

      acct.execute = async (...args: any[]) => {
        const t = Date.now();
        let res: any;
        let err: any = null;
        try {
          res = await orig(...args);
        } catch (e) {
          err = String(e);
        }
        try {
          acct.__ls2_execLog.push({ t, args: args.slice(0, 2), res, err });
          if (acct.__ls2_execLog.length > 200) acct.__ls2_execLog = acct.__ls2_execLog.slice(-200);
        } catch {}
        if (err) throw new Error(err);
        return res;
      };
    });
  }

  async getLastExecBundle(): Promise<ExecuteCall[] | null> {
    return await this.page.evaluate(() => {
      const acct = (window as any).starknet_controller?.account;
      const logs = acct?.__ls2_execLog || [];
      const last = logs[logs.length - 1];
      const calls = last?.args?.[0];
      if (!Array.isArray(calls)) return null;
      return calls.map((c: any) => ({
        contractAddress: c.contractAddress,
        entrypoint: c.entrypoint,
        calldata: c.calldata,
      }));
    });
  }

  async getLastRequestRandomCalldata(): Promise<string[] | null> {
    return await this.page.evaluate(() => {
      const acct = (window as any).starknet_controller?.account;
      const logs = acct?.__ls2_execLog || [];
      for (let i = logs.length - 1; i >= 0; i--) {
        const calls = logs[i]?.args?.[0];
        if (!Array.isArray(calls)) continue;
        const rr = calls.find((c: any) => c?.entrypoint === "request_random");
        if (!rr) continue;
        const cd = rr.calldata;
        if (!Array.isArray(cd)) continue;
        return cd.map((x: any) => String(x));
      }
      return null;
    });
  }

  async executeBundle(calls: ExecuteCall[]): Promise<{ transaction_hash?: string }>{
    return await this.page.evaluate(async (callsIn) => {
      const acct = (window as any).starknet_controller?.account;
      if (!acct) throw new Error("no starknet_controller.account");
      const res = await acct.__ls2_origExecute ? acct.__ls2_origExecute(callsIn) : acct.execute(callsIn);
      return res;
    }, calls as any);
  }
}
