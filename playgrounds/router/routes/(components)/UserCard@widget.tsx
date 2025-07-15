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
    return { ...userData, 'usercard@</script>': 1 };
  });

  return data;
};

const UserCard: React.FC<Props> = ({ username }: Props) => {
  const data = useFetchUser(username);
  const [show, setShow] = useState(false);

  return (
    <div
      style={{
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        padding: '16px',
        backgroundColor: '#fafbfc',
      }}>
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <img
          src={data.avatar_url}
          alt={`${data.name} avatar`}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            marginRight: '12px',
          }}
        />
        <div>
          <h4 style={{ margin: '0 0 4px 0' }}>{data.name}</h4>
          <small style={{ color: '#586069' }}>@{data.username}</small>
        </div>
      </div>

      {data.bio && (
        <p style={{ margin: '8px 0', fontSize: '14px', color: '#24292e' }}>
          {data.bio}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '16px',
          fontSize: '12px',
          color: '#586069',
          marginBottom: '12px',
        }}>
        <span>📍 {data.location}</span>
        <span>👥 {data.followers} followers</span>
        <span>📦 {data.public_repos} repos</span>
      </div>

      <button
        onClick={() => setShow(!show)}
        style={{
          background: '#0366d6',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}>
        {show ? 'Hide' : 'Show'} Raw Data
      </button>

      {show && (
        <pre
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#f6f8fa',
            borderRadius: '6px',
            fontSize: '12px',
            overflow: 'auto',
          }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default UserCard;
