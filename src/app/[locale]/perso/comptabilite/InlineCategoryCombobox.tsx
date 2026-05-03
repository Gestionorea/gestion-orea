'use client';

import type { CategoryType } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type MouseEvent } from 'react';
import { getInlineCategorySuggestions, type InlineSuggestion } from '@/app/actions/inline-category-suggestions';
import { updateTransactionCategory } from '@/app/actions/inline-update-transaction';
import CreateCategoryModal from '@/app/[locale]/perso/comptabilite/import-releve/CreateCategoryModal';
import { expandSynonyms, matchesExpandedSearch } from '@/lib/category-synonyms';

export type InlineCategoryOption = {
  id: string;
  name: string;
  type: CategoryType;
};

type InlineCategoryComboboxProps = {
  transactionId: string;
  currentCategoryId: string | null;
  categories: InlineCategoryOption[];
  transactionDescription?: string;
  paymentSourceId?: string | null;
};

type Feedback = 'idle' | 'success' | 'error';

function mergeCategories(categories: InlineCategoryOption[], newCategory: InlineCategoryOption) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  byId.set(newCategory.id, newCategory);
  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export default function InlineCategoryCombobox({
  transactionId,
  currentCategoryId,
  categories: initialCategories,
}: InlineCategoryComboboxProps) {
  const t = useTranslations('perso.compta.inlineEdit');
  const [categories, setCategories] = useState(initialCategories);
  const [value, setValue] = useState<string | null>(currentCategoryId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<InlineSuggestion[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentCategory = useMemo(
    () => categories.find((category) => category.id === value) ?? null,
    [categories, value],
  );
  const displayLabel = currentCategory?.name ?? t('noCategory');
  const trimmedSearch = search.trim();
  const filteredCategories = useMemo(() => {
    if (!trimmedSearch) return categories;

    const expandedTerms = expandSynonyms(trimmedSearch);
    return categories.filter((category) => matchesExpandedSearch(category.name, expandedTerms));
  }, [categories, trimmedSearch]);
  const exactMatchExists = useMemo(
    () => categories.some((category) => category.name.toLowerCase() === trimmedSearch.toLowerCase()),
    [categories, trimmedSearch],
  );
  const visibleSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return suggestions.filter((suggestion) => {
      if (seen.has(suggestion.category.id)) return false;
      seen.add(suggestion.category.id);
      return true;
    });
  }, [suggestions]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function stopRowNavigation(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
  }

  function resetFeedbackLater() {
    window.setTimeout(() => setFeedback('idle'), 2000);
  }

  async function loadSuggestions() {
    if (suggestionsLoaded || loadingSuggestions) return;

    setLoadingSuggestions(true);
    const result = await getInlineCategorySuggestions({ transactionId });
    if (result.ok) setSuggestions(result.suggestions);
    setSuggestionsLoaded(true);
    setLoadingSuggestions(false);
  }

  function openPanel() {
    setOpen(true);
    void loadSuggestions();
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function togglePanel() {
    if (open) {
      setOpen(false);
      return;
    }

    openPanel();
  }

  function handleSelect(categoryId: string | null) {
    const previous = value;
    setValue(categoryId);
    setOpen(false);
    setSearch('');
    setFeedback('idle');

    startTransition(async () => {
      const result = await updateTransactionCategory(transactionId, categoryId);
      if (result.ok) {
        setFeedback('success');
        resetFeedbackLater();
        return;
      }

      setValue(previous);
      setFeedback('error');
      resetFeedbackLater();
    });
  }

  function handleCreateNew() {
    setOpen(false);
    setShowCreateModal(true);
  }

  function handleCategoryCreated(category: InlineCategoryOption) {
    setCategories((current) => mergeCategories(current, category));
    setShowCreateModal(false);
    handleSelect(category.id);
  }

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-1"
      onClick={stopRowNavigation}
      onKeyDown={stopRowNavigation}
    >
      <button
        type="button"
        onClick={togglePanel}
        disabled={isPending}
        className="flex w-full max-w-[210px] items-center justify-between gap-2 border border-gray-300 bg-white px-2 py-1 text-left text-sm hover:border-gray-500 disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        <span className={`truncate ${value ? 'text-black' : 'text-gray-400'}`}>{displayLabel}</span>
        <span className="text-xs text-gray-400" aria-hidden="true">
          v
        </span>
      </button>

      {isPending ? <span className="text-xs text-gray-400">...</span> : null}
      {feedback === 'success' ? <span className="text-xs text-green-600">OK</span> : null}
      {feedback === 'error' ? <span className="text-xs text-red-600">!</span> : null}

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-96 w-72 overflow-auto border border-gray-300 bg-white shadow-lg">
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-2">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full border border-gray-300 px-2 py-1 text-sm outline-none focus:border-black"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
              value === null ? 'bg-gray-100 font-medium text-black' : 'text-gray-500'
            }`}
          >
            {t('noCategory')}
          </button>

          {trimmedSearch && !exactMatchExists ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
            >
              + {t('createNamed', { name: trimmedSearch })}
            </button>
          ) : null}

          {!trimmedSearch ? (
            <>
              <div className="border-t border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                {loadingSuggestions ? t('loadingSuggestions') : t('suggestionsHeader')}
              </div>
              {visibleSuggestions.map((suggestion) => (
                <button
                  key={`suggestion-${suggestion.category.id}`}
                  type="button"
                  onClick={() => handleSelect(suggestion.category.id)}
                  title={suggestion.reason}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                    value === suggestion.category.id ? 'bg-blue-50 font-medium' : ''
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate">{suggestion.category.name}</span>
                    <span className="shrink-0 text-xs uppercase text-gray-400">{suggestion.confidence}</span>
                  </span>
                </button>
              ))}
            </>
          ) : null}

          <div className="border-t border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
            {trimmedSearch ? t('matchingCategories', { count: filteredCategories.length }) : t('allCategories')}
          </div>
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleSelect(category.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  value === category.id ? 'bg-gray-100 font-medium' : ''
                }`}
              >
                {category.name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">{t('noResults')}</div>
          )}

          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
            >
              + {trimmedSearch && !exactMatchExists ? t('createNamed', { name: trimmedSearch }) : t('createNew')}
            </button>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <CreateCategoryModal
          defaultType="both"
          onCancel={() => setShowCreateModal(false)}
          onCreated={handleCategoryCreated}
        />
      ) : null}
    </div>
  );
}
