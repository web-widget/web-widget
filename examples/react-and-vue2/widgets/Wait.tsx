const random = (max: number, min: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const fetchData = async (timeout = random(900, 2900)) =>
  await new Promise((resolve) =>
    setTimeout(() => resolve(`Hello Wrold`), timeout)
  );

export default (async function Wait({ id }: { id: string }) {
  const data = (await fetchData()) as string;
  return (
    <div
      style={{
        background: "linear-gradient(315deg,#42d392 25%,#0074a6)",
        color: "#FFF",
        padding: "20px",
      }}>
      React {id}: {data}
    </div>
  );
} as unknown as React.FunctionComponent<any>);
