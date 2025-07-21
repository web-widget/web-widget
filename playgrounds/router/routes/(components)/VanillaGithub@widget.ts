import { defineClientRender, defineServerRender } from '@web-widget/helpers';
import { syncCacheProvider } from '@web-widget/helpers/cache';
import { context } from '@web-widget/helpers/context';
import { IS_SERVER } from '@web-widget/helpers/env';
import type { MockUserData } from '../api/mock-users@route.ts';

interface Props {
  username: string;
}

const useFetchUser = (username: string): MockUserData => {
  const url = `/api/mock-users?username=${username}`;
  const cacheKey = url;
  const data = syncCacheProvider(cacheKey, async () => {
    console.log('[mock-users]', 'fetch..');

    // Get current service URL from request context
    const { request } = context();
    const currentUrl = new URL(request.url);
    const fullUrl = `${currentUrl.origin}${url}`;
    const resp = await fetch(fullUrl);
    if (!resp.ok) {
      throw new Error(`[mock-users] ${JSON.stringify(await resp.json())}`);
    }
    const userData = await resp.json();
    return { ...userData, 'vanilla@</script>': 1 };
  });

  return data;
};

export default ({ username }: Props) => {
  const data = useFetchUser(username);

  return `
    <div>
      <button show>Vanilla: Show Framework Info</button>
      <pre hidden>
        ${JSON.stringify(data, null, 2)}
      </pre>
    </div>`;
};

export const render = IS_SERVER
  ? defineServerRender<Function>((component, data) => {
      return component(data);
    })
  : defineClientRender<Function>(
      (_component, _data, { container, recovering }) => {
        if (recovering) {
          const button = container.querySelector('button[show]') as HTMLElement;
          const pre = container.querySelector('pre[hidden]') as HTMLElement;

          button.onclick = () => {
            pre.hidden = false;
          };
        }
      }
    );
