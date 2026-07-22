interface Task {
  callback: () => void | Promise<void>;
  cleanups: Array<() => void>;
  priority: number;
  sequence: number;
  started: boolean;
}

const tasks: Task[] = [];
let sequence = 0;
let scheduled = false;

const pump = () => {
  scheduled = false;
  tasks.sort((a, b) => a.priority - b.priority || a.sequence - b.sequence);
  const pending = tasks.splice(0);

  // Auto controls when work becomes eligible. The browser remains responsible
  // for network concurrency, while JavaScript and DOM work share its main loop.
  for (const task of pending) {
    task.started = true;
    task.cleanups.forEach((cleanup) => cleanup());
    task.cleanups = [];
    Promise.resolve().then(task.callback);
  }
};

const schedulePump = () => {
  if (scheduled) return;
  scheduled = true;
  Promise.resolve().then(pump);
};

export const scheduleAutoMount = (
  element: Element,
  callback: () => void | Promise<void>,
  observeVisible: (element: Element, callback: () => void) => () => void
) => {
  let task: Task | undefined;
  const enqueue = (priority: number) => {
    if (!task || task.started) return;
    task.priority = Math.min(task.priority, priority);
    if (!tasks.includes(task)) tasks.push(task);
    schedulePump();
  };

  task = {
    callback,
    cleanups: [],
    priority: 1,
    sequence: sequence++,
    started: false,
  };

  try {
    task.cleanups.push(observeVisible(element, () => enqueue(0)));
  } catch {
    // Browsers without IntersectionObserver use the idle fallback below.
  }

  const promote = () => enqueue(0);
  element.addEventListener('pointerover', promote, {
    once: true,
    passive: true,
  });
  element.addEventListener('pointerdown', promote, {
    once: true,
    passive: true,
  });
  element.addEventListener('focusin', promote, { once: true, passive: true });
  task.cleanups.push(() => element.removeEventListener('pointerover', promote));
  task.cleanups.push(() => element.removeEventListener('pointerdown', promote));
  task.cleanups.push(() => element.removeEventListener('focusin', promote));

  const idle = () => enqueue(1);
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(idle, { timeout: 1000 });
    task.cleanups.push(() => cancelIdleCallback(id));
  } else {
    const id = setTimeout(idle, 200);
    task.cleanups.push(() => clearTimeout(id));
  }

  return () => {
    if (!task) return;
    const index = tasks.indexOf(task);
    if (index !== -1) tasks.splice(index, 1);
    task.cleanups.forEach((cleanup) => cleanup());
    task = undefined;
  };
};
