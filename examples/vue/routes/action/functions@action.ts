// NOTE: This module only runs on the server.
const mode = typeof document === 'undefined' ? 'server' : 'client';

export const echo = async (content: string) => {
  return {
    message: content,
    date: new Date().toISOString(),
    respondent: mode,
  };
};
