import { firstMarketingABTest, secondMarketingABTest } from './flags';

export const marketingFlags = [firstMarketingABTest, secondMarketingABTest];

export function createVisitorId() {
  return crypto.randomUUID().replace(/-/g, '');
}
