import React, { useState } from 'react';
import { syncCacheProvider } from '@web-widget/helpers/cache';
import { context } from '@web-widget/helpers/context';
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
    return { ...userData, 'react@</script>': 1 };
  });

  return data;
};

const WidgetComponent: React.FC<Props> = ({ username }: Props) => {
  const data = useFetchUser(username);
  const [show, setShow] = useState(false);

  return (
    <div>
      <button onClick={() => setShow(true)}>React: Show Framework Info</button>
      <pre style={{ display: show ? 'block' : 'none' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default WidgetComponent;
