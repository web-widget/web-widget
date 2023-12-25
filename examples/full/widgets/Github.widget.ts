import { useWidgetSyncState } from "@web-widget/schema/helpers";
import type { WidgetRenderContext } from "@web-widget/schema";

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
  const cacheKey = url + "@vanilla";
  const data = useWidgetSyncState(cacheKey, async () => {
    console.log("[github]", "fetch..");
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`[github] ${JSON.stringify(await resp.json())}`);
    }
    const { name, location, avatar_url } = await resp.json();
    return { name, location, avatar_url, "vanilla@</script>": Date.now() };
  });

  return data;
};

export default ({ username }: Props) => {
  console.log("vanilla", Date.now());
  const data = useFetchGithub(username);

  return `
    <div>
      <button show>Vanilla: Show Github Info</button>
      <pre hidden>
        ${JSON.stringify(data, null, 2)}
      </pre>
    </div>`;
};

export const render = async (context: WidgetRenderContext) => {
  if (import.meta.env.SSR) {
    return context.module.default(context.data);
  } else if (Reflect.get(context, "recovering")) {
    const container = Reflect.get(context, "container") as HTMLElement;
    const button = container.querySelector("button[show]") as HTMLElement;
    const pre = container.querySelector("pre[hidden]") as HTMLElement;

    button.onclick = () => {
      pre.hidden = false;
    };
  }
};
