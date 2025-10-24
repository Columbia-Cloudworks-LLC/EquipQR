export interface PartCardDto {
  id: string;
  canonical_mpn: string;
  title: string;
  brand: string;
  category: string;
  distributor_count: number;
  has_distributors: boolean;
}

export interface PartDetailDto {
  part: {
    id: string;
    canonical_mpn: string;
    title: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    attributes: Record<string, unknown> | null;
    synonyms: string[] | null;
  };
  distributors: Array<{
    name: string | null;
    phone: string | null;
    website: string | null;
    email: string | null;
  }>;
}
