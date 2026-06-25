import { templateStore } from './templateStore';
import type {
  TemplateSnapshot,
  TemplateSubscriptionOptions,
} from './templateTypes';

export function templateCacheKey(
  options: TemplateSubscriptionOptions,
): string {
  return templateStore.cacheKey(options);
}

export function subscribeTemplate(
  options: TemplateSubscriptionOptions,
  listener: () => void,
): () => void {
  const key = templateStore.cacheKey(options);
  return templateStore.subscribe(key, options, listener);
}

export function getTemplateSnapshot(
  options: TemplateSubscriptionOptions,
): TemplateSnapshot {
  const key = templateStore.cacheKey(options);
  return templateStore.getSnapshot(key);
}
