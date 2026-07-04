import * as React from "react";
import { cn } from "@/lib/utils"; // Your utility for merging class names
import { ArrowRight } from "lucide-react";

// Define the props for the DestinationCard component
interface DestinationCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  location: string;
  flag?: string;
  stats: string;
  href: string;
  themeColor: string; // e.g., "150 50% 25%" for a deep green
}

const DestinationCard = React.forwardRef<HTMLDivElement, DestinationCardProps>(
  ({ className, imageUrl, location, flag, stats, href, themeColor, ...props }, ref) => {
    return (
      // The 'group' class enables hover effects on child elements
      <div
        ref={ref}
        style={{
          // @ts-ignore - CSS custom properties are valid
          "--theme-color": themeColor,
        } as React.CSSProperties}
        className={cn("group w-full h-full", className)}
        {...props}
      >
        <a
          href={href}
          className="relative block w-full h-full rounded-[1.25rem] overflow-hidden shadow-sm 
                     transition-all duration-500 ease-in-out 
                     group-hover:scale-[1.02] group-hover:shadow-[0_0_40px_-10px_hsl(var(--theme-color)/0.5)]"
          aria-label={`Explore details for ${location}`}
        >
          {/* Background Image with Parallax Zoom */}
          <div
            className="absolute inset-0 bg-cover bg-center 
                       transition-transform duration-700 ease-in-out group-hover:scale-110"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />

          {/* Dark Base Gradient for Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0" />

          {/* Themed Gradient Overlay (Blend Mode) */}
          <div
            className="absolute inset-0 transition-opacity duration-500 opacity-60 group-hover:opacity-90 mix-blend-color z-0"
            style={{
              background: `linear-gradient(to top, hsl(var(--theme-color)), transparent)`,
            }}
          />
          
          {/* Content */}
          <div className="relative flex flex-col justify-end h-full p-6 sm:p-8 z-10">
            <h3 className="text-white text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-lg mb-1">
              {location} {flag && <span className="text-2xl ml-1">{flag}</span>}
            </h3>
            <p className="text-white/95 text-sm font-medium drop-shadow-md leading-relaxed max-w-[90%]">
              {stats}
            </p>

            {/* Explore Button */}
            <div className="mt-6 flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 
                           rounded-xl px-5 py-3.5 
                           transition-all duration-300 shadow-sm
                           group-hover:bg-white/20 group-hover:border-white/40 group-hover:shadow-md">
              <span className="text-white text-sm font-bold tracking-wide">Explore City</span>
              <ArrowRight className="text-white h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
            </div>
          </div>
        </a>
      </div>
    );
  }
);
DestinationCard.displayName = "DestinationCard";

export { DestinationCard };
