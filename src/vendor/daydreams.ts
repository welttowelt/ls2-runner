// Runtime shim for @daydreamsai/core.
// The package export map points to non-existent TS sources in this install.
// We load the built dist bundle directly via a relative file URL.

import { pathToFileURL } from "node:url";
import path from "node:path";

const distUrl = pathToFileURL(
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../node_modules/@daydreamsai/core/dist/index.js")
).toString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mod: any = await import(distUrl);

export const createDreams = mod.createDreams;
export const action = mod.action;
export const memory = mod.memory;
export const extension = mod.extension;

export type WorkingMemory = import("@daydreamsai/core").WorkingMemory;
export type Context = import("@daydreamsai/core").Context;
export type MemoryStore = import("@daydreamsai/core").MemoryStore;
