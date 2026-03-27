import { clsx } from 'clsx';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}

export function SectionHeading({
  title,
  subtitle,
  centered = true,
  light = false,
}: SectionHeadingProps) {
  return (
    <div className={clsx('mb-16 lg:mb-20', centered && 'text-center')}>
      <h2
        className={clsx(
          'font-serif text-3xl font-normal tracking-tight sm:text-4xl lg:text-5xl',
          light ? 'text-white' : 'text-black'
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={clsx(
            'mt-5 max-w-xl text-base leading-relaxed',
            centered && 'mx-auto',
            light ? 'text-white/60' : 'text-gray'
          )}
        >
          {subtitle}
        </p>
      )}
      <div
        className={clsx(
          'mt-6 h-px w-16',
          centered && 'mx-auto',
          light ? 'bg-gray' : 'bg-gray'
        )}
      />
    </div>
  );
}
