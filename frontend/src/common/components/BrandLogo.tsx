import React from 'react';
import { useTranslation } from 'react-i18next';

type BrandLogoProps = {
  className?: string;
  markWrapperClassName?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  accentClassName?: string;
  showWordmark?: boolean;
  showMark?: boolean;
  alt?: string;
};

/**
 * Canonical SehatSetu branding used by the main header and its context variants.
 * The mark stays the official SVG asset; only the wordmark colors/sizing vary by context.
 */
const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  markWrapperClassName = 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 flex items-center justify-center p-1.5 shadow-xs',
  markClassName = 'w-full h-full object-contain',
  wordmarkClassName = 'font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight brand-title',
  accentClassName = 'text-blue-600 brand-title-accent',
  showWordmark = true,
  showMark = true,
  alt,
}) => {
  const { t } = useTranslation('common');
  const brandName = t('brand.name');
  const brandSuffix = t('brand.taglineShort');
  const hasBrandSuffix = Boolean(
    brandSuffix &&
    brandSuffix !== 'brand.taglineShort' &&
    brandName.endsWith(brandSuffix),
  );
  const brandPrefix = hasBrandSuffix ? brandName.slice(0, -brandSuffix.length) : brandName;
  const wordmark = (
    <span className={wordmarkClassName}>
      {brandPrefix}
      {hasBrandSuffix && <span className={accentClassName}>{brandSuffix}</span>}
    </span>
  );
  const mark = (
    <img
      src="/logo.svg"
      alt={alt ?? (showWordmark ? '' : brandName)}
      aria-hidden={alt === '' || showWordmark ? true : undefined}
      className={markClassName}
    />
  );

  if (!showMark) return wordmark;

  if (!showWordmark) {
    return markWrapperClassName ? (
      <span className={markWrapperClassName}>{mark}</span>
    ) : (
      mark
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <span className={markWrapperClassName}>{mark}</span>
      {wordmark}
    </span>
  );
};

export default BrandLogo;
