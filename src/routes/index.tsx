import { createFileRoute } from '@tanstack/react-router';

// The root workspace keeps this editor mounted to preserve unsaved UI state.
export const Route = createFileRoute('/')({
  staticData: { workspacePage: 'episode' },
});
