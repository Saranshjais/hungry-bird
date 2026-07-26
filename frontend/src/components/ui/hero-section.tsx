import React from 'react';
import { motion, Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FinancialHeroProps {
  title: React.ReactNode;
  description: string;
  buttonText: string;
  buttonLink: string;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const cardsVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
      staggerChildren: 0.3,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
};

export const FinancialHero = ({
  title,
  description,
  buttonText,
  buttonLink,
  className,
}: FinancialHeroProps) => {
  const gridBackgroundStyle = {
    backgroundImage:
      'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)',
    backgroundSize: '3rem 3rem',
  };

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden bg-background text-foreground',
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={gridBackgroundStyle}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />

      <motion.div
        className="relative container mx-auto flex min-h-[80vh] items-center justify-between px-6 py-20 lg:flex-row flex-col gap-12"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:w-1/2">
          <motion.h1
            className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
            variants={itemVariants}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-lg text-muted-foreground"
            variants={itemVariants}
          >
            {description}
          </motion.p>
          <motion.div variants={itemVariants} className="mt-8">
            <a href={buttonLink} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="h-12 px-8 text-base">
                {buttonText}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </motion.div>
        </div>

        <motion.div
          className="relative lg:w-1/2 h-full w-full flex items-center justify-center mt-12 lg:mt-0"
          variants={cardsVariants}
        >
          <motion.div 
            variants={cardItemVariants}
            className="relative w-[280px] sm:w-[300px] h-[600px] bg-stone-900 rounded-[2.5rem] p-2 shadow-2xl shadow-brand-500/20 border-4 border-stone-800 rotate-3 hover:rotate-0 transition-all duration-500"
          >
            {/* Android Hole-punch Camera */}
            <div className="absolute top-4 inset-x-0 mx-auto w-4 h-4 rounded-full bg-stone-950 z-20 border border-stone-800/50 flex justify-center items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-900/40"></div>
            </div>
            
            {/* Phone Screen */}
            <div className="relative w-full h-full bg-black rounded-[2rem] overflow-hidden">
               <video 
                 src="https://www.w3schools.com/html/mov_bbb.mp4" 
                 className="w-full h-full object-cover"
                 autoPlay 
                 muted 
                 loop 
                 playsInline 
               />
               <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                 <p className="text-white font-bold text-center px-4 bg-black/60 py-2 rounded-lg backdrop-blur-sm">Placeholder Video<br/><span className="text-sm font-normal text-stone-300">Replace with your app video</span></p>
               </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};
