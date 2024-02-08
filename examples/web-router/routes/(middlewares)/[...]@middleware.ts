import { composeMiddleware } from '@web-widget/helpers';
import { handler as spider } from './spider';
import { handler as poweredBy } from './powered-by';

export const handler = composeMiddleware([spider, poweredBy]);
