import { defineWidgetRender } from '@web-widget/helpers';
import { IS_SERVER } from '@web-widget/helpers/env';
import { syncCacheProvider } from '@web-widget/helpers/cache';

interface GitHubUserData {
  name: string;
  location: string;
  avatar_url: string;
}

interface Props {
  username: string;
}

const useFetchGithub = (username: string): GitHubUserData => {
  const url = `https://api.github.com/users/${username}`;
  const cacheKey = url + '@vanilla';
  const data = syncCacheProvider(cacheKey, async () => {
    console.log('[github]', 'fetch..');
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`[github] ${JSON.stringify(await resp.json())}`);
    }
    const { name, location, avatar_url } = await resp.json();
    return { name, location, avatar_url, 'vanilla@</script>': 1 };
  });

  return data;
};

export default ({ username }: Props) => {
  const data = useFetchGithub(username);

  return `
    <div>
      <button show>Vanilla: Show Github Info</button>
      <pre hidden>
        ${JSON.stringify(data, null, 2)}
      </pre>
    </div>`;
};

export const render = defineWidgetRender(async (context) => {
  if (IS_SERVER) {
    return context.module.default!(context.data);
  } else if (Reflect.get(context, 'recovering')) {
    const container = Reflect.get(context, 'container') as HTMLElement;
    const button = container.querySelector('button[show]') as HTMLElement;
    const pre = container.querySelector('pre[hidden]') as HTMLElement;

    button.onclick = () => {
      pre.hidden = false;
    };
  }
});
