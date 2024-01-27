/* Client WidgetModule Lifecycle
      Start
        ▼
    ┌───┴──┐
    │ load │
    └───┬──┘
        ▼
  ┌─────┴─────┐
  │ bootstrap │
  └─────┬─────┘
┌──────►┤
│       ▼ 
│   ┌───┴───┐
│   │ mount │
│   └───┬───┘ 
│       │   ┌───────┐
│       │   │       ▼
│       ▼   ▲   ┌───┴────┐
│       ├───┤   │ update │
│       │   ▲   └───┬────┘
│       │   │       ▼                 
│       │   └───────┘
│       ▼
│  ┌────┴────┐
└─◄┤ unmount │
   └────┬────┘
        ▼ 
   ┌────┴───┐
   │ unload │
   └────┬───┘ 
        ▼
       End
*/
import {
  BOOTSTRAPPED,
  BOOTSTRAPPING,
  BOOTSTRAP_ERROR,
  INITIAL,
  LOADED,
  LOADING,
  LOAD_ERROR,
  MOUNTED,
  MOUNTING,
  MOUNT_ERROR,
  UNLOADING,
  UNLOAD_ERROR,
  UNMOUNTING,
  UNMOUNT_ERROR,
  UPDATE_ERROR,
  UPDATING,
} from "./status";

export type LifecycleName =
  | "load"
  | "bootstrap"
  | "mount"
  | "update"
  | "unmount"
  | "unload";

export const rules = {
  load: {
    creator: true,
    timeout: 12000,
    status: [INITIAL, LOADING, LOADED, LOAD_ERROR],
  },
  bootstrap: {
    pre: "load",
    timeout: 4000,
    status: [LOADED, BOOTSTRAPPING, BOOTSTRAPPED, BOOTSTRAP_ERROR],
  },
  mount: {
    pre: "bootstrap",
    timeout: 3000,
    status: [BOOTSTRAPPED, MOUNTING, MOUNTED, MOUNT_ERROR],
  },
  update: {
    verify: true,
    timeout: 3000,
    status: [MOUNTED, UPDATING, MOUNTED, UPDATE_ERROR],
  },
  unmount: {
    timeout: 3000,
    status: [MOUNTED, UNMOUNTING, BOOTSTRAPPED, UNMOUNT_ERROR],
  },
  unload: {
    pre: "unmount",
    timeout: 3000,
    status: [BOOTSTRAPPED, UNLOADING, INITIAL, UNLOAD_ERROR],
  },
};
