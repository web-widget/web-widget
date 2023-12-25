import type { Handlers, Meta, RouteComponentProps } from "@web-widget/react";
import Github from "../widgets/Github.widget.vue?as=tsx";
import BaseLayout from "../components/BaseLayout.tsx";

interface GitHubResponse {
  login: string;
  name: string;
  avatar_url: string;
}

export const meta: Meta = {
  title: "Github user",
};

export const handler: Handlers<GitHubResponse> = {
  async GET(ctx) {
    const resp = await fetch(
      `https://api.github.com/users/${ctx.params.username}`
    );

    if (!resp.ok) {
      throw new Error(
        `An Error occurred: ${JSON.stringify(await resp.json())}`
      );
    }

    return ctx.render({
      data: await resp.json(),
    });
  },
};

export default function Page({ data }: RouteComponentProps<GitHubResponse>) {
  const { login, name, avatar_url } = data;

  return (
    <BaseLayout>
      <img src={avatar_url} width={64} height={64} />
      <h1>{name}</h1>
      <p>{login}</p>
      <div>
        <h2>Vue component:</h2>
        <Github username="aui" />
      </div>
    </BaseLayout>
  );
}
