import { defineRouteHandler } from '@web-widget/helpers';

export type MockUserData = {
  name: string;
  location: string;
  avatar_url: string;
  username: string;
  bio?: string;
  followers: number;
  following: number;
  public_repos: number;
};

const mockUsers: Record<string, MockUserData> = {
  react: {
    name: 'React',
    location: 'Menlo Park, CA',
    avatar_url: 'https://avatars.githubusercontent.com/u/70142?v=4',
    username: 'react',
    bio: 'The library for web and native user interfaces',
    followers: 215000,
    following: 0,
    public_repos: 1250,
  },
  vuejs: {
    name: 'Vue.js',
    location: 'Worldwide',
    avatar_url: 'https://avatars.githubusercontent.com/u/6128107?v=4',
    username: 'vuejs',
    bio: 'Vue.js - The Progressive JavaScript Framework',
    followers: 34567,
    following: 0,
    public_repos: 234,
  },
  angular: {
    name: 'Angular',
    location: 'Mountain View, CA',
    avatar_url: 'https://avatars.githubusercontent.com/u/139426?v=4',
    username: 'angular',
    bio: 'Deliver web apps with confidence',
    followers: 89000,
    following: 0,
    public_repos: 890,
  },
  sveltejs: {
    name: 'Svelte',
    location: 'Worldwide',
    avatar_url: 'https://avatars.githubusercontent.com/u/23617963?v=4',
    username: 'sveltejs',
    bio: 'Cybernetically enhanced web apps',
    followers: 78000,
    following: 0,
    public_repos: 156,
  },
  preactjs: {
    name: 'Preact',
    location: 'Worldwide',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456?v=4',
    username: 'preactjs',
    bio: 'Fast 3kB alternative to React with the same modern API',
    followers: 32000,
    following: 0,
    public_repos: 89,
  },
  solidjs: {
    name: 'SolidJS',
    location: 'Worldwide',
    avatar_url: 'https://avatars.githubusercontent.com/u/72231787?v=4',
    username: 'solidjs',
    bio: 'A declarative, efficient, and flexible JavaScript library for building user interfaces',
    followers: 28000,
    following: 0,
    public_repos: 67,
  },
};

export const handler = defineRouteHandler({
  async GET(ctx) {
    const username = ctx.request.url
      ? new URL(ctx.request.url).searchParams.get('username')
      : null;

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username parameter is required' }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    const userData = mockUsers[username];

    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    });
  },
});
