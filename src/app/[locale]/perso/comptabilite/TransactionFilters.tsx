import { getTranslations } from 'next-intl/server';
import type { CategoryItem } from '@/lib/categories';
import type { CompanyItem } from '@/lib/companies';
import type { PropertyItem } from '@/lib/properties';

export default async function TransactionFilters({
  properties,
  companies,
  categories,
  searchParams,
}: {
  properties: PropertyItem[];
  companies: CompanyItem[];
  categories: CategoryItem[];
  searchParams: Record<string, string>;
}) {
  const t = await getTranslations('perso.compta');

  return (
    <form className="mt-8 grid gap-3 md:grid-cols-4">
      <input type="hidden" name="year" value={searchParams.year} />
      <select name="month" defaultValue={searchParams.month ?? ''} className="border border-gray-300 px-3 py-2 text-sm">
        <option value="">{t('filters.allMonths')}</option>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
          <option key={month} value={month}>{t(`months.${month}`)}</option>
        ))}
      </select>
      <select name="type" defaultValue={searchParams.type ?? ''} className="border border-gray-300 px-3 py-2 text-sm">
        <option value="">{t('filters.allTypes')}</option>
        <option value="income">{t('types.income')}</option>
        <option value="expense">{t('types.expense')}</option>
      </select>
      <select name="propertyId" defaultValue={searchParams.propertyId ?? ''} className="border border-gray-300 px-3 py-2 text-sm">
        <option value="">{t('filters.allProperties')}</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>{property.name}</option>
        ))}
      </select>
      <select name="companyId" defaultValue={searchParams.companyId ?? ''} className="border border-gray-300 px-3 py-2 text-sm">
        <option value="">{t('filters.allCompanies')}</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>{company.name}</option>
        ))}
      </select>
      <select name="categoryId" defaultValue={searchParams.categoryId ?? ''} className="border border-gray-300 px-3 py-2 text-sm">
        <option value="">{t('filters.allCategories')}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>
      <select name="paymentMethod" defaultValue={searchParams.paymentMethod ?? ''} className="border border-gray-300 px-3 py-2 text-sm">
        <option value="">{t('filters.allPayments')}</option>
        {['interac', 'credit_card', 'cash', 'wire', 'check', 'other'].map((method) => (
          <option key={method} value={method}>{t(`paymentMethods.${method}`)}</option>
        ))}
      </select>
      <input
        name="q"
        defaultValue={searchParams.q ?? ''}
        placeholder={t('filters.search')}
        className="border border-gray-300 px-3 py-2 text-sm"
      />
      <select name="sort" defaultValue={searchParams.sort ?? 'date_desc'} className="border border-gray-300 px-3 py-2 text-sm">
        <option value="date_desc">{t('sort.dateDesc')}</option>
        <option value="date_asc">{t('sort.dateAsc')}</option>
        <option value="amount_desc">{t('sort.amountDesc')}</option>
        <option value="amount_asc">{t('sort.amountAsc')}</option>
      </select>
      <button className="bg-black px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white">
        {t('filters.apply')}
      </button>
    </form>
  );
}
