import { defineRouteComponent, defineRouteHandler } from '@web-widget/react';
import BaseLayout from './(components)/BaseLayout';

export const handler = defineRouteHandler({
  async GET(ctx) {
    return await ctx.html();
  },
  async POST(ctx) {
    const form = await ctx.request.formData();
    const email = form.get('email')?.toString();

    // Add email to list.
    console.log(email);

    // Redirect user to thank you page.
    const headers = new Headers();
    headers.set('location', '/thanks-for-subscribing');
    return new Response(null, {
      status: 303, // See Other
      headers,
    });
  },
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Form submissions</h1>
      <form method="post">
        <input type="email" name="email" value="" />
        <button type="submit">Subscribe</button>
      </form>
    </BaseLayout>
  );
});
