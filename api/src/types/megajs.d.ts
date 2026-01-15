declare module "megajs" {
  import { Readable, Writable } from "stream";

  export interface StorageOptions {
    email: string;
    password: string;
    keepalive?: boolean;
    userAgent?: string;
  }

  export class Storage {
    constructor(options: StorageOptions);
    ready: Promise<Storage>;
    root: any; // Directory node
    close(): void;
    upload(name: string, stream: Readable): any; // returns Upload instance
  }

  export interface MutableFileOptions {
    downloadId?: string;
    key?: string;
  }

  export interface DownloadOptions {
    start?: number;
    end?: number;
    stream?: boolean;
  }

  export interface MutableFile {
    name: string;
    size: number;
    directory: boolean;
    children: MutableFile[] | null;
    loadAttributes(
      cb?: (err: Error | null, file: MutableFile) => void
    ): Promise<MutableFile>;
    download(options?: DownloadOptions): Readable & {
      pipe<T extends Writable>(destination: T): T;
      on(event: string, listener: (...args: any[]) => void): any;
      destroy(): void;
    };
    link(options?: { noKey?: boolean }): Promise<string>;
  }

  export class File implements MutableFile {
    static fromURL(url: string, options?: MutableFileOptions): File;
    name: string;
    size: number;
    directory: boolean;
    children: MutableFile[] | null;
    loadAttributes(
      cb?: (err: Error | null, file: MutableFile) => void
    ): Promise<MutableFile>;
    download(options?: DownloadOptions): Readable & {
      pipe<T extends Writable>(destination: T): T;
      on(event: string, listener: (...args: any[]) => void): any;
      destroy(): void;
    };
    link(options?: { noKey?: boolean }): Promise<string>;
  }
}
