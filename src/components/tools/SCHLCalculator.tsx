'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

const RCD_OPTIONS = [1.1, 1.2, 1.3];
const RPV = 0.85;
const RATE_OPTIONS = [3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0];
const AMORT_OPTIONS = [30, 35, 40, 45, 50];

const NORM_ENTRETIEN = 610;
const NORM_CONCIERGERIE = 365;
const NORM_RESERVE = 190;
const NORM_GESTION_PCT = 0.05;

function calculatePV(payment: number, monthlyRate: number, totalMonths: number): number {
  if (monthlyRate === 0) return payment * totalMonths;
  return payment * (1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseNumber(val: string): number {
  return parseFloat(val.replace(/\s/g, '').replace(/,/g, '.')) || 0;
}

// Stepper component for numbers
function Stepper({ label, value, options, onChange, format }: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const currentIndex = options.indexOf(value);
  const canUp = currentIndex < options.length - 1;
  const canDown = currentIndex > 0;

  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-gray mb-3 block">{label}</label>
      <div className="flex items-center gap-4">
        <button
          onClick={() => canDown && onChange(options[currentIndex - 1])}
          className={`h-10 w-10 flex items-center justify-center border border-gray-light transition-all duration-200 cursor-pointer ${canDown ? 'hover:border-black hover:bg-black hover:text-white' : 'opacity-20 cursor-default'}`}
          disabled={!canDown}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <span className="font-serif text-xl text-black min-w-[4rem] text-center">
          {format(value)}
        </span>
        <button
          onClick={() => canUp && onChange(options[currentIndex + 1])}
          className={`h-10 w-10 flex items-center justify-center border border-gray-light transition-all duration-200 cursor-pointer ${canUp ? 'hover:border-black hover:bg-black hover:text-white' : 'opacity-20 cursor-default'}`}
          disabled={!canUp}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SCHLCalculator() {
  const t = useTranslations('tools.calculator');

  const [revenuBrut, setRevenuBrut] = useState('');
  const [portes, setPortes] = useState('');
  const [taxesMuni, setTaxesMuni] = useState('');
  const [taxesScol, setTaxesScol] = useState('');
  const [assurances, setAssurances] = useState('');
  const [hydroGaz, setHydroGaz] = useState('');
  const [rcd, setRcd] = useState(1.1);
  const [taux, setTaux] = useState(4.0);
  const [amort, setAmort] = useState(30);
  const [showNorm, setShowNorm] = useState(false);

  const depensesNorm = useMemo(() => {
    const rb = parseNumber(revenuBrut);
    const nbPortes = parseNumber(portes) || 0;
    return {
      entretien: NORM_ENTRETIEN * nbPortes,
      conciergerie: NORM_CONCIERGERIE * nbPortes,
      reserve: NORM_RESERVE * nbPortes,
      gestion: rb * NORM_GESTION_PCT,
      total: NORM_ENTRETIEN * nbPortes + NORM_CONCIERGERIE * nbPortes + NORM_RESERVE * nbPortes + rb * NORM_GESTION_PCT,
    };
  }, [revenuBrut, portes]);

  const results = useMemo(() => {
    const rb = parseNumber(revenuBrut);
    if (rb <= 0) return null;

    const rbe = rb * 0.97;
    const depReelles = parseNumber(taxesMuni) + parseNumber(taxesScol) + parseNumber(assurances) + parseNumber(hydroGaz);
    const depTotal = depReelles + depensesNorm.total;

    const rne = rbe - depTotal;
    if (rne <= 0) return null;

    const paiementAnnuel = rne / rcd;
    const paiementMensuel = paiementAnnuel / 12;
    const monthlyRate = (taux / 100) / 12;
    const totalMonths = amort * 12;
    const pretMax = calculatePV(paiementMensuel, monthlyRate, totalMonths);
    const valeurEco = pretMax / RPV;

    return { rbe, rne, depTotal, paiementAnnuel, paiementMensuel, pretMax, valeurEco };
  }, [revenuBrut, taxesMuni, taxesScol, assurances, hydroGaz, depensesNorm, rcd, taux, amort]);

  const inputClasses =
    'w-full border-b border-gray-light bg-transparent py-3 text-base text-black outline-none transition-all placeholder:text-gray/30 focus:border-black font-serif text-lg';

  return (
    <div className="grid gap-16 lg:grid-cols-5">
      {/* Inputs — 3 cols */}
      <div className="lg:col-span-3 space-y-12">

        {/* Step 1: Revenus */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="flex h-8 w-8 items-center justify-center bg-black text-white text-xs font-serif">1</span>
            <h3 className="font-serif text-xl text-black">{t('revenus')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="text-xs uppercase tracking-widest text-gray mb-2 block">{t('revenuBrut')}</label>
              <div className="relative">
                <span className="absolute left-0 top-3 text-gray">$</span>
                <input
                  type="text"
                  value={revenuBrut}
                  onChange={(e) => setRevenuBrut(e.target.value)}
                  className={`${inputClasses} pl-4`}
                  placeholder="150 000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-gray mb-2 block">{t('portes')}</label>
              <input
                type="text"
                value={portes}
                onChange={(e) => setPortes(e.target.value)}
                className={inputClasses}
                placeholder="12"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Dépenses réelles */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="flex h-8 w-8 items-center justify-center bg-black text-white text-xs font-serif">2</span>
            <h3 className="font-serif text-xl text-black">{t('depensesReelles')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="text-xs uppercase tracking-widest text-gray mb-2 block">{t('taxesMuni')}</label>
              <div className="relative">
                <span className="absolute left-0 top-3 text-gray">$</span>
                <input type="text" value={taxesMuni} onChange={(e) => setTaxesMuni(e.target.value)} className={`${inputClasses} pl-4`} placeholder="12 000" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-gray mb-2 block">{t('taxesScol')}</label>
              <div className="relative">
                <span className="absolute left-0 top-3 text-gray">$</span>
                <input type="text" value={taxesScol} onChange={(e) => setTaxesScol(e.target.value)} className={`${inputClasses} pl-4`} placeholder="2 000" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-gray mb-2 block">{t('assurances')}</label>
              <div className="relative">
                <span className="absolute left-0 top-3 text-gray">$</span>
                <input type="text" value={assurances} onChange={(e) => setAssurances(e.target.value)} className={`${inputClasses} pl-4`} placeholder="4 000" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-gray mb-2 block">{t('hydroGaz')}</label>
              <div className="relative">
                <span className="absolute left-0 top-3 text-gray">$</span>
                <input type="text" value={hydroGaz} onChange={(e) => setHydroGaz(e.target.value)} className={`${inputClasses} pl-4`} placeholder="3 000" />
              </div>
            </div>
          </div>

          {/* Dépenses normalisées — collapsible */}
          <div className="mt-8">
            <button
              onClick={() => setShowNorm(!showNorm)}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray hover:text-black transition-colors cursor-pointer"
            >
              {t('depensesNorm')} — {formatCurrency(depensesNorm.total)}
              {showNorm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <AnimatePresence>
              {showNorm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-gray/60 mt-3 mb-4">{t('depensesNormDesc')}</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray">{t('entretien')}</span>
                      <span className="text-black">{formatCurrency(depensesNorm.entretien)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray">{t('conciergerie')}</span>
                      <span className="text-black">{formatCurrency(depensesNorm.conciergerie)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray">{t('reserve')}</span>
                      <span className="text-black">{formatCurrency(depensesNorm.reserve)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray">{t('gestion')}</span>
                      <span className="text-black">{formatCurrency(depensesNorm.gestion)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Step 3: Paramètres SCHL */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="flex h-8 w-8 items-center justify-center bg-black text-white text-xs font-serif">3</span>
            <h3 className="font-serif text-xl text-black">{t('parametres')}</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <Stepper
              label={t('rcd')}
              value={rcd}
              options={RCD_OPTIONS}
              onChange={setRcd}
              format={(v) => `${v.toFixed(1)}x`}
            />
            <div>
              <label className="text-xs uppercase tracking-widest text-gray mb-3 block">{t('rpv')}</label>
              <span className="font-serif text-xl text-black">85%</span>
            </div>
            <Stepper
              label={t('taux')}
              value={taux}
              options={RATE_OPTIONS}
              onChange={setTaux}
              format={(v) => `${v.toFixed(2)}%`}
            />
            <Stepper
              label={t('amortissement')}
              value={amort}
              options={AMORT_OPTIONS}
              onChange={setAmort}
              format={(v) => `${v} ${t('years')}`}
            />
          </div>
        </div>
      </div>

      {/* Results — 2 cols, sticky */}
      <div className="lg:col-span-2 lg:sticky lg:top-32 lg:self-start">
        <AnimatePresence mode="wait">
          {results ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="bg-black p-8 lg:p-10"
            >
              <div className="h-px w-10 bg-gold mb-6" />
              <h3 className="font-serif text-2xl text-white sm:text-3xl">
                {t('result')}
              </h3>

              <div className="mt-8">
                <p className="text-xs uppercase tracking-widest text-white/40">
                  {t('valeurEconomique')}
                </p>
                <p className="mt-2 font-serif text-4xl text-gold lg:text-5xl">
                  {formatCurrency(results.valeurEco)}
                </p>
              </div>

              <div className="mt-8 h-px w-full bg-white/10" />

              <div className="mt-8 space-y-5">
                {[
                  { label: t('pretMax'), value: results.pretMax },
                  { label: t('rbe'), value: results.rbe },
                  { label: t('rne'), value: results.rne },
                  { label: t('depensesTotal'), value: results.depTotal },
                  { label: t('paiementMensuel'), value: results.paiementMensuel },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-baseline">
                    <span className="text-xs uppercase tracking-widest text-white/40">
                      {item.label}
                    </span>
                    <span className="font-serif text-lg text-white">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-[0.6rem] text-white/15 leading-relaxed">
                {t('disclaimer')}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-96 items-center justify-center bg-black/[0.03] border border-gray-light/50"
            >
              <div className="text-center px-8">
                <Calculator className="h-8 w-8 text-gray/20 mx-auto mb-4" />
                <p className="font-serif text-base text-gray/40 italic">
                  {t('placeholder')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
