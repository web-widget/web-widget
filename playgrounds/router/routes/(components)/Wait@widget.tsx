const random = (max: number, min: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const fetchData = async (timeout = random(900, 2900)) =>
  await new Promise((resolve) =>
    setTimeout(() => resolve(`Hello World`), timeout)
  );

export default (async function Wait({ id }: { id: string }) {
  const data = (await fetchData()) as string;
  return (
    <div className="demo-result">
      React {id}: {data}
    </div>
  );
} as unknown as React.FunctionComponent<any>);
