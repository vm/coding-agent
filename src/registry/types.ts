export type RegistryEntry = {
  name: string;
  type: 'command' | 'skill';
  description: string;
  path: string;
};

export type Registry = {
  entries: RegistryEntry[];
  generatedAt: number;
};

