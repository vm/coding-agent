export type RegistryEntryType = 'command' | 'skill';

export type RegistryEntry = {
  name: string;
  type: RegistryEntryType;
  description: string;
  path: string;
};

export type Registry = {
  entries: RegistryEntry[];
  generatedAt: number;
};

