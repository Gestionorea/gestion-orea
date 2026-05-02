'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  BarChart3,
  Briefcase,
  Building,
  CreditCard,
  Home,
  Lock,
  Menu,
  Receipt,
  Settings,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

const STORAGE_KEY = 'orea-sidebar-collapsed';

type SidebarProps = {
  locale: string;
  userRole: string;
};

type NavItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
};

function NavLink({
  item,
  collapsed,
  child,
}: {
  item: NavItem;
  collapsed: boolean;
  child?: boolean;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive = item.href ? pathname === item.href : false;

  if (!item.href) {
    return (
      <div
        className={[
          'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-gray-600',
          collapsed ? 'justify-center' : '',
        ].join(' ')}
        title={item.label}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className={collapsed ? 'hidden opacity-0' : 'truncate opacity-100 transition-opacity duration-200'}>
          {item.label}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={item.label}
      className={[
        'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
        isActive ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black',
        collapsed ? 'justify-center' : '',
        child && !collapsed ? 'ml-6' : '',
      ].join(' ')}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className={collapsed ? 'hidden opacity-0' : 'truncate opacity-100 transition-opacity duration-200'}>
        {item.label}
      </span>
    </Link>
  );
}

export default function Sidebar({ locale, userRole }: SidebarProps) {
  const t = useTranslations('perso');
  const [collapsed, setCollapsed] = useState(false);
  const storageLoadedRef = useRef(false);
  const isOwner = userRole === 'owner';

  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
      queueMicrotask(() => {
        storageLoadedRef.current = true;
        setCollapsed(storedCollapsed);
      });
    } catch {
      storageLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!storageLoadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // localStorage can be unavailable in private or restricted contexts.
    }
  }, [collapsed]);

  const navItems = useMemo<NavItem[]>(() => {
    const adminChildren: NavItem[] = isOwner
      ? [
          {
            href: `/${locale}/perso/admin/mot-de-passe`,
            label: t('nav.password'),
            icon: Lock,
          },
          {
            href: `/${locale}/perso/admin/utilisateurs`,
            label: t('nav.users'),
            icon: Users,
          },
          {
            href: `/${locale}/perso/admin/immeubles`,
            label: t('nav.compta.properties'),
            icon: Building,
          },
          {
            href: `/${locale}/perso/admin/compagnies`,
            label: t('nav.compta.companies'),
            icon: Briefcase,
          },
          {
            href: `/${locale}/perso/admin/categories`,
            label: t('nav.compta.categories'),
            icon: Tag,
          },
          {
            href: `/${locale}/perso/admin/sources-paiement`,
            label: t('nav.paymentSources'),
            icon: CreditCard,
          },
        ]
      : [];

    return [
      {
        href: `/${locale}/perso`,
        label: t('nav.home'),
        icon: Home,
      },
      {
        label: t('nav.compta.title'),
        icon: Wallet,
        children: [
          {
            href: `/${locale}/perso/comptabilite`,
            label: t('nav.compta.transactions'),
            icon: Receipt,
          },
          {
            href: `/${locale}/perso/comptabilite/dashboards`,
            label: t('nav.compta.dashboards'),
            icon: BarChart3,
          },
        ],
      },
      ...(adminChildren.length > 0
        ? [
            {
              label: t('nav.admin'),
              icon: Settings,
              children: adminChildren,
            },
          ]
        : []),
    ];
  }, [isOwner, locale, t]);

  return (
    <aside
      className={[
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-gray-200 bg-white px-3 py-6 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      ].join(' ')}
    >
      <div className={['flex items-center gap-3', collapsed ? 'justify-center' : 'justify-between'].join(' ')}>
        <div className={collapsed ? 'hidden' : 'min-w-0'}>
          <div className="mb-2 h-1 w-8 rounded-full bg-gold" />
          <div className="truncate font-serif text-xl tracking-wide text-black">ORÉA</div>
          <div className="mt-1 truncate text-[10px] uppercase tracking-[0.2em] text-gray-500">
            {t('headerLabel')}
          </div>
        </div>
        <button
          type="button"
          aria-label={t('sidebar.toggle')}
          title={t('sidebar.toggle')}
          onClick={() => setCollapsed((current) => !current)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-700 transition hover:border-black hover:text-black"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="mt-8 flex flex-col gap-6">
        {navItems.map((item) => (
          <div key={item.label} className="space-y-2">
            <NavLink item={item} collapsed={collapsed} />
            {item.children ? (
              <div className={collapsed ? 'space-y-2' : 'space-y-2'}>
                {item.children.map((child) => (
                  <NavLink key={child.href ?? child.label} item={child} collapsed={collapsed} child />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
