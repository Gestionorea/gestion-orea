'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { stats } from '@/lib/data';

function AnimatedNumber({ value, suffix, duration = 2000 }: { value: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const start = 0;
    const end = value;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * (end - start) + start));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [hasStarted, value, duration]);

  return (
    <div ref={ref} className="font-serif text-4xl text-white lg:text-5xl">
      {count}{suffix}
    </div>
  );
}

export function StatsCounter() {
  const t = useTranslations('home.stats');

  return (
    <section className="bg-black py-20 lg:py-28">
      <Container>
        <div className="grid grid-cols-2 gap-12 lg:grid-cols-4 divide-x divide-white/10">
          {stats.map((stat) => (
            <div key={stat.key} className="text-center">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              <div className="mt-3 text-xs uppercase tracking-widest text-white/40">
                {t(stat.key)}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
