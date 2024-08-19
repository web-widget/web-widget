// NOTE: This module only runs on the server.

export const echo = async (content: string) => {
  return {
    message: content,
    date: new Date().toISOString(),
  };
};
