interface DomainDefaultEntry {
  name: string;
  domains: string[];
  category?: string;
  inserterDefault?: boolean;
}

export declare function resolveDomainDefault(
  entries: readonly DomainDefaultEntry[],
  domain: string,
): string;

export declare function domainDefaultWidgets(
  entries: readonly DomainDefaultEntry[],
): Record<string, string>;
