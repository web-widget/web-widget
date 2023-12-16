import React, { useState } from "react";
import { useWidgetState } from "@web-widget/react";

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
  const cacheKey = url;
  const data = useWidgetState(cacheKey, async () => {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`An Error occurred`);
    }
    const { name, location, avatar_url } = await resp.json();
    return { name, location, avatar_url };
  });

  if (data instanceof Promise) {
    throw data;
  }

  return data;
};

const WidgetComponent: React.FC<Props> = ({ username }: Props) => {
  const data = useFetchGithub(username);
  const [show, setShow] = useState(false);

  return (
    <div>
      <button onClick={() => setShow(true)}>Show Github Info</button>
      <pre style={{ display: show ? "block" : "none" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default WidgetComponent;
