export type ThemeName = 'light' | 'dark';

export type Theme = {
  banner: string[];
  userMessage: string;
  assistantMessage: string;
  thinking: string;
  toolStatus: {
    running: string;
    done: string;
    error: string;
  };
  input: {
    prompt: string;
    text: string;
    placeholder: string;
    cursor: string;
  };
  diff: {
    hunkHeader: string;
    separator: string;
    deletion: string;
    addition: string;
    truncated: string;
    context: string;
  };
  codeBlock: {
    border: string;
    content: string;
    commandPrefix: string;
  };
  error: string;
  text: {
    primary: string;
    secondary: string;
  };
};

export const lightTheme: Theme = {
  banner: [
    '#d63031',
    '#fdcb6e',
    '#74b9ff',
    '#00b894',
    '#a29bfe',
    '#fd79a8',
  ],
  userMessage: '#d63031',
  assistantMessage: '#2d3436',
  thinking: '#6c5ce7',
  toolStatus: {
    running: '#e17055',
    done: '#00b894',
    error: '#d63031',
  },
  input: {
    prompt: '#0984e3',
    text: '#2d3436',
    placeholder: '#636e72',
    cursor: '#0984e3',
  },
  diff: {
    hunkHeader: '#0984e3',
    separator: '#b2bec3',
    deletion: '#d63031',
    addition: '#00b894',
    truncated: '#e17055',
    context: '#b2bec3',
  },
  codeBlock: {
    border: '#b2bec3',
    content: '#2d3436',
    commandPrefix: '#0984e3',
  },
  error: '#d63031',
  text: {
    primary: '#2d3436',
    secondary: '#636e72',
  },
};

export const darkTheme: Theme = {
  banner: [
    '#ff6b6b',
    '#feca57',
    '#48dbfb',
    '#1dd1a1',
    '#5f27cd',
    '#ff9ff3',
  ],
  userMessage: 'yellow',
  assistantMessage: 'white',
  thinking: 'magenta',
  toolStatus: {
    running: 'yellow',
    done: 'green',
    error: 'red',
  },
  input: {
    prompt: 'cyan',
    text: 'white',
    placeholder: 'gray',
    cursor: 'cyan',
  },
  diff: {
    hunkHeader: 'cyan',
    separator: 'gray',
    deletion: 'red',
    addition: 'green',
    truncated: 'yellow',
    context: 'gray',
  },
  codeBlock: {
    border: 'gray',
    content: 'cyan',
    commandPrefix: 'blueBright',
  },
  error: 'red',
  text: {
    primary: 'white',
    secondary: 'gray',
  },
};

export function getTheme(name: ThemeName): Theme {
  switch (name) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
    default:
      return darkTheme;
  }
}

