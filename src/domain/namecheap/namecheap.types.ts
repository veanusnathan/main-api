/** Parsed domain node from getList (attributes become @_ID, @_Name, etc.) */
export interface NamecheapDomainListItemRaw {
  '@_ID'?: string;
  '@_Name'?: string;
  '@_User'?: string;
  '@_Created'?: string;
  '@_Expires'?: string;
  '@_IsExpired'?: string;
  '@_IsLocked'?: string;
  '@_AutoRenew'?: string;
  '@_WhoisGuard'?: string;
  '@_IsPremium'?: string;
  '@_IsOurDNS'?: string;
}

/** Normalized domain from getList for our app */
export interface NamecheapDomainListItem {
  id: string;
  name: string;
  user: string;
  created: string;
  expires: string;
  isExpired: boolean;
  isLocked: boolean;
  autoRenew: boolean;
  whoisGuard: string;
  isPremium: boolean;
  isOurDns: boolean;
}

export interface NamecheapGetListResult {
  Domain?: NamecheapDomainListItemRaw | NamecheapDomainListItemRaw[];
  Paging?: {
    TotalItems?: string;
    CurrentPage?: string;
    PageSize?: string;
  };
}

export interface NamecheapDomainRenewResult {
  DomainName: string;
  DomainID: string;
  Renew: string;
  OrderID?: string;
  TransactionID?: string;
  ChargedAmount?: string;
  DomainDetails?: {
    ExpiredDate: string;
    NumYears: string;
  };
}

export interface NamecheapDomainGetInfoResult {
  Status: string;
  ID: string;
  DomainName: string;
  OwnerName?: string;
  IsOwner?: string;
  IsPremium?: string;
  DomainDetails?: {
    CreatedDate: string;
    ExpiredDate: string;
  };
  DnsDetails?: { ProviderType: string };
}
