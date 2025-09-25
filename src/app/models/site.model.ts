export interface ProductVariantSelection {
  size?: string;
  color?: string;
}

export interface ProductDetails {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  gallery?: string[];
  sizes?: string[];
  colors?: string[];
  category?: string;
  subCategory?: string;
  highlight: string;
  slug: string;
}

export interface GeneratedSite {
  storeName: string;
  tagline: string;
  logoUrl: string;
  heroImageUrl: string;
  heroCtaLabel: string;
  heroCtaLink: string;
  primaryColor: string;
  accentColor: string;
  about: {
    title: string;
    description: string;
  };
  contact: {
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    instagramUrl: string;
    facebookUrl: string;
  };
  products: ProductDetails[];
}
