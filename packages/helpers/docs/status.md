# status

Contains the enum Status which enumerates standard HTTP status codes and provides several type guards for handling status codes with type safety.

## Examples

```ts
import {
  Status,
  STATUS_TEXT,
} from "@web-widget/helpers/status";
 *
console.log(Status.NotFound); //=> 404
console.log(STATUS_TEXT[Status.NotFound]); //=> "Not Found"
```
