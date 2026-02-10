export type ControllerCall = {
  contractAddress: string;
  entrypoint: string;
  calldata: Array<string | number | boolean | object>;
};

export type CallsFile = { calls: Array<{ contractAddress: string; entrypoint: string; calldata: string[] }> };

function toFelt(v: string | number | boolean): string {
  if (typeof v === "boolean") return v ? "0x1" : "0x0";
  if (typeof v === "number") return `0x${v.toString(16)}`;
  const s = v.trim();
  if (s.startsWith("0x")) return s;
  // assume decimal string
  if (/^\d+$/.test(s)) return `0x${BigInt(s).toString(16)}`;
  throw new Error(`Cannot convert value to felt: ${v}`);
}

// v0.1 strict encoding: only allow felts (hex/dec), numbers, booleans.
// Struct encoding is not implemented yet.
export function encodeCalls(calls: Array<{ contractAddress: string; entrypoint: string; calldata: Array<string | number | boolean> }>): CallsFile {
  return {
    calls: calls.map((c) => ({
      contractAddress: c.contractAddress,
      entrypoint: c.entrypoint,
      calldata: c.calldata.map((x) => toFelt(x)),
    })),
  };
}
