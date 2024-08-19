import { useState } from 'react';
import { echo } from './functions@action';
import './styles.css';

export default () => {
  const [log, setLog] = useState('');
  const [inputValue, setInputValue] = useState('');

  return (
    <>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />

      <button
        onClick={async () => {
          // NOTE: This is a client-side call to the server-side function
          const value = await echo(inputValue);
          setLog(JSON.stringify(value, null, 2));
        }}>
        echo
      </button>

      {log && (
        <div className="log">
          <p>
            This is the content returned from the server function. Please view
            the network request in the console.
          </p>
          <pre>{log}</pre>
        </div>
      )}
    </>
  );
};
