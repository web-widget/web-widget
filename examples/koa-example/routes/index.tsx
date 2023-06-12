import Counter from "../islands/Counter";
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
