import { useState } from 'react';
//import { echo } from '../(actions)/actions@action';

import('../(actions)/actions@action').then(({ a }) => {});

export default () => {
  const [log, setLog] = useState('');
  return (
    <div>
      <button
        onClick={async () => {
          const value = await echo('hello world');
          setLog(JSON.stringify(value, null, 2));
        }}>
        echo
      </button>
      <pre>{log}</pre>
    </div>
  );
};
