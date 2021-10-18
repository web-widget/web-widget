const App = () => {
  const template = document.createElement('template');
  template.innerHTML = `
    <div style="
        margin: 10px;
        padding: 10px;
        text-align: center;
        background-color: cyan"
    >
      <h1>App 2</h1>
    </div>
  `;
  return template.content;
}


export default App;