import {
  ShieldCheck,
  TrendingUp,
  Building2,
  Award,
} from 'lucide-react';

export const values = [
  { key: 'rigor', icon: ShieldCheck },
  { key: 'longterm', icon: TrendingUp },
  { key: 'local', icon: Building2 },
  { key: 'quality', icon: Award },
] as const;


export interface Building {
  id: string;
  key: string;
  image: string;
  type: 'residential' | 'commercial' | 'mixed';
  tag: string;
}

export const buildings: Building[] = [
  {
    id: 'b1',
    key: 'b1',
    image: '/images/portfolio/11-unites-granby.png',
    type: 'residential',
    tag: 'Value-add + repositionnement',
  },
  {
    id: 'b2',
    key: 'b2',
    image: '/images/portfolio/16-unites-laval.png',
    type: 'residential',
    tag: 'Repositionnement',
  },
  {
    id: 'b3',
    key: 'b3',
    image: '/images/portfolio/16-unites-longueuil.png',
    type: 'residential',
    tag: 'Repositionnement',
  },
  {
    id: 'b4',
    key: 'b4',
    image: '/images/portfolio/23-unites-sherbrooke.png',
    type: 'residential',
    tag: 'Repositionnement',
  },
  {
    id: 'b5',
    key: 'b5',
    image: '/images/portfolio/25-unites-sherbrooke.png',
    type: 'residential',
    tag: 'Value-add',
  },
  {
    id: 'b6',
    key: 'b6',
    image: '/images/portfolio/12-unites-granby.png',
    type: 'residential',
    tag: 'Value-add + repositionnement',
  },
  {
    id: 'b7',
    key: 'b7',
    image: '/images/portfolio/12-unites-sherbrooke.png',
    type: 'residential',
    tag: 'Repositionnement',
  },
];

export const stats = [
  { key: 'units', value: 350, suffix: '+' },
  { key: 'buildings', value: 30, suffix: '+' },
  { key: 'founded', value: 2020, suffix: '' },
  { key: 'markets', value: 3, suffix: '' },
] as const;

export const team = [
  {
    name: 'Olivier Lemieux',
    role: { fr: 'Président & Fondateur', en: 'President & Founder' },
    image: '/images/team/olivier-1.png',
  },
];
