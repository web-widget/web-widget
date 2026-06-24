import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

/** Sync existence check used when resolving config paths on disk. */
export type FileExistsSync = (filePath: string) => boolean;

/** Async UTF-8 read used by router plugin host APIs. */
export type ReadFileUtf8 = (filePath: string) => Promise<string>;

export const defaultFileExistsSync: FileExistsSync = (filePath) =>
  fs.existsSync(filePath);

export const defaultReadFileUtf8: ReadFileUtf8 = (filePath) =>
  fsPromises.readFile(filePath, 'utf-8');
