import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { RainbowButton } from "@/components/ui/rainbow-button";

interface AnimatedHeroProps {
  onGetStartedClick?: () => void;
}

function AnimatedHero({ onGetStartedClick }: AnimatedHeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["simple", "powerful", "secure", "unified", "smart"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-12 lg:py-20 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col">
            <h1 className="text-4xl sm:text-5xl md:text-7xl max-w-4xl tracking-tighter text-center font-regular">
              <span className="text-white">All your money,</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold text-blue-400"
                    initial={{ opacity: 0, y: -100 }}
                    transition={{ 
                      duration: 0.6,
                      ease: [0.25, 0.1, 0.25, 1.0]
                    }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl leading-relaxed tracking-tight text-gray-300 max-w-2xl text-center mx-auto">
              Track all your bank, card, stock, and crypto accounts — in one place. Free forever, no card needed.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <RainbowButton 
              onClick={onGetStartedClick}
              className="text-base sm:text-lg px-8 sm:px-12 py-4 sm:py-6 h-auto gap-2"
              data-testid="button-hero-cta"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </RainbowButton>
          </div>
          <p className="text-sm text-blue-300">
            No credit card required · Join 3,000+ users
          </p>
        </div>
      </div>
    </div>
  );
}

export { AnimatedHero };
