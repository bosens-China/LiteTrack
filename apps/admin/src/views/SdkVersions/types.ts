export interface ChannelInfo {
  latest: string;
  url: string;
}

export interface SdkVersion {
  version: string;
  apiVersion: string;
  url: string;
  integrity: string;
  size: number;
}

export interface Manifest {
  channels: Record<string, ChannelInfo>;
  versions: SdkVersion[];
}

export interface NpmInfo {
  'dist-tags': Record<string, string>;
  versions: Record<string, unknown>;
}
