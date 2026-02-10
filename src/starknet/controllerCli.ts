import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../utils/logger.js";
import fs from "node:fs/promises";
import path from "node:path";
import { encodeCalls } from "./calls.js";

const execFileAsync = promisify(execFile);

export type ControllerResult = {
  status: "success" | "error";
  data?: any;
  transaction_hash?: string;
  error_code?: string;
  message?: string;
  recovery_hint?: string;
};

export type ControllerCliConfig = {
  contractAddress: string;
  maxTxPerMinute: number;
  maxTxPerSession: number;
  callsTmpDir?: string;
};

export class CartridgeControllerCli {
  private txCount = 0;
  private txTimestamps: number[] = [];

  constructor(private readonly cfg: ControllerCliConfig) {
    if (!cfg.contractAddress?.startsWith("0x")) {
      throw new Error("LS2_CONTRACT_ADDRESS must be set to a hex 0x... address");
    }
  }

  private tmpDir() {
    return this.cfg.callsTmpDir ?? "./.tmp";
  }

  getTxCount() {
    return this.txCount;
  }

  private checkRateLimit() {
    const now = Date.now();
    this.txTimestamps = this.txTimestamps.filter((t) => now - t < 60_000);

    if (this.txTimestamps.length >= this.cfg.maxTxPerMinute) {
      throw new Error(`Rate limit: ${this.cfg.maxTxPerMinute} tx/min exceeded`);
    }
    if (this.txCount >= this.cfg.maxTxPerSession) {
      throw new Error(`Session tx cap (${this.cfg.maxTxPerSession}) reached`);
    }
  }

  async status(): Promise<ControllerResult> {
    const { stdout } = await execFileAsync("controller", ["status", "--json"], {
      timeout: 15_000,
    });
    return JSON.parse(stdout);
  }

  async ensureActiveSession(minExpiresInSeconds = 300): Promise<void> {
    const s = await this.status();
    const st = s.data?.status;
    if (st !== "active") {
      throw new Error(`Controller session not active (status: ${st}). Run: controller register-session policies/ls2.json`);
    }
    const expiresIn = Number(s.data?.session?.expires_in_seconds ?? 0);
    if (!Number.isFinite(expiresIn) || expiresIn < minExpiresInSeconds) {
      throw new Error(`Controller session expires in ${expiresIn}s. Re-register before running.`);
    }
  }

  private async executeSingle(entrypoint: string, calldata: string[], wait = true): Promise<ControllerResult> {
    this.checkRateLimit();

    // Safety: contract address is fixed from cfg; never accept from model.
    const args: string[] = [
      "execute",
      "--contract",
      this.cfg.contractAddress,
      "--entrypoint",
      entrypoint,
      "--calldata",
      calldata.join(","),
      "--json",
    ];

    if (wait) args.push("--wait", "--timeout", "30");

    logger.info({ entrypoint, calldata }, "controller execute (single)");

    const { stdout } = await execFileAsync("controller", args, {
      timeout: 45_000,
    });

    const result: ControllerResult = JSON.parse(stdout);

    this.txCount++;
    this.txTimestamps.push(Date.now());

    if (result.status === "error") {
      logger.warn({ entrypoint, result }, "tx error");
      if (result.error_code === "SessionExpired") {
        throw new Error("Controller session expired. Re-register.");
      }
    }

    return result;
  }

  private async executeFile(filePath: string, wait = true): Promise<ControllerResult> {
    this.checkRateLimit();

    const args: string[] = ["execute", "--file", filePath, "--json"];
    if (wait) args.push("--wait", "--timeout", "30");

    logger.info({ filePath }, "controller execute (file)");

    const { stdout } = await execFileAsync("controller", args, {
      timeout: 60_000,
    });

    const result: ControllerResult = JSON.parse(stdout);
    this.txCount++;
    this.txTimestamps.push(Date.now());
    return result;
  }

  async executeBundle(calls: Array<{ contractAddress: string; entrypoint: string; calldata: Array<string | number | boolean> }>) {
    await fs.mkdir(this.tmpDir(), { recursive: true });
    const filePath = path.join(this.tmpDir(), `calls-${Date.now()}.json`);
    const payload = encodeCalls(calls);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
    return this.executeFile(filePath);
  }

  // Game actions
  async explore(adventurerId: string): Promise<ControllerResult> {
    // Verified from live UI tx bundle: request_random + explore(adventurer_id, false)
    // NOTE: request_random calldata is not derived yet; using single-call explore for now.
    return this.executeSingle("explore", [adventurerId, "0x0"]);
  }

  async attack(adventurerId: string): Promise<ControllerResult> {
    return this.executeSingle("attack", [adventurerId, "0x0"]);
  }

  async flee(adventurerId: string): Promise<ControllerResult> {
    return this.executeSingle("flee", [adventurerId, "0x0"]);
  }

  async upgrade(adventurerId: string, statIndex: number, amount = 1): Promise<ControllerResult> {
    return this.executeSingle("upgrade", [
      adventurerId,
      `0x${statIndex.toString(16)}`,
      `0x${amount.toString(16)}`,
    ]);
  }

  async buyPotion(adventurerId: string): Promise<ControllerResult> {
    return this.executeSingle("buy_potion", [adventurerId]);
  }
}
