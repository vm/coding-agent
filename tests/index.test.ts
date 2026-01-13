import { describe, it, expect, mock, afterEach } from 'bun:test';

interface RenderOptions {
  exitOnCtrlC?: boolean;
}

mock.module('ink', () => ({
  render: mock(() => {}),
}));

mock.module('../src/components/App', () => ({
  App: () => 'MockedApp',
}));

describe('index', () => {
  afterEach(() => {
    mock.restore();
  });

  it('should render the App component with correct options', async () => {
    const mockRender = mock<(component: unknown, options?: RenderOptions) => void>(() => {});
    mock.module('ink', () => ({
      render: mockRender,
    }));

    await import('../src/index');

    expect(mockRender).toHaveBeenCalledTimes(1);
    const firstCall = mockRender.mock.calls[0];
    if (firstCall && firstCall.length > 1) {
      const options = firstCall[1];
      expect(options).toEqual({ exitOnCtrlC: true });
    }
  });
});
