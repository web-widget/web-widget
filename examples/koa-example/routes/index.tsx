import { relative } from 'node:path';
import { fileURLToPath } from "node:url";
import Counter from "../islands/Counter.tsx";
import { render, Handlers, ComponentProps } from "@web-widget/react";

export { render }

export default function Home() {
  return (
    <div>
      <p>
        Welcome to widget web server. Try to update this message in the ./routes/index.tsx
        file, and refresh.
      </p>
      <Counter widget name="Home" start={3} />
    </div>
  );
}

// const x = import.meta.url;
// console.log(import.meta.url)
// console.log(new URL('../islands/Counter', import.meta.url).href)
// console.log(relative(new URL('../islands/Counter', import.meta.url).href, import.meta.url));
console.log('dirname', relative(new URL('.', import.meta.url).href, new URL('../islands/Counter', import.meta.url).href))
console.log(process.cwd(), '>>>', fileURLToPath(new URL('.', import.meta.url).href).replace(process.cwd(), ''));
// console.log('MMM>>', relative(import.meta.url, new URL('../islands/Counter', x).href))
// console.log('>>>', new URL('../islands/Counter', x).href)