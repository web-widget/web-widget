import { context } from '@web-widget/helpers/context';

export const echo = async (content: string) => {
  const { request } = context();
  return {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body: content,
    date: new Date().toISOString(),
  };
};
