export default (async function Fail({ id }: { id: string }) {
  await new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Widget ${id} failed to load data`)), 500)
  );
  return null;
} as unknown as React.FunctionComponent<any>);
