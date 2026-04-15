'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Gallery thumbnails used as template previews
const TEMPLATE_THUMBS = [
  '/gallery/anime.jpg',
  '/gallery/city.jpg',
  '/gallery/robot.jpg',
  '/gallery/dream.jpg',
  '/gallery/soldier.jpg',
  '/gallery/dragon.png',
];

// Scattered positions (desktop): top%, left% — verified non-overlapping for w-72 (288px) cards
const SCATTERED_POSITIONS = [
  { top: '3%',  left: '1%',  rotate: '-4deg' },
  { top: '5%',  left: '35%', rotate: '3deg'  },
  { top: '3%',  left: '69%', rotate: '-2deg' },
  { top: '54%', left: '2%',  rotate: '5deg'  },
  { top: '56%', left: '36%', rotate: '-3deg' },
  { top: '53%', left: '70%', rotate: '4deg'  },
];

// Extended template list for modal (12 templates)
const MODAL_TEMPLATES = [
  { id: '1',  thumb: '/gallery/anime.jpg',       category: 'Narrative', zhCategory: '叙事'  },
  { id: '2',  thumb: '/gallery/city.jpg',        category: 'Marketing', zhCategory: '营销'  },
  { id: '3',  thumb: '/gallery/robot.jpg',       category: 'Video',     zhCategory: '视频'  },
  { id: '4',  thumb: '/gallery/dream.jpg',       category: 'Image',     zhCategory: '图片'  },
  { id: '5',  thumb: '/gallery/soldier.jpg',     category: 'Design',    zhCategory: '设计'  },
  { id: '6',  thumb: '/gallery/dragon.png',      category: 'Anime',     zhCategory: '动漫'  },
  { id: '7',  thumb: '/gallery/allien.jpg',      category: 'Narrative', zhCategory: '叙事'  },
  { id: '8',  thumb: '/gallery/car.jpg',         category: 'Marketing', zhCategory: '营销'  },
  { id: '9',  thumb: '/gallery/cyborg.webp',     category: 'Design',    zhCategory: '设计'  },
  { id: '10', thumb: '/gallery/fox.jpg',         category: 'Image',     zhCategory: '图片'  },
  { id: '11', thumb: '/gallery/ship.jpg',        category: 'Video',     zhCategory: '视频'  },
  { id: '12', thumb: '/gallery/mythic_fighter.webp', category: 'Anime', zhCategory: '动漫'  },
];

export function TemplateShowcase() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isZh = i18n.language.startsWith('zh');

  const items = t('landing.templates.items', { returnObjects: true }) as Array<{
    title: string;
    category: string;
  }>;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Staggered scroll-reveal
  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const modalCategories = ['All', 'Narrative', 'Marketing', 'Video', 'Image', 'Design', 'Anime'];

  const filteredTemplates =
    activeCategory === 'All'
      ? MODAL_TEMPLATES
      : MODAL_TEMPLATES.filter((t) => t.category === activeCategory);

  const handleTemplateClick = (id: string) => {
    router.push(`/login?template=${id}`);
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <div
          ref={(el) => { cardRefs.current[0] = el; }}
          className="scroll-reveal text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('landing.templates.title')}
          </h2>
          <p className="text-lg text-[var(--color-muted)] max-w-2xl mx-auto">
            {t('landing.templates.subtitle')}
          </p>
        </div>

        {/* Scattered layout — desktop: absolute positions; mobile: grid */}
        <div
          className="relative hidden md:block"
          style={{ height: 680 }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i + 1] = el; }}
              className="scroll-reveal absolute w-72 cursor-pointer group"
              style={{
                top: SCATTERED_POSITIONS[i]?.top,
                left: SCATTERED_POSITIONS[i]?.left,
                transform: `rotate(${SCATTERED_POSITIONS[i]?.rotate})`,
                transitionDelay: `${i * 100}ms`,
              }}
              onClick={() => setIsModalOpen(true)}
            >
              <div
                className="rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-105"
                style={{
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <div className="relative" style={{ aspectRatio: '4/3' }}>
                  <Image
                    src={TEMPLATE_THUMBS[i] ?? TEMPLATE_THUMBS[0]}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="288px"
                  />
                </div>
                <div
                  className="px-4 py-3"
                  style={{ background: 'rgba(13,21,37,0.92)', backdropFilter: 'blur(8px)' }}
                >
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <span
                    className="inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(59,130,246,0.2)', color: 'var(--color-electric)' }}
                  >
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile grid */}
        <div className="grid grid-cols-2 gap-4 md:hidden">
          {items.map((item, i) => (
            <div
              key={i}
              className="cursor-pointer group"
              onClick={() => setIsModalOpen(true)}
            >
              <div
                className="rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-105"
                style={{ border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <div className="relative" style={{ aspectRatio: '4/3' }}>
                  <Image
                    src={TEMPLATE_THUMBS[i] ?? TEMPLATE_THUMBS[0]}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 192px"
                  />
                </div>
                <div className="p-3" style={{ background: 'rgba(13,21,37,0.92)' }}>
                  <p className="text-xs font-medium text-white truncate">{item.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Browse all button */}
        <div className="text-center mt-12">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: 'white',
            }}
          >
            {t('landing.templates.browseAll')}
          </button>
        </div>
      </div>

      {/* ─── Template Browser Modal ───────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--color-frame)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <h3 className="text-lg font-semibold text-white">
                {t('landing.templates.modal.title')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-[var(--color-muted)] hover:text-white hover:bg-white/10 transition-colors"
                aria-label={t('landing.templates.modal.close')}
              >
                ✕
              </button>
            </div>

            {/* Category filter */}
            <div
              className="flex gap-2 px-6 py-3 overflow-x-auto scrollbar-none border-b"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              {modalCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150"
                  style={
                    activeCategory === cat
                      ? { background: 'var(--color-electric)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'var(--color-muted)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {cat === 'All' ? t('landing.templates.modal.allCategories') : cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredTemplates.length === 0 ? (
                <p className="text-center text-[var(--color-muted)] py-12">
                  {t('landing.templates.modal.noTemplates')}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group cursor-pointer rounded-xl overflow-hidden transition-transform duration-200 hover:scale-105"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      onClick={() => handleTemplateClick(tpl.id)}
                    >
                      <div className="relative" style={{ aspectRatio: '4/3' }}>
                        <Image
                          src={tpl.thumb}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        {/* Hover overlay */}
                        <div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ background: 'rgba(0,0,0,0.5)' }}
                        >
                          <span
                            className="text-xs font-semibold px-3 py-1.5 rounded-full"
                            style={{ background: 'var(--color-electric)', color: '#fff' }}
                          >
                            {t('landing.templates.modal.useTemplate')}
                          </span>
                        </div>
                      </div>
                      <div
                        className="px-3 py-2"
                        style={{ background: 'rgba(13,21,37,0.92)' }}
                      >
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(59,130,246,0.2)', color: 'var(--color-electric)' }}
                        >
                          {isZh ? tpl.zhCategory : tpl.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
