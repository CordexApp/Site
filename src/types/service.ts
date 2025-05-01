export interface Service {
  id: string;
  name: string;
  endpoint: string;
  image?: string;
  provider_contract_address?: string;
  coin_contract_address?: string;
  bonding_curve_address?: string;
  created_at: string;
  updated_at: string;
}
