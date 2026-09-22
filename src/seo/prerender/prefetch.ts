import { AppStore } from "../../store";
import { plansApiSlice } from "../../store/slices/plansSlice";

export type Prefetcher = (store: AppStore) => Promise<unknown>;

const PAGES_WITH_PRICING = ["/"];

// RTK Query hooks subscribe in effects, which renderToString never runs, so
// any data a prerendered page should contain is dispatched and awaited here
// before render. iOS prices are prerendered; the client refetches for Android
// after hydration (the two stores charge the same figures today).
export function prefetchersFor(path: string): Prefetcher[] {
  const list: Prefetcher[] = [];
  if (PAGES_WITH_PRICING.includes(path)) {
    list.push((store) => Promise.resolve(store.dispatch(plansApiSlice.endpoints.getVipPlans.initiate("ios") as any)));
  }
  return list;
}
