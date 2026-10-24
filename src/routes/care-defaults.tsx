import { createFileRoute } from '@tanstack/react-router';

// The root workspace keeps the settings draft when navigating back to the editor.
export const Route = createFileRoute('/care-defaults')({
  staticData: { workspacePage: 'defaults' },
});
